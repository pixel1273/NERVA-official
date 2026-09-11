# 🧠 NERVA: Complete Technical & Business Overview

This document provides a comprehensive technical and business overview of **NERVA (NER Vulnerability & Accessibility Intelligence)**. It is designed to help you understand every aspect of the project, defend technical choices in front of SIH 2026 judges, and clearly explain the business logic and data pipelines.

---

## 1. Project Overview & Business Value

**Problem Statement (SIH26002):** AI-Based Smart Logistics and Accessibility Intelligence Platform for the North Eastern Region (NER).

**The Solution:**
NERVA is an AI-powered platform tailored to solve the unique logistical and accessibility challenges of India's North Eastern Region. Due to difficult terrain, extreme weather, and poor connectivity, roads often get blocked, cutting off communities. 

NERVA tackles this through:
1. **Real-time GIS Visualization:** Mapping out road statuses and accessibility.
2. **Predictive Analytics:** Forecasting landslides and floods before they disrupt logistics.
3. **Smart Routing:** Finding alternate paths when primary routes fail.
4. **Crowdsourced Incident Reporting:** Letting locals report roadblocks with geotagged images.
5. **Multilingual & Offline Capabilities:** Ensuring the app works in remote areas with poor internet and diverse languages.

---

## 2. Technical Stack & Libraries Used

### 🟢 Frontend Framework & Libraries
The frontend is a Progressive Web App (PWA) built for speed, interactivity, and offline support.

* **React 19 (via Vite):** The core UI framework. Chosen for its component-based architecture which makes building complex dashboards maintainable. Vite is used as the bundler because it is incredibly fast compared to Webpack.
* **React Router DOM:** Handles client-side routing, enabling a seamless Single Page Application (SPA) experience without page reloads.
* **Leaflet / React-Leaflet / Maplibre-GL:** Core geospatial libraries. Used to render interactive maps, plot incidents, visualize risk heatmaps, and show optimized routes. Chosen because they are lightweight and highly customizable compared to heavy proprietary SDKs.
* **Recharts:** A composable charting library built on React components. Used to build the analytics dashboard (showing disruption trends, accessibility scores).
* **i18next & react-i18next:** Internationalization framework. Crucial for NERVA because the region has multiple local languages (Assamese, Mizo, etc.). This ensures last-mile usability.
* **vite-plugin-pwa:** Enables Progressive Web App features (Service Workers). This allows the dashboard and app to function **offline** when connectivity drops, caching data and syncing when the internet is restored.
* **Lucide-React:** Provides clean, consistent vector icons across the UI.

### 🔵 Backend Framework & Libraries
The backend is a high-performance Python API designed to handle AI inference, geospatial queries, and real-time data processing.

* **FastAPI:** The core web framework. Chosen over Django/Flask because it is asynchronous by default, incredibly fast, and automatically generates interactive API documentation (Swagger UI).
* **Uvicorn:** The ASGI web server used to run the FastAPI application.
* **NetworkX:** A powerful Python package for the creation, manipulation, and study of the structure, dynamics, and functions of complex networks. **Why?** It acts as the routing engine to calculate the shortest/safest paths across road graphs.
* **Pydantic:** Used for data validation and settings management. Ensures that incoming data (like field reports) strictly matches expected schemas.
* **LiteLLM:** Used to seamlessly interface with Large Language Models (LLMs). This can power multilingual translation tasks or process unstructured textual data into actionable intelligence.
* **Security (passlib, bcrypt, python-jose):** Used for user authentication, password hashing, and generating secure JWT (JSON Web Tokens) to protect the API endpoints.

### 🟣 AI/ML & Data Processing
The intelligence layer that makes NERVA "Smart".

* **XGBoost:** An optimized distributed gradient boosting library. Used for structured tabular data to predict landslide/flood probabilities based on historical weather, soil, and terrain data.
* **NumPy:** Fundamental package for scientific computing. Used for fast array operations and mathematical calculations required by the ML models.
* **Pillow (PIL):** Python Imaging Library, used to process and resize images uploaded in field reports before running them through severity classification models.
* **Httpx:** A fully featured HTTP client for Python, used to fetch external data (like weather APIs or IMD data) asynchronously without blocking the server.

---

## 3. Business Logic & Workflow Pipeline

To explain NERVA effectively to judges, use this step-by-step pipeline of how data flows through the system:

### Phase 1: Data Ingestion (The Input)
1. **Crowdsourcing (Bottom-Up):** A local resident or official encounters a landslide blocking a road. They open the NERVA mobile app (which works offline). They take a picture, and the app grabs their GPS coordinates.
2. **System APIs (Top-Down):** The backend continuously fetches weather data (rainfall), river gauge levels, and satellite imagery from sources like IMD, CWC, and ISRO Bhuvan.

### Phase 2: Processing & Prediction (The Brain)
1. **Incident Validation:** The user's field report is synced to the backend. The image and data are processed to classify the severity of the blockage.
2. **Predictive Modeling:** The XGBoost/ML models take the real-time weather data and terrain features to generate a "Risk Score" for various road segments. If heavy rain is detected on steep slopes, the landslide risk spikes.

### Phase 3: Actionable Intelligence (The Output)
1. **Graph Routing Adjustment:** The `NetworkX` engine takes the newly reported roadblock and "cuts" that edge from the regional road graph. It instantly recalculates alternate, safe logistics routes.
2. **Dashboard Updates:** The React frontend polls/receives these updates. The Leaflet map visually turns the blocked road red and draws a new green path for supply trucks.
3. **Early Warnings:** The system identifies villages that are about to be cut off due to the blockages and triggers multilingual alerts via SMS/Push notifications so they can prepare or evacuate.

---

## 4. Key Selling Points for SIH Judges

When asked questions, emphasize these architectural decisions:

1. **"Why FastAPI and not Django?"** 
   * *Answer:* Logistics and disaster response require high concurrency and speed. FastAPI is async-native, allowing us to process hundreds of real-time telemetry points and field reports without bottlenecking.
2. **"How do you handle bad internet in the North East?"**
   * *Answer:* We built offline-first capabilities using PWA Service Workers on the frontend. Users can log incidents offline, and the app automatically queues and syncs the data to our API once they reach a network zone.
3. **"How does the routing actually work?"**
   * *Answer:* We aren't just using Google Maps. We use custom graph structures via `NetworkX`. This allows us to inject our own AI risk scores as "weights" onto the roads. If a road has a high landslide prediction, our algorithm actively routes supply trucks around it before the disaster even happens.
4. **"How is it accessible to the locals?"**
   * *Answer:* We integrated `i18next` for UI localization and NLP for translating inputs, ensuring the interface natively speaks the diverse languages of the NER.

## 5. Summary
NERVA is not just a reporting tool; it is a **proactive resilience engine**. It combines offline-first crowdsourcing (React/PWA), geospatial graph routing (NetworkX/Leaflet), and predictive machine learning (XGBoost) into a highly performant API (FastAPI) to save lives and optimize supply chains in India's most challenging terrains.
