#!/usr/bin/env python3
"""
Simple test script to verify the API functionality.
Run this after starting the server with: uvicorn main:app --reload
"""

import asyncio
import aiohttp
import json


async def test_api():
    """Test the /api/balloons/history endpoint."""
    base_url = "http://localhost:8000"

    async with aiohttp.ClientSession() as session:
        try:
            # Test health check endpoint
            async with session.get(f"{base_url}/") as response:
                if response.status == 200:
                    data = await response.json()
                    print("✓ Health check passed:", data["message"])
                else:
                    print("✗ Health check failed:", response.status)
                    return

            # Test main API endpoint
            print("\nTesting /api/balloons/history endpoint...")
            async with session.get(f"{base_url}/api/balloons/history") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✓ API call successful!")
                    print(f"✓ Number of balloons: {len(data)}")

                    # Show sample data for first balloon
                    if data:
                        first_balloon_id = list(data.keys())[0]
                        first_balloon = data[first_balloon_id]
                        trajectory_length = len(first_balloon["trajectory"])
                        print(f"✓ Balloon {first_balloon_id} has {trajectory_length} data points")

                        if trajectory_length > 0:
                            oldest_point = first_balloon["trajectory"][0]
                            newest_point = first_balloon["trajectory"][-1]
                            print(f"✓ Oldest timestamp: {oldest_point['timestamp']}")
                            print(f"✓ Newest timestamp: {newest_point['timestamp']}")
                            print(f"✓ Sample coordinates: lat={newest_point['lat']}, lon={newest_point['lon']}, alt={newest_point['alt']}")
                else:
                    print(f"✗ API call failed with status: {response.status}")
                    error_text = await response.text()
                    print(f"Error: {error_text}")

        except Exception as e:
            print(f"✗ Test failed with exception: {e}")


if __name__ == "__main__":
    print("Testing Hurricane Hunter API...")
    print("Make sure the server is running: uvicorn main:app --reload")
    print("=" * 50)

    asyncio.run(test_api())