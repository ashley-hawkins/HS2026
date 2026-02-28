from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

# from pydantic_settings import BaseSettings, SettingsConfigDict
import google.genai as genai


# class Settings(BaseSettings):
#     GEMINI_KEY: str


class SimplePrompt(BaseModel):
    content: str


app = FastAPI()
chosenModel = "gemini-3-flash-preview"


class ReportRequest(BaseModel):
    title: str
    canvas_image: Optional[str] = None
    photo: Optional[str] = None


gemini = genai.Client()


@app.get("/health")
def health():
    return {"status": "fuck_you_you_stupid_bitch"}


@app.post("/simple-req")
def simple_req(prompt: SimplePrompt):
    response = gemini.models.generate_content(
        contents=prompt.content, model=chosenModel
    )
    return {"response": response.text}


@app.post("/full-report")
def full_report(request: ReportRequest):
    return {"report": "report goes here", "images": "list of 5 items goes here"}


@app.post("/just-faces")
def just_faces(request: ReportRequest):
    return {"report": "empty", "images": "list of 5 items goes here"}


@app.post("/just-report")
def just_report(request: ReportRequest):
    return {"report": "report goes here", "images": "EMPTY"}


if __name__ == "__main__":
    print("working")
