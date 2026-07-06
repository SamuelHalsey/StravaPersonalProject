#Strava Personal Website


A running analytics dashboard that uses the Strava API, Python, Pandas, JavaScript, HTML, and CSS to process activity data and display training insights.


## Overview

This project pulls personal Strava activity data, filters for running workouts, converts raw API data into useful metrics, and exports JSON files used by a static web dashboard.

The dashboard displays weekly mileage, monthly training trends, heart-rate summaries, goal progress, and recent runs.

## Purpose

The purpose of this project is to demonstrate my use ofAPI integration, data processing, JSON generation, frontend rendering, static site hosting.
Additionally, I am passionate about running, and its a data source I have plenty of. Also, it was very cool to see all my run data visualized in one spot.

## Features

-Strava API integration
-Token refresh using environment variables
-Running-only activity filtering
-Unit conversions for miles, pace, elevation, and time
-Weekly mileage tracking
-Monthly miles, runs, average pace, and average heart rate
-Monthly and weekly goal progress
-Static frontend dashboard hosted on AWS S3

## Tech Stack

-Python
-Pandas
-JavaScript
-HTML/CSS
-JSON
-REST API
-Strava API
-AWS S3
-Git/GitHub



## Setup

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file:

```env
STRAVA_CLIENT_ID=
STRAVA_ATHLETE_ID=
STRAVA_REFRESH_TOKEN=
STRAVA_CLIENT_SECRET=
```
To get these values you will need Strava Premium and the values will be available at https://www.strava.com/settings/api

Run the data pipeline:

```bas
python StravaAPIfile.py
```

Start the local dashboard:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Alternatively depending on your editor you can just click view in browser
## Security

The `.env` file is excluded from GitHub because it contains private Strava API credentials.

## Future Improvements

-Add pace trend charts
-Add heart-rate efficiency analysis, perhaps I could map a correlation between heart rate, pace and temperature
-Automate data refresh with GitHub Actions or AWS Lambda
