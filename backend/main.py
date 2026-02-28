from fastapi import FastAPI, APIRouter, File, UploadFile
from pydantic import BaseModel
from typing import Optional

import easyocr
import numpy as np
import cv2

# from pydantic_settings import BaseSettings, SettingsConfigDict
import google.genai as genai


# class Settings(BaseSettings):
#     GEMINI_KEY: str


class SimplePrompt(BaseModel):
    content: str


app = FastAPI()
router = APIRouter()
chosenModel = "gemini-3-flash-preview"


class ReportRequest(BaseModel):
    title: str
    canvas_image: Optional[str] = None
    photo: Optional[str] = None


gemini = genai.Client()
reader = easyocr.Reader(["en"], gpu=False)

@router.post("/ocr/")
async def process_image(image: UploadFile = File(...)):
    image_bytes = await image.read()
    np_img = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

    if img is None:
        return {"error": "Invalid image"}

    raw_results = reader.readtext(img, detail = 0)


    return raw_results

    # Sanitisation code when detail = 1
    # results = []
    # for bbox, text, confidence in raw_results:
    #     results.append({
    #         "bbox": [[int(x), int(y)] for x, y in bbox],
    #         "text": text,
    #         "confidence": float(confidence),
    #     })

    # return results

@router.get("/health")
def health():
    return {"status": "fuck_you_you_stupid_bitch"}


@router.post("/simple-req")
def simple_req(prompt: SimplePrompt):
    response = gemini.models.generate_content(
        contents=prompt.content, model=chosenModel
    )
    return {"response": response.text}


@router.post("/full-report")
def full_report(request: ReportRequest):
    return {"report": "report goes here", "images": "list of 5 items goes here"}


@router.post("/just-faces")
def just_faces(request: ReportRequest):
    return {"report": "empty", "images": "list of 5 items goes here"}


@router.post("/just-report")
def just_report(request: ReportRequest):
    return {"report": "report goes here", "images": "EMPTY"}

app.include_router(router)

if __name__ == "__main__":
    print("working")
