# Use an official, lightweight Python image
FROM python:3.14-slim

# Set the working directory inside the container
WORKDIR /app

# Copy just the requirements first (this makes future builds faster)
COPY requirements.txt .

# Install the Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your backend code into the container
COPY . .

# Expose the port your Python app runs on
EXPOSE 8000

# Command to run your app (Adjust this based on your framework!)
# Example for FastAPI: CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
# Example for Flask: CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "app:app"]
CMD sh -c "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port 8000"