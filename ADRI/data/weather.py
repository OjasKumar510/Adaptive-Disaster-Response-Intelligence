import requests


def get_weather(latitude, longitude):

    url = "https://api.open-meteo.com/v1/forecast"

    params = {
        "latitude": latitude,
        "longitude": longitude,

        "current": [
            "temperature_2m",
            "relative_humidity_2m",
            "precipitation",
            "wind_speed_10m"
        ],

        "timezone": "auto"
    }

    response = requests.get(url, params=params, timeout=10)

    response.raise_for_status()

    data = response.json()

    current = data["current"]

    return {
        "timestamp": current["time"],
        "temperature_c": current["temperature_2m"],
        "humidity_percent": current["relative_humidity_2m"],
        "precipitation_mm": current["precipitation"],
        "wind_speed_kmph": current["wind_speed_10m"]
    }


if __name__ == "__main__":

    # Example coordinates
    latitude = 12.9716
    longitude = 79.1591

    weather = get_weather(latitude, longitude)

    print("ADRI Live Weather")
    print("-----------------")

    for key, value in weather.items():
        print(f"{key}: {value}")
