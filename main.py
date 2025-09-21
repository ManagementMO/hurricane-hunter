import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

import aiohttp
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, RootModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Hurricane Hunter API", description="Weather balloon tracking service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache expiry times (in minutes)
BALLOON_CACHE_EXPIRY = 10  # 10 minutes for balloon data
STORM_CACHE_EXPIRY = 5     # 5 minutes for storm data

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


class StormProperties(BaseModel):
    """Properties of a weather alert/storm."""
    headline: str
    description: str
    severity: Optional[str] = None
    certainty: Optional[str] = None
    urgency: Optional[str] = None
    event: str
    area_desc: Optional[str] = None


class StormGeometry(BaseModel):
    """Geometric area affected by the storm."""
    type: str
    coordinates: List[List[List[float]]]


class Storm(BaseModel):
    """Represents an active storm or severe weather alert."""
    id: str
    type: str
    properties: StormProperties
    geometry: Optional[StormGeometry] = None


# In-memory cache with timestamps
# Cache format: (data, timestamp)
balloon_cache: Optional[Tuple[Dict[str, Balloon], datetime]] = None
storm_cache: Optional[Tuple[List[Storm], datetime]] = None


def is_cache_valid(cache_timestamp: datetime, expiry_minutes: int) -> bool:
    """Check if cached data is still valid based on expiry time."""
    current_time = datetime.now(timezone.utc)
    time_diff = current_time - cache_timestamp
    return time_diff.total_seconds() < (expiry_minutes * 60)


def get_cached_balloon_data() -> Optional[Dict[str, Balloon]]:
    """Get cached balloon data if valid, otherwise return None."""
    global balloon_cache
    if balloon_cache and is_cache_valid(balloon_cache[1], BALLOON_CACHE_EXPIRY):
        logger.info("Returning cached balloon data")
        return balloon_cache[0]
    return None


def cache_balloon_data(data: Dict[str, Balloon]) -> None:
    """Cache balloon data with current timestamp."""
    global balloon_cache
    balloon_cache = (data, datetime.now(timezone.utc))
    logger.info("Cached balloon data")


def get_cached_storm_data() -> Optional[List[Storm]]:
    """Get cached storm data if valid, otherwise return None."""
    global storm_cache
    if storm_cache and is_cache_valid(storm_cache[1], STORM_CACHE_EXPIRY):
        logger.info("Returning cached storm data")
        return storm_cache[0]
    return None


def cache_storm_data(data: List[Storm]) -> None:
    """Cache storm data with current timestamp."""
    global storm_cache
    storm_cache = (data, datetime.now(timezone.utc))
    logger.info("Cached storm data")


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


async def fetch_storm_data(session: aiohttp.ClientSession) -> List[Storm]:
    """
    Fetch active storm and severe weather alerts from National Weather Service.

    Returns:
        List of Storm objects representing active weather alerts
    """
    try:
        # Required User-Agent header for NWS API
        headers = {
            "User-Agent": "(hurricane-hunter-api, hurricane-hunter@example.com)"
        }

        # Focus on hurricane-prone areas and severe weather
        areas = ["FL", "TX", "LA", "NC", "SC", "GA", "AL", "MS", "VA"]
        storm_events = ["Hurricane", "Tropical Storm", "Storm Surge", "Tornado", "Severe Thunderstorm",
                    "Typhoon", "Cyclone", "Flood", "Flash Flood"]

        all_storms = []

        for area in areas:
            url = f"https://api.weather.gov/alerts/active?area={area}"
            try:
                async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as response:
                    if response.status == 200:
                        data = await response.json()
                        features = data.get("features", [])

                        logger.info(f"Fetched {len(features)} alerts for {area}")

                        for feature in features:
                            properties = feature.get("properties", {})
                            event = properties.get("event", "")

                            # Filter for storm-related events
                            if any(storm_type.lower() in event.lower() for storm_type in storm_events):
                                try:
                                    geometry = feature.get("geometry")
                                    storm_geometry = None
                                    if geometry and geometry.get("coordinates"):
                                        storm_geometry = StormGeometry(
                                            type=geometry.get("type", ""),
                                            coordinates=geometry.get("coordinates", [])
                                        )

                                    storm = Storm(
                                        id=feature.get("id", ""),
                                        type=feature.get("type", "Feature"),
                                        properties=StormProperties(
                                            headline=properties.get("headline", ""),
                                            description=properties.get("description", ""),
                                            severity=properties.get("severity"),
                                            certainty=properties.get("certainty"),
                                            urgency=properties.get("urgency"),
                                            event=event,
                                            area_desc=properties.get("areaDesc")
                                        ),
                                        geometry=storm_geometry
                                    )
                                    all_storms.append(storm)
                                    logger.info(f"Added storm: {event} in {area}")
                                except Exception as e:
                                    logger.warning(f"Error parsing storm data for {area}: {e}")
                                    continue
                    else:
                        logger.warning(f"HTTP {response.status} error fetching alerts for {area}")
                        if response.status == 403:
                            logger.error("403 Forbidden - Check User-Agent header")
            except Exception as e:
                logger.warning(f"Error fetching alerts for {area}: {e}")
                continue

        logger.info(f"Found {len(all_storms)} active storm alerts total")
        return all_storms

    except Exception as e:
        logger.error(f"Error fetching storm data: {e}")
        return []


@app.get("/api/balloons/history", response_model=Dict[str, Balloon])
async def get_balloons_history():
    """
    Fetch and process balloon trajectory data from all 24 time points.

    Uses caching to avoid re-fetching data if called within 10 minutes.
    Merges data from all 24 files, associating each point with a timestamp.
    Uses a clean data structure: {balloon_id: [[timestamp, lat, lon, alt], ...]}
    """
    # Check cache first
    cached_data = get_cached_balloon_data()
    if cached_data:
        return cached_data
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

    # Cache the data before returning
    cache_balloon_data(response_data)

    return response_data


@app.get("/api/storms", response_model=List[Storm])
async def get_active_storms():
    """
    Fetch active storm and severe weather alerts.

    Uses caching to avoid re-fetching data if called within 5 minutes.
    Returns current active hurricanes, tropical storms, and severe weather
    alerts from the National Weather Service for hurricane-prone areas.
    """
    # Check cache first
    cached_data = get_cached_storm_data()
    if cached_data:
        return cached_data

    async with aiohttp.ClientSession() as session:
        try:
            storms = await fetch_storm_data(session)

            if not storms:
                logger.info("No active storms found")
                # Cache empty result too
                cache_storm_data([])
                return []

            logger.info(f"Returning {len(storms)} active storm alerts")

            # Cache the data before returning
            cache_storm_data(storms)

            return storms

        except Exception as e:
            logger.error(f"Error in get_active_storms: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch storm data")


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "Hurricane Hunter API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)