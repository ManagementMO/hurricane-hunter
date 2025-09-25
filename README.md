# Hurricane Hunter Mission Control Dashboard

A real-time weather balloon monitoring system that tracks storm interactions and provides mission-critical insights for weather operations.

## Overview

Hurricane Hunter visualizes weather balloon trajectories and their proximity to severe weather systems. The dashboard provides real-time balloon tracking, storm analysis, and temporal playback capabilities for comprehensive weather monitoring.

## Key Features

**Real-Time Visualization**
- Interactive map with balloon trajectories and storm boundaries
- Live balloon position tracking with altitude data
- Dynamic storm visualization with severity indicators

**Intelligent Analysis**
- Automated proximity detection identifies balloons monitoring storms
- Advanced filtering by storm severity and event type
- Enhanced visual markers distinguish monitoring balloons from regular balloons

**Temporal Controls**
- 24-hour trajectory playback with timeline scrubbing
- Play/pause/reset controls for historical analysis
- Smooth data streaming for performance

**Mission Control Interface**
- Professional dark theme optimized for monitoring operations
- Real-time metrics showing active balloons and storm status
- Fully responsive design for desktop and mobile

## Technology Stack

**Frontend**
- React 18 with Vite for modern development
- Leaflet for high-performance mapping
- Turf.js for spatial analysis and proximity calculations

**Backend**
- FastAPI with async Python for real-time data processing
- Docker containerization for reliable deployment
- CORS-enabled API with health monitoring

## Visual Design

**Balloon Markers**
- Regular balloons: Blue circles with standard trajectories
- Monitoring balloons: Double-ring design with orange warning indicators and dashed paths
- Real-time pulsing animations for active monitoring

**Storm Visualization**
- Color-coded severity levels (Extreme, Severe, Moderate, Minor)
- Polygon boundaries showing affected areas
- Interactive filtering sidebar for custom views

**User Experience**
- Tornado loading animation with personalized messaging
- Collapsible filter sidebar with storm categorization
- Responsive temporal analysis controls at bottom

## Quick Start

1. **Backend**: Run `python main.py` (requires Python 3.11+)
2. **Frontend**: Run `npm run dev` in `/hurricane-dashboard` (requires Node.js 18+)
3. **Access**: Open http://localhost:5173 for the dashboard

The system gracefully falls back to demo data when the backend is unavailable, making it perfect for development and demonstration purposes.