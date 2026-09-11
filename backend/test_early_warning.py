import asyncio
import json
from app.services.early_warning import early_warning

async def test_engine():
    print("Running early warning scan (this will fetch live Open-Meteo data)...")
    result = await early_warning.run_scan()
    print("\nScan Complete!")
    print(f"Scanned {result['total_locations_scanned']} locations.")
    print(f"High risk count: {result['high_risk_count']}")
    print("\nFirst 3 results:")
    for res in result['results'][:3]:
        print(f"Location: {res['location']}")
        print(f"  Probability: {res['probability']:.2f}")
        print(f"  Risk Level: {res['risk_level']}")
        print(f"  Weather (Live): {res['weather']}")
        print("-" * 30)

if __name__ == "__main__":
    asyncio.run(test_engine())
