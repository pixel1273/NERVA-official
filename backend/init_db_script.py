import os
import sys

# Add the parent directory to the Python path so we can import 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.db import init_db, seed_data

def main():
    print("Initializing the database tables...")
    init_db()
    print("Database tables initialized successfully.")
    
    print("Seeding initial data (Command User)...")
    seed_data()
    print("Initial data seeded successfully.")
    
    print("\nDatabase setup complete! You can now start your FastAPI server.")

if __name__ == "__main__":
    main()
