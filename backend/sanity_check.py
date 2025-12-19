import sys
import os

# Add local directory to path just in case
sys.path.append(os.getcwd())

try:
    from app.main import app
    print("Sanity Check: app.main imported successfully!")
except Exception as e:
    print(f"Sanity Check Failed: {e}")
    import traceback
    traceback.print_exc()
