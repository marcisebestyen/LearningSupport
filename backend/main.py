import os
import fitz
import google.generativeai as genai
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from dotenv import load_dotenv

from database import engine, get_db
import models

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    raise ValueError("API Key not found! Check your .env file.")

genai.configure(api_key=GOOGLE_API_KEY)

model = genai.GenerativeModel('gemini-1.5-flash')

try:
    with engine.connect() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        connection.commit()
    models.Base.metadata.create_all(bind=engine)
    print("--- Database Connected & Tables Ready ---")
except Exception as e:
    print(f"--- Database Connection Failed: {e} ---")

app = FastAPI()

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


@app.get("/")
def read_root():
    return {"status": "System is online", "model": "Gemini 1.5 Flash"}


@app.post("/upload/")
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # 1. VALIDATE
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported right now.")

    file_content = await file.read()

    try:
        full_text = extract_text_from_pdf(file_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {str(e)}")

    prompt = f"Please provide a concise and structured summary of the following document for a student:\n\n{full_text[:30000]}"

    try:
        response = model.generate_content(prompt)
        summary_text = response.text
    except Exception as e:
        summary_text = "Error generating summary."
        print(f"Gemini Error: {e}")

    new_doc = models.Document(
        filename=file.filename,
        content=full_text,
        summary=summary_text
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    return {
        "filename": new_doc.filename,
        "summary": new_doc.summary,
        "id": new_doc.id
    }