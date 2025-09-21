import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

import aiohttp
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, RootModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Hurricane Hunter API", description="Weather balloon tracking service")

# uvicorn main:app --reload --host 0.0.0.0 --port 8000

class DataPoint(BaseModel):
    """Represents a single balloon data point with coordinates and timestamp."""
    lat: float
    lon: float
    alt: float
    timestamp: str


class Balloon(BaseModel):
    """Represents a balloon with its complete trajectory."""
    id: str
    trajectory: List[DataPoint]


class BalloonsResponse(RootModel[Dict[str, Balloon]]):
    """Response model for the balloons history endpoint."""
    root: Dict[str, Balloon]


async def fetch_balloon_data(session: aiohttp.ClientSession, url: str) -> Optional[List[List[float]]]:
    """
    Fetch data from a single balloon API endpoint.

    Args:
        session: aiohttp client session
        url: The URL to fetch data from

    Returns:
        List of balloon data points or None if request fails
    """
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
            if response.status == 200:
                data = await response.json()
                # Validate that data is a list of lists with 3 float values each
                if isinstance(data, list):
                    validated_data = []
                    for item in data:
                        if isinstance(item, list) and len(item) == 3:
                            try:
                                # Convert to floats to validate numeric data
                                lat, lon, alt = float(item[0]), float(item[1]), float(item[2])
                                validated_data.append([lat, lon, alt])
                            except (ValueError, TypeError):
                                logger.warning(f"Invalid data point in {url}: {item}")
                                continue
                    return validated_data
                else:
                    logger.warning(f"Invalid data structure from {url}: expected list, got {type(data)}")
                    return None
            else:
                logger.warning(f"HTTP {response.status} error fetching {url}")
                return None
    except asyncio.TimeoutError:
        logger.warning(f"Timeout fetching data from {url}")
        return None
    except aiohttp.ClientError as e:
        logger.warning(f"Network error fetching {url}: {e}")
        return None
    except ValueError as e:
        logger.warning(f"JSON decode error for {url}: {e}")
        return None
    except Exception as e:
        logger.warning(f"Unexpected error fetching {url}: {e}")
        return None


@app.get("/api/balloons/history", response_model=Dict[str, Balloon])
async def get_balloons_history():
    """
    Fetch and process balloon trajectory data from all 24 time points.

    Merges data from all 24 files, associating each point with a timestamp.
    Uses a clean data structure: {balloon_id: [[timestamp, lat, lon, alt], ...]}
    """
    base_url = "https://a.windbornesystems.com/treasure/"

    # Generate URLs for all 24 endpoints (00.json to 23.json)
    urls = [f"{base_url}{i:02d}.json" for i in range(24)]

    # Current time for timestamp calculations
    current_time = datetime.now(timezone.utc)

    # Fetch data from all URLs concurrently
    async with aiohttp.ClientSession() as session:
        try:
            results = await asyncio.gather(
                *[fetch_balloon_data(session, url) for url in urls],
                return_exceptions=True
            )
        except Exception as e:
            logger.error(f"Error during concurrent fetching: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch balloon data")

    # Clean data structure: {balloon_id: [[timestamp, lat, lon, alt], ...]}
    balloon_trajectories: Dict[str, List[List]] = {}

    # Process all 24 time points and merge data by balloon ID
    for hours_ago, data in enumerate(results):
        # Skip failed requests
        if data is None or isinstance(data, Exception):
            if isinstance(data, Exception):
                logger.warning(f"Exception for {hours_ago:02d}.json: {data}")
            continue

        # Calculate timestamp for this time point
        timestamp = current_time - timedelta(hours=hours_ago)
        timestamp_str = timestamp.isoformat().replace('+00:00', 'Z')

        # Process each balloon's data point at this timestamp
        for balloon_idx, balloon_coords in enumerate(data):
            balloon_id = str(balloon_idx)

            # Initialize balloon trajectory if first time seeing this balloon
            if balloon_id not in balloon_trajectories:
                balloon_trajectories[balloon_id] = []

            # Add [timestamp, lat, lon, alt] to this balloon's trajectory
            balloon_trajectories[balloon_id].append([
                timestamp_str,
                balloon_coords[0],  # lat
                balloon_coords[1],  # lon
                balloon_coords[2]   # alt
            ])

    # Sort each balloon's trajectory chronologically (oldest to newest)
    for balloon_id in balloon_trajectories:
        balloon_trajectories[balloon_id].sort(key=lambda point: point[0])  # Sort by timestamp

    # Convert to API response format
    response_data = {}
    for balloon_id, trajectory_points in balloon_trajectories.items():
        # Convert trajectory points to DataPoint objects
        trajectory = []
        for point in trajectory_points:
            trajectory.append(DataPoint(
                timestamp=point[0],
                lat=point[1],
                lon=point[2],
                alt=point[3]
            ))

        response_data[balloon_id] = Balloon(
            id=balloon_id,
            trajectory=trajectory
        )

    if not response_data:
        logger.warning("No valid balloon data was fetched from any endpoint")
        raise HTTPException(status_code=503, detail="No balloon data available")

    logger.info(f"Successfully processed data for {len(response_data)} balloons")
    return response_data


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "Hurricane Hunter API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)