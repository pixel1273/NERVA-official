import asyncio
import os
import httpx
import json
from dotenv import load_dotenv

load_dotenv()

NODE_COORDS = {
    "Gangtok":       [27.3389, 88.6065],
    "Siliguri":      [26.7271, 88.3953]
}

async def fetch_real_weather():
    locations = list(NODE_COORDS.keys())
    lats = [coord[0] for coord in NODE_COORDS.values()]
    lons = [coord[1] for coord in NODE_COORDS.values()]
    
    # Bulk query Open-Meteo for past 7 days and current day precipitation
    om_url = f"https://api.open-meteo.com/v1/forecast?latitude={','.join(map(str, lats))}&longitude={','.join(map(str, lons))}&daily=precipitation_sum,temperature_2m_max&past_days=7&forecast_days=1&timezone=Asia%2FKolkata"
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        om_resp = await client.get(om_url)
        om_resp.raise_for_status()
        om_data = om_resp.json()
    
    if isinstance(om_data, dict):
        om_data = [om_data]
        
    openweather_key = os.getenv("OPENWEATHER_API")
    ow_data_list = [None] * len(locations)
    
    # Fetch OpenWeather concurrently
    if openweather_key:
        async def fetch_ow(idx, lat, lon):
            ow_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={openweather_key}&units=metric"
            try:
                async with httpx.AsyncClient(timeout=5.0) as ow_client:
                    resp = await ow_client.get(ow_url)
                    if resp.status_code == 200:
                        return idx, resp.json()
            except Exception:
                pass
            return idx, None

        tasks = [fetch_ow(i, lats[i], lons[i]) for i in range(len(locations))]
        results = await asyncio.gather(*tasks)
        for idx, data in results:
            ow_data_list[idx] = data

    weather_data = {}
    for idx, loc_data in enumerate(om_data):
        loc_name = locations[idx]
        daily = loc_data.get("daily", {})
        precip = daily.get("precipitation_sum", [])
        
        if len(precip) >= 8:
            rainfall_today = precip[-1] or 0.0
            antecedent_7d = sum(p for p in precip[:-1] if p is not None)
        else:
            rainfall_today = 0.0
            antecedent_7d = 0.0
            
        temp_c = daily.get("temperature_2m_max", [0])[-1] if daily.get("temperature_2m_max") else 25
        humidity = 85
        
        # Integrate OpenWeather current data
        ow_data = ow_data_list[idx]
        if ow_data:
            temp_c = ow_data.get("main", {}).get("temp", temp_c)
            humidity = ow_data.get("main", {}).get("humidity", humidity)
            # Add current rain if raining now
            rain_1h = ow_data.get("rain", {}).get("1h", 0)
            if rain_1h > 0:
                rainfall_today += rain_1h
                
        weather_data[loc_name] = {
            "rainfall_mm": round(rainfall_today, 1),
            "antecedent_7d": round(antecedent_7d, 1),
            "temp_c": round(temp_c, 1),
            "humidity": round(humidity, 1)
        }
    
    print(json.dumps(weather_data, indent=2))

if __name__ == "__main__":
    asyncio.run(fetch_real_weather())
