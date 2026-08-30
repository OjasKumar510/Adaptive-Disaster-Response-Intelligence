import os
import requests
from dotenv import load_dotenv

# Load variables from .env
load_dotenv()

API_KEY = os.getenv("TOMTOM_API_KEY")


def test_tomtom():

    if not API_KEY:
        raise ValueError(
            "TOMTOM_API_KEY not found. "
            "Check your .env file."
        )

    # Test locations
    # Vellore coordinates
    origin = "12.9716,79.1591"
    destination = "12.9750,79.1600"

    url = (
        "https://api.tomtom.com/routing/1/"
        f"calculateRoute/{origin}:{destination}/json"
    )

    params = {
        "key": API_KEY,
        "traffic": "true",
        "routeType": "fastest"
    }

    response = requests.get(
        url,
        params=params,
        timeout=15
    )

    print("HTTP Status:", response.status_code)

    response.raise_for_status()

    data = response.json()

    if not data.get("routes"):
        print("No route returned.")
        return

    summary = data["routes"][0]["summary"]

    print("\n===== TOMTOM TEST =====")

    print(
        "Distance:",
        summary["lengthInMeters"],
        "meters"
    )

    print(
        "Travel time:",
        summary["travelTimeInSeconds"],
        "seconds"
    )

    print(
        "Traffic delay:",
        summary.get(
            "trafficDelayInSeconds",
            0
        ),
        "seconds"
    )

    print(
        "No-traffic travel time:",
        summary.get(
            "noTrafficTravelTimeInSeconds",
            0
        ),
        "seconds"
    )


if __name__ == "__main__":
    test_tomtom()
