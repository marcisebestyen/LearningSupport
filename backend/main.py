import os
import fitz
import google.generativeai as genai
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from dotenv import load_dotenv
import auth
import database
import schemas
import services
from database import engine
import models
from typing import List

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    raise ValueError("API Key not found! Check your .env file.")

genai.configure(api_key=GOOGLE_API_KEY)

model = genai.GenerativeModel('gemini-2.5-flash')

try:
    with engine.connect() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        connection.commit()
    print("--- Database Connected ---")
except Exception as e:
    print(f"--- Database Connection Failed: {e} ---")

app = FastAPI()
doc_service = services.DocumentService()
user_service = services.UserService()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def extract_text_from_pdf(file_bytes):
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text_content = ""
    for page in doc:
        text_content += page.get_text()
    return text_content


@app.post("/register")
def register(username: str, password: str, db: Session = Depends(database.get_db)):
    if user_service.get_user_by_username(db, username):
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed = auth.hash_password(password)
    user_service.create_user(db, username, hashed)
    return {"message": "User created"}


@app.post("/login")
def login(username: str, password: str, db: Session = Depends(database.get_db)):
    user = user_service.get_user_by_username(db, username)
    if not user or not auth.verify_password(password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}


@app.post("/upload/")
async def upload_file(
        file: UploadFile = File(...),
        db: Session = Depends(database.get_db),
        current_user: models.User = Depends(auth.get_current_user)
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="PDF required")

    content = doc_service.extract_text(await file.read())
    summary = doc_service.generate_summary(content)

    doc = doc_service.save_document(db, file.filename, content, summary, current_user.id)
    return doc


@app.get("/history", response_model=List[schemas.DocumentResponse])
def read_history(
        db: Session = Depends(database.get_db),
        current_user: models.User = Depends(auth.get_current_user)
):
    return doc_service.get_user_history(db, current_user.id)
