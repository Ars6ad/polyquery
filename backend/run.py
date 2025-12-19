import uvicorn
import os

if __name__ == "__main__":
    # Ensure we are in the right directory for relative imports if running as script
    # but simpler to just run uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=3000, reload=True)



