import httpx

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"


async def geocode(name: str) -> list[dict]:
    params = {"name": name, "count": 5, "language": "ja", "format": "json"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(GEOCODING_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
    results = data.get("results", [])
    return [
        {
            "name": r.get("name", ""),
            "country": r.get("country", ""),
            "admin1": r.get("admin1", ""),
            "latitude": r["latitude"],
            "longitude": r["longitude"],
        }
        for r in results
    ]


async def fetch_forecast(lat: float, lon: float, days: int) -> dict:
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        "timezone": "Asia/Tokyo",
        "forecast_days": days,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(FORECAST_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
    return data.get("daily", {})
