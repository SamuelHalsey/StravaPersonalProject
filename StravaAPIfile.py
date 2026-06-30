#Samuel Halsey
#Strava Personal Project
#Started: 6/29/2026

import os

#requests lets Python make HTTP requests to the Strava API
import requests
#pandas to organize and sort data
import pandas as pd

#dotenv lets Python load variables from a local .env file
from dotenv import load_dotenv


#Load private Strava credentials from the .env file
load_dotenv()

client_id = os.getenv("STRAVA_CLIENT_ID")
athlete_id = os.getenv("STRAVA_ATHLETE_ID")
refresh_token = os.getenv("STRAVA_REFRESH_TOKEN")
client_secret = os.getenv("STRAVA_CLIENT_SECRET")


#Stop the program early if one or more required credentials are missing
if not all([client_id, athlete_id, refresh_token, client_secret]):
    raise ValueError("Missing one or more Strava environment variables. Check your .env file.")


#Exchanges the one-time Strava authorization code for a refresh token.

def get_refresh_token(client_id, client_secret, code):
    url = (
        "https://www.strava.com/oauth/token"
        f"?client_id={client_id}"
        f"&client_secret={client_secret}"
        f"&code={code}"
        "&grant_type=authorization_code"
    )

    #Send POST request to Strava OAuth endpoint
    response = requests.request("POST", url)

    #Convert Strava's JSON response into a Python dictionary
    data = response.json()

    return data


#Uses the long term key to request a new short term key.
#Strava access tokens expire quickly, so this function must run before making API calls.
def get_new_token(client_id, client_secret, refresh_token):
    url = (
        "https://www.strava.com/oauth/token"
        f"?client_id={client_id}"
        f"&client_secret={client_secret}"
        f"&refresh_token={refresh_token}"
        "&grant_type=refresh_token"
    )

    #Send POST request to Strava to receive a fresh access token
    response = requests.request("POST", url)

    #Convert response into a Python dictionary
    data = response.json()

    #Return only the access token if the request worked
    if "access_token" in data:
        return data["access_token"]

    #Print the error response if any issues with getting access token
    print(data)
    return data


#Gets one page of Strava activities from the athlete account.
def get_activities(access_token, per_page, page):
    url = (
        "https://www.strava.com/api/v3/athlete/activities"
        f"?per_page={per_page}"
        f"&page={page}"
    )

    #Authorization header proves to Strava that this request is allowed
    headers = {"Authorization": "Bearer " + access_token}

    #Send GET request to Strava activities endpoint
    response = requests.request("GET", url=url, headers=headers)

    #Convert JSON response into a Python list/dictionary
    data = response.json()

    return data


#Downloads the complete history of activities from Strava.
def get_all_activities(access_token):
    all_activities = []

    #Start on the first page of Strava API results
    page = 1

    #Strava limits us to only grabbing 200 activities at once
    per_page = 200

    print("Downloading all activities from Strava...")

    while True:
        #Download the current page of activities
        current_page_data = get_activities(access_token, per_page, page)

        #Stop if Strava returns an empty page
        if not current_page_data:
            break

        #Add the current page of activities to the full activity list
        all_activities.extend(current_page_data)

        #Stop if the current page has fewer than 200 results
        #This means there are no more full pages left
        if len(current_page_data) < per_page:
            break

        #Move to the next page of results
        page += 1

    print(f"Successfully downloaded {len(all_activities)} total activities.")

    return all_activities


#Converts meters per second into a standard running pace string.
#Example output: "8:34" for 8 minutes and 34 seconds per mile.
def convert_speed_to_pace(meters_per_second):
    #just return zero if we are forced to divide by 0
    if pd.isna(meters_per_second) or meters_per_second == 0:
        return "0:00"

    #Convert meters per second to miles per hour
    miles_per_hour = meters_per_second * 2.23694

    #Convert speed into minutes per mile
    minutes_per_mile = 60 / miles_per_hour

    #Separate total pace into minutes and seconds
    minutes = int(minutes_per_mile)
    seconds = int((minutes_per_mile - minutes) * 60)

    return f"{minutes}:{seconds:02d}"


#Filters raw Strava activity data to only running activities.
#Also converts metric values by using helper function conver_speed_to_pace()
def process_all_runs(all_activities):
    clean_runs = []

    for activity in all_activities:
        #Only process runs 
        #NOTE could change this in future to include other activities for a versatile athlete, but for me I only track runs
        if activity.get("type") == "Run":
            #Get average speed in meters per second
            average_speed_mps = activity.get("average_speed", 0)

            #Convert average speed into minutes and seconds
            average_pace = convert_speed_to_pace(average_speed_mps)

            #Build a cleaner dictionary with the fields we want for run analysis
            run_data = {
                "id": activity.get("id"),
                "name": activity.get("name"),
                "date": activity.get("start_date_local"),
                "distance_miles": activity.get("distance", 0) * 0.000621371,
                "moving_time_min": activity.get("moving_time", 0) / 60,
                "elevation_gain_ft": activity.get("total_elevation_gain", 0) * 3.28084,
                "average_speed_mps": average_speed_mps,
                "average_pace": average_pace,
                "average_heartrate": activity.get("average_heartrate", None),
            }

            #Add the cleaned up run to the full run list
            clean_runs.append(run_data)

    #Convert the cleaned list of runs into a Pandas DataFrame
    df = pd.DataFrame(clean_runs)

    #Only format the DataFrame if at least one run exists
    if not df.empty:
        #Convert date column from text into actual datetime objects
        df["date"] = pd.to_datetime(df["date"])

        #Sort oldest to newest so chronologically sorted runs
        df.set_index("date", inplace=True)
        df.sort_index(inplace=True)

    return df



#Function gets a new access token then downloads all activities, filters runs, and returns clean run data.
def get_and_process_all_runs():
    #Request a fresh access token before calling the Strava activity API
    access_token = get_new_token(client_id, client_secret, refresh_token)

    #Download all Strava activities
    all_activities = get_all_activities(access_token)

    #Convert raw activities into clean data
    run_df = process_all_runs(all_activities)

    return run_df


if __name__ == "__main__":
    #Download and process all Strava runs
    run_df = get_and_process_all_runs()

    #Print the most recent runs in the terminal
    print("\n=== Your Most Recent Runs ===")
    print(run_df[["name", "distance_miles", "average_pace", "average_heartrate"]].tail(10))

    #Save the cleaned run data locally as both a CSV and JSON file
    run_df.to_csv("runs.csv")
  #Minor reformatting to make json file more readable
    run_df.reset_index().to_json("runs.json", orient="records", date_format="iso")
    run_df.reset_index().to_json(
    "runs.json",
    orient="records",
    date_format="iso",
    indent=4
)
    print("\nSaved run data to runs.csv and runs.json.")