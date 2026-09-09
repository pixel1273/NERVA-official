"""
NERVA Database Layer — SQLite for development, designed for PostGIS migration later.
Stores users, roles, incidents, fleet positions, alerts, and dashboard stats.
"""
import sqlite3
import os
import json
from datetime import datetime
from dotenv import load_dotenv
from ..auth import get_password_hash


DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "nerva.db")



def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Create all tables if they don't exist."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role_name TEXT UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            role_id INTEGER NOT NULL,
            full_name TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (role_id) REFERENCES roles(id)
        );

        CREATE TABLE IF NOT EXISTS incidents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            type TEXT NOT NULL DEFAULT 'road_block',
            severity TEXT NOT NULL DEFAULT 'medium',
            status TEXT NOT NULL DEFAULT 'reported',
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            location_name TEXT,
            district TEXT,
            state TEXT,
            photo_url TEXT,
            reported_by TEXT DEFAULT 'field_staff',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS fleet (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_id TEXT UNIQUE NOT NULL,
            vehicle_type TEXT NOT NULL DEFAULT 'truck',
            driver_name TEXT,
            cargo_type TEXT,
            origin TEXT,
            destination TEXT,
            current_lat REAL,
            current_lng REAL,
            status TEXT NOT NULL DEFAULT 'in_transit',
            last_updated TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            message_en TEXT NOT NULL,
            message_as TEXT,
            message_hi TEXT,
            message_mn TEXT,
            severity TEXT NOT NULL DEFAULT 'warning',
            district TEXT,
            target_audience TEXT DEFAULT 'all',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    """)

    conn.commit()
    conn.close()


def seed_data():
    """Insert sample data if tables are empty."""
    conn = get_connection()
    cursor = conn.cursor()

    # Seed Roles
    roles = [("role_ground_staff",), ("role_district_admin",), ("role_central_command",)]
    cursor.executemany("INSERT OR IGNORE INTO roles (role_name) VALUES (?)", roles)

    # Seed Users (Password for all is 'Pixel@1102')
    hashed_pw = get_password_hash("Pixel@1102")
    users = [
        ("staff_user1", hashed_pw, 1, "Field Staff User"),
        ("admin_user1", hashed_pw, 2, "District Admin User"),
        ("command_user1", hashed_pw, 3, "Central Command User"),
    ]
    cursor.executemany(
        "INSERT OR IGNORE INTO users (username, hashed_password, role_id, full_name) VALUES (?, ?, ?, ?)",
        users
    )

    # Check if incident data already exists
    count = cursor.execute("SELECT COUNT(*) FROM incidents").fetchone()[0]
    if count == 0:
        # Sample incidents across different NER states
        incidents = [
            ("NH-37 Partial Washout", "Heavy rainfall caused partial road washout near Kaziranga. Single lane operational.", "road_damage", "critical", "reported", 26.5775, 93.1711, "Near Kaziranga National Park", "Golaghat", "Assam", None, "field_staff"),
            ("Landslide on Kohima-Dimapur Road", "Debris blocking 60% of roadway. Clearing operation underway.", "landslide", "high", "acknowledged", 25.8006, 93.8832, "Kohima-Dimapur Highway NH-29", "Kohima", "Nagaland", None, "field_staff"),
            ("Bridge Cleared at Tezpur", "Kolia Bhomora Setu bridge reopened after maintenance. All lanes operational.", "bridge_issue", "low", "resolved", 26.6338, 92.7897, "Kolia Bhomora Setu, Tezpur", "Sonitpur", "Assam", None, "district_admin"),
            ("Flash Flood Warning - Barak Valley", "IMD has issued flash flood warning for Barak river basin. Water levels rising.", "flood", "high", "reported", 24.8333, 92.7789, "Silchar, Barak Valley", "Cachar", "Assam", None, "weather_system"),
            ("Road Crack Near Itanagar", "Longitudinal crack detected on approach road to Naharlagun. Needs urgent inspection.", "road_damage", "medium", "reported", 27.1000, 93.6167, "Itanagar-Naharlagun Road", "Papum Pare", "Arunachal Pradesh", None, "field_staff"),
            ("Slope Instability - Gangtok East", "Retaining wall showing signs of displacement after 3 days of continuous rain.", "landslide", "medium", "acknowledged", 27.3389, 88.6065, "NH-10 East Gangtok", "East Sikkim", "Sikkim", None, "field_staff"),
            ("Supply Route Restored - Imphal", "NH-2 Imphal-Moreh road fully cleared. Relief supplies can move.", "road_block", "low", "resolved", 24.8170, 93.9368, "NH-2 Imphal-Moreh", "Imphal East", "Manipur", None, "district_admin"),
            ("Aizawl-Silchar Road Subsidence", "Major subsidence spotted at KM 43. Heavy vehicles restricted.", "road_damage", "critical", "reported", 24.2500, 92.8500, "Aizawl-Silchar Road NH-306", "Kolasib", "Mizoram", None, "field_staff"),
        ]

        cursor.executemany(
            """INSERT INTO incidents (title, description, type, severity, status, latitude, longitude, location_name, district, state, photo_url, reported_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            incidents
        )

        # Sample fleet data
        fleet = [
            ("NER-TRK-001", "truck", "Rajesh Kumar", "Medical Supplies", "Guwahati", "Imphal", 26.1445, 91.7362, "in_transit"),
            ("NER-TRK-002", "truck", "Bimal Das", "Food Grains", "Siliguri", "Gangtok", 26.8660, 88.4310, "in_transit"),
            ("NER-TRK-003", "truck", "Manoj Singh", "Construction Material", "Guwahati", "Shillong", 25.5788, 91.8933, "in_transit"),
            ("NER-TRK-004", "truck", "Sanjay Boro", "Fuel", "Dibrugarh", "Tezpur", 26.7509, 93.9422, "delayed"),
            ("NER-TRK-005", "ambulance", "Pranab Gogoi", "Emergency Medical", "Jorhat", "Dimapur", 26.4571, 93.5100, "in_transit"),
            ("NER-TRK-006", "truck", "Thangjam Ibomcha", "Rice & Essentials", "Silchar", "Aizawl", 24.5000, 92.8000, "blocked"),
            ("NER-TRK-007", "truck", "Kuki Lhungdim", "Medicine", "Kohima", "Imphal", 25.2000, 93.8500, "in_transit"),
        ]

        cursor.executemany(
            """INSERT INTO fleet (vehicle_id, vehicle_type, driver_name, cargo_type, origin, destination, current_lat, current_lng, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            fleet
        )

        # Sample alerts
        alerts = [
            ("Flash Flood Warning - Barak Valley", "IMD has issued flash flood warning for Barak river basin. Avoid NH-6 between Silchar and Hailakandi.", "IMD-এ বৰাক নদী অৱবাহিকাৰ বাবে হঠাৎ বানপানীৰ সতৰ্কবাণী জাৰি কৰিছে।", "IMD ने बराक नदी बेसिन के लिए अचानक बाढ़ की चेतावनी जारी की है।", None, "critical", "Cachar", "drivers"),
            ("NH-37 Alternate Route Advisory", "Use Tezpur bypass via NH-15 due to washout near Kaziranga. Expect 2hr delay.", "কাজিৰঙাৰ ওচৰত ধোৱাই যোৱাৰ বাবে NH-15 হৈ তেজপুৰ বাইপাছ ব্যৱহাৰ কৰক।", "काजीरंगा के पास सड़क धुलने के कारण NH-15 से तेजपुर बाईपास का उपयोग करें।", None, "warning", "Golaghat", "drivers"),
            ("Kohima Highway Restricted", "Heavy vehicles restricted on Kohima-Dimapur road due to landslide clearing ops.", None, None, None, "warning", "Kohima", "drivers"),
        ]

        cursor.executemany(
            """INSERT INTO alerts (title, message_en, message_as, message_hi, message_mn, severity, district, target_audience)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            alerts
        )

    conn.commit()
    conn.close()
