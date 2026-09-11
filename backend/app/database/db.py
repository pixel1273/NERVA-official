"""
NERVA Database Layer — PostgreSQL (psycopg2) + PostGIS.
Stores users, incidents, fleet positions, alerts, and dashboard stats.
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import pool
from dotenv import load_dotenv
from ..auth import get_password_hash

load_dotenv()

DB_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/nerva")

try:
    # Use connection pool for optimization
    db_pool = psycopg2.pool.SimpleConnectionPool(1, 20, DB_URL)
except Exception as e:
    print("Database connection error. Check DATABASE_URL in .env")
    db_pool = None

def get_connection():
    if not db_pool:
        return psycopg2.connect(DB_URL, cursor_factory=RealDictCursor)
    conn = db_pool.getconn()
    
    # We must return an object that acts like a psycopg2 connection but uses RealDictCursor
    # Unfortunately psycopg2 pool connections don't retain the cursor_factory easily
    class ConnWrapper:
        def __init__(self, c):
            self._conn = c
        def cursor(self, *args, **kwargs):
            kwargs.setdefault('cursor_factory', RealDictCursor)
            return self._conn.cursor(*args, **kwargs)
        def execute(self, query, vars=None):
            cur = self.cursor()
            cur.execute(query, vars)
            return cur
        def commit(self):
            self._conn.commit()
        def rollback(self):
            self._conn.rollback()
        def close(self):
            db_pool.putconn(self._conn)
    return ConnWrapper(conn)

def init_db():
    """Create all tables and PostGIS extension if they don't exist."""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    except Exception as e:
        print("Warning: Could not create PostGIS extension (requires superuser). Continuing...")
        conn.rollback()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            phone VARCHAR(20) UNIQUE,
            name VARCHAR(100),
            username VARCHAR(50) UNIQUE NOT NULL,
            hashed_password VARCHAR(255) NOT NULL,
            preferred_language VARCHAR(20) DEFAULT 'en',
            user_type VARCHAR(50) DEFAULT 'public',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS incidents (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            type VARCHAR(50) NOT NULL DEFAULT 'road_block',
            severity VARCHAR(50) NOT NULL DEFAULT 'medium',
            status VARCHAR(50) NOT NULL DEFAULT 'reported',
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            location_name VARCHAR(255),
            district VARCHAR(100),
            state VARCHAR(100),
            photo_url TEXT,
            reported_by VARCHAR(50) DEFAULT 'public',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS fleet (
            id SERIAL PRIMARY KEY,
            vehicle_id VARCHAR(50) UNIQUE NOT NULL,
            vehicle_type VARCHAR(50) NOT NULL DEFAULT 'truck',
            driver_name VARCHAR(100),
            cargo_type VARCHAR(100),
            origin VARCHAR(100),
            destination VARCHAR(100),
            current_lat REAL,
            current_lng REAL,
            status VARCHAR(50) NOT NULL DEFAULT 'in_transit',
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS alerts (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            message_en TEXT NOT NULL,
            message_as TEXT,
            message_hi TEXT,
            message_mn TEXT,
            severity VARCHAR(50) NOT NULL DEFAULT 'warning',
            district VARCHAR(100),
            target_audience VARCHAR(50) DEFAULT 'all',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    conn.commit()
    conn.close()

def seed_data():
    """Insert command user if it does not exist."""
    conn = get_connection()
    cursor = conn.cursor()

    # Create only the command user
    cursor.execute("SELECT id FROM users WHERE username = 'command_user'")
    if not cursor.fetchone():
        hashed_pw = get_password_hash("Pixel@1102")
        cursor.execute(
            """INSERT INTO users (username, hashed_password, user_type, name) 
               VALUES (%s, %s, %s, %s)""",
            ("command_user", hashed_pw, "command", "Central Command")
        )

    conn.commit()
    conn.close()
