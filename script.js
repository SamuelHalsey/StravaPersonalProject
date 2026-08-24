


const MONTHLY_MILE_GOAL = 80;
const WEEKLY_MILE_GOAL = MONTHLY_MILE_GOAL / 4;

const dashboardState = {
  runs: [],
  summary: null
};

function parseDate(value) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function paceToSeconds(pace) {
  if (!pace || pace === "--" || pace === "0:00") return null;

  const parts = String(pace).split(":");
  if (parts.length !== 2) return null;

  const minutes = Number(parts[0]);
  const seconds = Number(parts[1]);

  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;

  return minutes * 60 + seconds;
}

function secondsToPace(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "--";

  let minutes = Math.floor(totalSeconds / 60);
  let seconds = Math.round(totalSeconds % 60);

  if (seconds === 60) {
    minutes += 1;
    seconds = 0;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatShortDate(value) {
  const date = parseDate(value);
  if (!date) return "--";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function formatFullDate(value) {
  const date = parseDate(value);
  if (!date) return "--";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatMonth(value) {
  const date = parseDate(value);
  if (!date) return "--";

  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadRunData() {
  try {
    const [runsResponse, summaryResponse] = await Promise.all([
      fetch("runs.json", { cache: "no-store" }),
      fetch("summary.json", { cache: "no-store" })
    ]);

    if (!runsResponse.ok) {
      throw new Error(`Could not load runs.json (${runsResponse.status})`);
    }

    if (!summaryResponse.ok) {
      throw new Error(`Could not load summary.json (${summaryResponse.status})`);
    }

    const runs = await runsResponse.json();
    const summary = await summaryResponse.json();

    dashboardState.runs = Array.isArray(runs) ? runs : [];
    dashboardState.summary = summary || {};

    renderDashboard();
    attachRunFilters();
  } catch (error) {
    console.error(error);

    const errorBox = document.getElementById("errorMessage");
    if (errorBox) {
      errorBox.style.display = "block";
      errorBox.textContent =
        "Could not load running data. Start the site through a local web server and confirm runs.json and summary.json are beside index.html.";
    }
  }
}

function renderDashboard() {
  const { runs, summary } = dashboardState;

  displayLastUpdated(runs);
  displayWeeklyStats(summary.weekly_summary || {});
  displayAllTimeStats(summary);
  displayGoalProgress(summary.weekly_summary || {}, summary.monthly_summary || []);
  displayWeeklyMileage(summary.weekly_mileage || []);
  displayPaceTrend(runs);
  displayRecentInsights(runs);
  displayCurrentMonth(summary.monthly_summary || []);
  displayMonthlySummary(summary.monthly_summary || []);
  displayRecentRuns();
}

function displayLastUpdated(runs) {
  const dates = runs
    .map(run => parseDate(run.date))
    .filter(Boolean)
    .sort((a, b) => b - a);

  if (dates.length === 0) {
    setText("lastUpdated", "No activity data");
    return;
  }

  setText(
    "lastUpdated",
    `Latest activity ${dates[0].toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    })}`
  );
}

function displayWeeklyStats(weeklySummary) {
  const current = safeNumber(weeklySummary.current_week_miles);
  const previous = safeNumber(weeklySummary.previous_week_miles);
  const fourWeek = safeNumber(weeklySummary.four_week_average_miles);
  const highest = weeklySummary.highest_mileage_week || {};
  const highestMiles = safeNumber(highest.miles);

  setText("currentWeekMiles", `${current.toFixed(1)} mi`);
  setText("previousWeekMiles", `${previous.toFixed(1)} mi`);
  setText("fourWeekAverageMiles", `${fourWeek.toFixed(1)} mi`);
  setText("highestMileageWeek", `${highestMiles.toFixed(1)} mi`);
  setText(
    "highestMileageWeekDate",
    highest.week_start ? `Week of ${formatShortDate(highest.week_start)}` : "All-time high"
  );

  const comparison = document.getElementById("currentWeekComparison");
  if (!comparison) return;

  comparison.classList.remove("positive", "negative");

  if (fourWeek <= 0) {
    comparison.textContent = "No comparison available";
    return;
  }

  const differencePercent = ((current - fourWeek) / fourWeek) * 100;
  const absolutePercent = Math.abs(differencePercent).toFixed(0);

  if (Math.abs(differencePercent) < 1) {
    comparison.textContent = "In line with 4-week average";
  } else if (differencePercent > 0) {
    comparison.textContent = `↑ ${absolutePercent}% vs 4-week average`;
    comparison.classList.add("positive");
  } else {
    comparison.textContent = `↓ ${absolutePercent}% vs 4-week average`;
    comparison.classList.add("negative");
  }
}

function displayAllTimeStats(summary) {
  setText("totalRuns", safeNumber(summary.total_runs).toLocaleString());
  setText("totalMiles", `${safeNumber(summary.total_miles).toFixed(1)} mi`);
  setText("longestRun", `${safeNumber(summary.longest_run).toFixed(1)} mi`);
  setText(
    "overallAveragePace",
    summary.average_pace && summary.average_pace !== "--"
      ? `${summary.average_pace} /mi`
      : "--"
  );
  setText(
    "overallAverageHeartRate",
    summary.average_heartrate !== null &&
      summary.average_heartrate !== undefined
      ? `${Math.round(summary.average_heartrate)} bpm`
      : "--"
  );
}

function displayGoalProgress(weeklySummary, monthlySummary) {
  const currentWeekMiles = safeNumber(weeklySummary.current_week_miles);
  const latestMonth =
    monthlySummary.length > 0 ? monthlySummary[monthlySummary.length - 1] : null;
  const currentMonthMiles = latestMonth ? safeNumber(latestMonth.miles) : 0;

  const weeklyPercentRaw =
    WEEKLY_MILE_GOAL > 0 ? (currentWeekMiles / WEEKLY_MILE_GOAL) * 100 : 0;
  const monthlyPercentRaw =
    MONTHLY_MILE_GOAL > 0 ? (currentMonthMiles / MONTHLY_MILE_GOAL) * 100 : 0;

  setText(
    "weeklyGoalText",
    `${currentWeekMiles.toFixed(1)} / ${WEEKLY_MILE_GOAL.toFixed(1)} mi`
  );
  setText(
    "monthlyGoalText",
    `${currentMonthMiles.toFixed(1)} / ${MONTHLY_MILE_GOAL.toFixed(1)} mi`
  );
  setText("weeklyGoalPercent", `${Math.round(weeklyPercentRaw)}%`);
  setText("monthlyGoalPercent", `${Math.round(monthlyPercentRaw)}%`);

  const weeklyBar = document.getElementById("weeklyGoalBar");
  const monthlyBar = document.getElementById("monthlyGoalBar");

  if (weeklyBar) weeklyBar.style.width = `${Math.min(weeklyPercentRaw, 100)}%`;
  if (monthlyBar) monthlyBar.style.width = `${Math.min(monthlyPercentRaw, 100)}%`;
}

function displayWeeklyMileage(weeklyMileage) {
  const container = document.getElementById("weeklyMileage");
  if (!container) return;

  if (!Array.isArray(weeklyMileage) || weeklyMileage.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No weekly mileage data available.</div>';
    return;
  }

  const recentWeeks = weeklyMileage.slice(-12);
  const maxMiles = Math.max(
    ...recentWeeks.map(week => safeNumber(week.miles)),
    1
  );

  container.innerHTML = recentWeeks
    .map((week, index) => {
      const miles = safeNumber(week.miles);
      const heightPercent = Math.max((miles / maxMiles) * 100, miles > 0 ? 2 : 0);
      const isCurrent = index === recentWeeks.length - 1;

      return `
        <div class="week-column ${isCurrent ? "current" : ""}">
          <div class="week-bar-area">
            <div
              class="week-bar"
              style="height: ${heightPercent}%"
              title="${escapeHtml(formatFullDate(week.week_start))}: ${miles.toFixed(1)} miles"
            ></div>
          </div>
          <div class="week-value">${miles.toFixed(1)}</div>
          <div class="week-label">${escapeHtml(formatShortDate(week.week_start))}</div>
        </div>
      `;
    })
    .join("");
}

function displayPaceTrend(runs) {
  const container = document.getElementById("paceTrend");
  if (!container) return;

  const validRuns = runs
    .map(run => ({
      ...run,
      parsedDate: parseDate(run.date),
      paceSeconds: paceToSeconds(run.average_pace)
    }))
    .filter(run => run.parsedDate && run.paceSeconds)
    .sort((a, b) => a.parsedDate - b.parsedDate)
    .slice(-30);

  if (validRuns.length < 2) {
    container.innerHTML =
      '<div class="empty-state">Not enough valid pace data to draw a trend.</div>';
    return;
  }

  const width = 800;
  const height = 285;
  const padding = { top: 20, right: 18, bottom: 34, left: 55 };

  const paceValues = validRuns.map(run => run.paceSeconds);
  const rawMin = Math.min(...paceValues);
  const rawMax = Math.max(...paceValues);
  const buffer = Math.max((rawMax - rawMin) * 0.14, 12);

  const minPace = Math.max(rawMin - buffer, 1);
  const maxPace = rawMax + buffer;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const xForIndex = index =>
    padding.left + (index / (validRuns.length - 1)) * chartWidth;

  // Faster paces (smaller numbers) appear higher on the chart.
  const yForPace = pace =>
    padding.top + ((pace - minPace) / (maxPace - minPace)) * chartHeight;

  const points = validRuns.map((run, index) => ({
    x: xForIndex(index),
    y: yForPace(run.paceSeconds),
    run
  }));

  const linePoints = points.map(point => `${point.x},${point.y}`).join(" ");
  const baseline = padding.top + chartHeight;

  const areaPoints = [
    `${points[0].x},${baseline}`,
    ...points.map(point => `${point.x},${point.y}`),
    `${points[points.length - 1].x},${baseline}`
  ].join(" ");

  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, index) => {
    const ratio = index / gridCount;
    const y = padding.top + ratio * chartHeight;
    const pace = minPace + ratio * (maxPace - minPace);

    return `
      <line
        class="chart-grid-line"
        x1="${padding.left}"
        y1="${y}"
        x2="${width - padding.right}"
        y2="${y}"
      />
      <text
        class="chart-axis-label"
        x="${padding.left - 10}"
        y="${y + 4}"
        text-anchor="end"
      >${secondsToPace(pace)}</text>
    `;
  }).join("");

  const labelIndexes = [...new Set([
    0,
    Math.floor((validRuns.length - 1) / 2),
    validRuns.length - 1
  ])];

  const xLabels = labelIndexes
    .map(index => {
      const point = points[index];
      return `
        <text
          class="chart-axis-label"
          x="${point.x}"
          y="${height - 9}"
          text-anchor="${index === 0 ? "start" : index === validRuns.length - 1 ? "end" : "middle"}"
        >${escapeHtml(formatShortDate(point.run.date))}</text>
      `;
    })
    .join("");

  const circles = points
    .map(point => `
      <circle class="chart-point" cx="${point.x}" cy="${point.y}" r="4">
        <title>${escapeHtml(point.run.name || "Run")} — ${escapeHtml(
          formatFullDate(point.run.date)
        )} — ${escapeHtml(point.run.average_pace)} /mi</title>
      </circle>
    `)
    .join("");

  container.innerHTML = `
    <svg
      class="pace-svg"
      viewBox="0 0 ${width} ${height}"
      role="img"
      aria-label="Line chart showing pace for the most recent runs"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="paceGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#fc4c02" stop-opacity="0.28"></stop>
          <stop offset="100%" stop-color="#fc4c02" stop-opacity="0"></stop>
        </linearGradient>
      </defs>

      ${gridLines}
      <polygon class="chart-area" points="${areaPoints}"></polygon>
      <polyline class="chart-line" points="${linePoints}"></polyline>
      ${circles}
      ${xLabels}
    </svg>
  `;
}

function displayRecentInsights(runs) {
  const validRuns = runs
    .map(run => ({
      ...run,
      parsedDate: parseDate(run.date)
    }))
    .filter(run => run.parsedDate)
    .sort((a, b) => b.parsedDate - a.parsedDate);

  if (validRuns.length === 0) return;

  const newestDate = validRuns[0].parsedDate;
  const thirtyDaysBefore = new Date(newestDate);
  thirtyDaysBefore.setDate(thirtyDaysBefore.getDate() - 30);

  const twentyEightDaysBefore = new Date(newestDate);
  twentyEightDaysBefore.setDate(twentyEightDaysBefore.getDate() - 28);

  const last30Days = validRuns.filter(
    run => run.parsedDate >= thirtyDaysBefore && run.parsedDate <= newestDate
  );

  const last28Days = validRuns.filter(
    run => run.parsedDate >= twentyEightDaysBefore && run.parsedDate <= newestDate
  );

  const miles30 = last30Days.reduce(
    (total, run) => total + safeNumber(run.distance_miles),
    0
  );

  const time30 = last30Days.reduce(
    (total, run) => total + safeNumber(run.moving_time_min),
    0
  );

  const averagePace30 = miles30 > 0 ? (time30 / miles30) * 60 : null;

  const heartRates = last30Days
    .map(run => Number(run.average_heartrate))
    .filter(value => Number.isFinite(value) && value > 0);

  const averageHeartRate =
    heartRates.length > 0
      ? heartRates.reduce((sum, value) => sum + value, 0) / heartRates.length
      : null;

  setText("recentRunsPerWeek", (last28Days.length / 4).toFixed(1));
  setText("recent30DayMiles", `${miles30.toFixed(1)} mi`);
  setText(
    "recent30DayPace",
    averagePace30 ? `${secondsToPace(averagePace30)} /mi` : "--"
  );
  setText(
    "recent30DayHeartRate",
    averageHeartRate ? `${Math.round(averageHeartRate)} bpm` : "--"
  );
  setText("mostRecentRunDate", formatShortDate(newestDate));
}

function displayCurrentMonth(monthlySummary) {
  if (!Array.isArray(monthlySummary) || monthlySummary.length === 0) return;

  const currentMonth = monthlySummary[monthlySummary.length - 1];

  setText("currentMonthLabel", formatMonth(currentMonth.month));
  setText("currentMonthMiles", `${safeNumber(currentMonth.miles).toFixed(1)} mi`);
  setText("currentMonthRuns", safeNumber(currentMonth.runs).toFixed(0));
  setText(
    "currentMonthPace",
    currentMonth.average_pace && currentMonth.average_pace !== "--"
      ? `${currentMonth.average_pace} /mi`
      : "--"
  );
  setText(
    "currentMonthHeartRate",
    currentMonth.average_heartrate !== null &&
      currentMonth.average_heartrate !== undefined
      ? `${Math.round(currentMonth.average_heartrate)} bpm`
      : "--"
  );
}

function displayMonthlySummary(monthlySummary) {
  const tableBody = document.getElementById("monthlySummaryTableBody");
  if (!tableBody) return;

  if (!Array.isArray(monthlySummary) || monthlySummary.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">No monthly summary data available.</td>
      </tr>
    `;
    return;
  }

  const recentMonths = monthlySummary.slice(-12).reverse();

  tableBody.innerHTML = recentMonths
    .map(monthData => {
      const heartRate =
        monthData.average_heartrate !== null &&
        monthData.average_heartrate !== undefined
          ? `${Math.round(monthData.average_heartrate)} bpm`
          : "--";

      return `
        <tr>
          <td>${escapeHtml(formatMonth(monthData.month))}</td>
          <td>${safeNumber(monthData.miles).toFixed(1)} mi</td>
          <td>${safeNumber(monthData.runs).toFixed(0)}</td>
          <td>${escapeHtml(monthData.average_pace || "--")} /mi</td>
          <td>${heartRate}</td>
        </tr>
      `;
    })
    .join("");
}

function getFilteredRuns() {
  const search = (document.getElementById("runSearch")?.value || "")
    .trim()
    .toLowerCase();
  const dateFilter = document.getElementById("runDateFilter")?.value || "90";
  const sortMode = document.getElementById("runSort")?.value || "newest";

  let filtered = dashboardState.runs
    .map(run => ({
      ...run,
      parsedDate: parseDate(run.date)
    }))
    .filter(run => run.parsedDate);

  if (search) {
    filtered = filtered.filter(run =>
      String(run.name || "").toLowerCase().includes(search)
    );
  }

  if (dateFilter !== "all" && filtered.length > 0) {
    const newestDate = filtered.reduce(
      (latest, run) => (run.parsedDate > latest ? run.parsedDate : latest),
      filtered[0].parsedDate
    );

    const cutoff = new Date(newestDate);
    cutoff.setDate(cutoff.getDate() - Number(dateFilter));

    filtered = filtered.filter(run => run.parsedDate >= cutoff);
  }

  if (sortMode === "distance") {
    filtered.sort(
      (a, b) => safeNumber(b.distance_miles) - safeNumber(a.distance_miles)
    );
  } else if (sortMode === "pace") {
    filtered.sort((a, b) => {
      const paceA = paceToSeconds(a.average_pace) ?? Number.POSITIVE_INFINITY;
      const paceB = paceToSeconds(b.average_pace) ?? Number.POSITIVE_INFINITY;
      return paceA - paceB;
    });
  } else {
    filtered.sort((a, b) => b.parsedDate - a.parsedDate);
  }

  return filtered;
}

function displayRecentRuns() {
  const tableBody = document.getElementById("runsTableBody");
  if (!tableBody) return;

  const filteredRuns = getFilteredRuns();
  const visibleRuns = filteredRuns.slice(0, 100);

  setText(
    "runsShowingText",
    filteredRuns.length > 100
      ? `Showing 100 of ${filteredRuns.length} matching runs`
      : `${filteredRuns.length} matching run${filteredRuns.length === 1 ? "" : "s"}`
  );

  if (visibleRuns.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">No runs match the current filters.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = visibleRuns
    .map(run => {
      const heartRate =
        run.average_heartrate !== null && run.average_heartrate !== undefined
          ? `${Math.round(run.average_heartrate)} bpm`
          : "--";

      return `
        <tr>
          <td>${escapeHtml(formatFullDate(run.date))}</td>
          <td class="run-name">${escapeHtml(run.name || "Unnamed Run")}</td>
          <td>${safeNumber(run.distance_miles).toFixed(2)} mi</td>
          <td>${escapeHtml(run.average_pace || "--")} /mi</td>
          <td>${heartRate}</td>
          <td>${safeNumber(run.elevation_gain_ft).toFixed(0)} ft</td>
        </tr>
      `;
    })
    .join("");
}

function attachRunFilters() {
  const search = document.getElementById("runSearch");
  const dateFilter = document.getElementById("runDateFilter");
  const sort = document.getElementById("runSort");

  if (search && !search.dataset.listenerAttached) {
    search.addEventListener("input", displayRecentRuns);
    search.dataset.listenerAttached = "true";
  }

  if (dateFilter && !dateFilter.dataset.listenerAttached) {
    dateFilter.addEventListener("change", displayRecentRuns);
    dateFilter.dataset.listenerAttached = "true";
  }

  if (sort && !sort.dataset.listenerAttached) {
    sort.addEventListener("change", displayRecentRuns);
    sort.dataset.listenerAttached = "true";
  }
}

loadRunData();
