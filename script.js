
    //Load running data from runs.json in the same folder as this HTML file
    //Main mileage goal settings
const MONTHLY_MILE_GOAL = 40;

// Weekly goal is based on the monthly goal divided by 4
const WEEKLY_MILE_GOAL = MONTHLY_MILE_GOAL / 4;

    //Convert a pace string like "8:34" into total seconds
    function paceToSeconds(pace) {
      if (!pace || pace === "0:00") return 0;

      const parts = pace.split(":");
      const minutes = Number(parts[0]);
      const seconds = Number(parts[1]);

      return minutes * 60 + seconds;
    }
    //Format YYYY-MM-DD strings into a short readable date
function formatShortDate(dateString) {
  const date = new Date(dateString);

  if (isNaN(date)) {
    return "--";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

//Display weekly mileage as simple horizontal bars
function displayWeeklyMileage(weeklyMileage) {
  const container = document.getElementById("weeklyMileage");

  if (!weeklyMileage || weeklyMileage.length === 0) {
    container.textContent = "No weekly mileage data available.";
    return;
  }

  container.innerHTML = "";

  //Show the most recent 8 weeks
  const recentWeeks = weeklyMileage.slice(-8);

  const maxMiles = Math.max(...recentWeeks.map(week => Number(week.miles)));

  recentWeeks.forEach(week => {
    const miles = Number(week.miles);
    const widthPercent = maxMiles > 0 ? (miles / maxMiles) * 100 : 0;

    const row = document.createElement("div");
    row.className = "bar-row";

    row.innerHTML = `
      <div class="bar-label">${formatShortDate(week.week_start)}</div>
      <div class="bar-container">
        <div class="bar" style="width: ${widthPercent}%"></div>
      </div>
      <div class="bar-value">${miles.toFixed(1)} mi</div>
    `;

    container.appendChild(row);
  });
}

//Display monthly mileage as simple horizontal bars
function displayMonthlyMileage(monthlyMileage) {
  const container = document.getElementById("monthlyMileage");

  if (!monthlyMileage || monthlyMileage.length === 0) {
    container.textContent = "No monthly mileage data available.";
    return;
  }

  container.innerHTML = "";

  //Show the most recent 6 months
  const recentMonths = monthlyMileage.slice(-6);

  const maxMiles = Math.max(...recentMonths.map(month => Number(month.miles)));

  recentMonths.forEach(month => {
    const miles = Number(month.miles);
    const widthPercent = maxMiles > 0 ? (miles / maxMiles) * 100 : 0;

    const date = new Date(month.month);

    const label = isNaN(date)
      ? "--"
      : date.toLocaleDateString(undefined, {
          month: "short",
          year: "numeric"
        });

    const row = document.createElement("div");
    row.className = "bar-row";

    row.innerHTML = `
      <div class="bar-label">${label}</div>
      <div class="bar-container">
        <div class="bar" style="width: ${widthPercent}%"></div>
      </div>
      <div class="bar-value">${miles.toFixed(1)} mi</div>
    `;

    container.appendChild(row);
  });
}
//Load running data and summary statistics from local JSON files
async function loadRunData() {
  try {
    const runsResponse = await fetch("runs.json");
    const summaryResponse = await fetch("summary.json");

    if (!runsResponse.ok) {
      throw new Error("Could not load runs.json");
    }

    if (!summaryResponse.ok) {
      throw new Error("Could not load summary.json");
    }

    const runs = await runsResponse.json();
    const summary = await summaryResponse.json();

    displayWeeklyStats(summary.weekly_summary);
    displayGoalProgress(summary.weekly_summary, summary.monthly_summary);
    displayWeeklyMileage(summary.weekly_mileage);
    displayMonthlySummary(summary.monthly_summary);
    displayRecentRuns(runs);


  } catch (error) {
    const errorBox = document.getElementById("errorMessage");
    errorBox.style.display = "block";
    errorBox.textContent =
      "Could not load running data. Make sure runs.json and summary.json are in the same folder as index.html.";
  }
}
    //Convert total seconds back into a pace string
    function secondsToPace(totalSeconds) {
      if (!totalSeconds || totalSeconds <= 0) return "--";

      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.round(totalSeconds % 60);

      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
// Display monthly and weekly goal progress
function displayGoalProgress(weeklySummary, monthlySummary) {
  if (!weeklySummary || !monthlySummary || monthlySummary.length === 0) {
    return;
  }

  // Get the most recent month from monthly_summary
  const currentMonth = monthlySummary[monthlySummary.length - 1];

  const currentMonthMiles = Number(currentMonth.miles || 0);
  const currentWeekMiles = Number(weeklySummary.current_week_miles || 0);

  const monthlyPercent = Math.min((currentMonthMiles / MONTHLY_MILE_GOAL) * 100, 100);
  const weeklyPercent = Math.min((currentWeekMiles / WEEKLY_MILE_GOAL) * 100, 100);

  document.getElementById("monthlyGoalText").textContent =
    `${currentMonthMiles.toFixed(1)} / ${MONTHLY_MILE_GOAL.toFixed(1)} mi`;

  document.getElementById("weeklyGoalText").textContent =
    `${currentWeekMiles.toFixed(1)} / ${WEEKLY_MILE_GOAL.toFixed(1)} mi`;

  document.getElementById("monthlyGoalBar").style.width = `${monthlyPercent}%`;
  document.getElementById("weeklyGoalBar").style.width = `${weeklyPercent}%`;

  document.getElementById("monthlyGoalPercent").textContent =
    `${monthlyPercent.toFixed(0)}% of monthly goal`;

  document.getElementById("weeklyGoalPercent").textContent =
    `${weeklyPercent.toFixed(0)}% of weekly goal`;
}
  //Display the summary stat cards at the top using summary.json
function displayWeeklyStats(weeklySummary) {
  if (!weeklySummary) {
    return;
  }

  document.getElementById("currentWeekMiles").textContent =
    Number(weeklySummary.current_week_miles || 0).toFixed(1) + " mi";

  document.getElementById("previousWeekMiles").textContent =
    Number(weeklySummary.previous_week_miles || 0).toFixed(1) + " mi";

  document.getElementById("fourWeekAverageMiles").textContent =
    Number(weeklySummary.four_week_average_miles || 0).toFixed(1) + " mi";

  const highestWeek = weeklySummary.highest_mileage_week;

  document.getElementById("highestMileageWeek").textContent =
    highestWeek
      ? Number(highestWeek.miles || 0).toFixed(1) + " mi"
      : "--";
}
function displayMonthlySummary(monthlySummary) {
  const tableBody = document.getElementById("monthlySummaryTableBody");

  if (!monthlySummary || monthlySummary.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">No monthly summary data available.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = "";

  const recentMonths = monthlySummary.slice(-12).reverse();

  recentMonths.forEach(monthData => {
    const row = document.createElement("tr");

    const date = new Date(monthData.month);

    const monthLabel = isNaN(date)
      ? "--"
      : date.toLocaleDateString(undefined, {
          month: "short",
          year: "numeric"
        });

    const heartRate =
      monthData.average_heartrate !== null && monthData.average_heartrate !== undefined
        ? Math.round(monthData.average_heartrate) + " bpm"
        : "--";

    row.innerHTML = `
      <td>${monthLabel}</td>
      <td>${Number(monthData.miles || 0).toFixed(1)} mi</td>
      <td>${monthData.runs || 0}</td>
      <td>${monthData.average_pace || "--"} /mi</td>
      <td>${heartRate}</td>
    `;

    tableBody.appendChild(row);
  });
}
   //Display the 100 most recent runs in the table
function displayRecentRuns(runs) {
  const tableBody = document.getElementById("runsTableBody");

  //Clear old table rows before adding new ones
  tableBody.innerHTML = "";

  const recentRuns = runs
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 100);

  recentRuns.forEach(run => {
    const row = document.createElement("tr");

    const date = run.date
      ? new Date(run.date).toLocaleDateString()
      : "--";

    const heartRate =
      run.average_heartrate !== null && run.average_heartrate !== undefined
        ? Math.round(run.average_heartrate) + " bpm"
        : "--";

    row.innerHTML = `
      <td>${date}</td>
      <td>${run.name || "Unnamed Run"}</td>
      <td>${Number(run.distance_miles || 0).toFixed(2)} mi</td>
      <td>${run.average_pace || "--"} /mi</td>
      <td>${heartRate}</td>
      <td>${Number(run.elevation_gain_ft || 0).toFixed(0)} ft</td>
    `;

    tableBody.appendChild(row);
  });
}

    loadRunData();