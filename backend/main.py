from fastapi import (
    FastAPI,
    APIRouter,
    File,
    UploadFile,
    Depends,
    HTTPException,
    status,
    BackgroundTasks,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from database import init_db, get_db, User, Claim
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from sqlalchemy.orm import Session
from jose import jwt, JWTError
import bcrypt
from datetime import datetime, timedelta
import easyocr
import numpy as np
import cv2
import mediapipe as mp
from PIL import Image
import io
import base64
import google.genai as genai
import math
import os
import json
import re

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
current_task_id = 0
TASK_RESULTS = {}

# from pydantic_settings import BaseSettings, SettingsConfigDict

# class Settings(BaseSettings):
#     GEMINI_KEY: str


BaseOptions = mp.tasks.BaseOptions
FaceDetector = mp.tasks.vision.FaceDetector
FaceDetectorOptions = mp.tasks.vision.FaceDetectorOptions
VisionRunningMode = mp.tasks.vision.RunningMode


def getRotation(detection) -> float:
    right_eye = detection.keypoints[0]
    left_eye = detection.keypoints[1]
    for i, kp in enumerate(detection.keypoints):
        print(f"keypoint {i}: x={kp.x:.3f}, y={kp.y:.3f}")

    dx = left_eye.x - right_eye.x
    dy = left_eye.y - right_eye.y

    upsideDown = checkUpsideDown(detection)

    angle = math.degrees(math.atan2(dy, dx))
    print("angle before : ", angle)
    if upsideDown:
        angle += 0
    return angle


def checkUpsideDown(detection) -> bool:
    eye = detection.keypoints[0]
    nose = detection.keypoints[2]

    if nose.y < eye.y:
        return True
    else:
        return False


def getFace(base64_image: str) -> str | None:
    image_bytes = base64.b64decode(base64_image)
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # mp_face = mp.python.solutions.face_detection  # pyright: ignore
    # with mp_face.FaceDetection(
    #     model_selection=0, min_detection_confidence=0.5
    # ) as detector:
    #     import numpy as np
    #
    #     result = detector.process(np.array(image))
    #
    # if not result.detections:
    #     return None  # no face found
    #

    options = FaceDetectorOptions(
        base_options=BaseOptions(model_asset_path="face_detector.tflite"),
        running_mode=VisionRunningMode.IMAGE,
    )

    with FaceDetector.create_from_options(options) as detector:
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.array(image))
        result = detector.detect(mp_image)

    if not result.detections:
        return None

    print("==== first pass ====")
    angle = getRotation(result.detections[0])
    print(f"need {angle} degrees")
    image = image.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)

    with FaceDetector.create_from_options(options) as detector:
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.array(image))
        result = detector.detect(mp_image)

    if not result.detections:
        return None

    print("==== second pass ====")
    angle = getRotation(result.detections[0])
    print(f"need {angle} degrees")
    image = image.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)

    with FaceDetector.create_from_options(options) as detector:
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.array(image))
        result = detector.detect(mp_image)

    if not result.detections:
        return None

    bbox = result.detections[0].bounding_box
    margin_w = bbox.width * 0.4 // 2
    margin_h = bbox.height * 0.4 // 2
    top_mod = 1.9
    left_mod = 1
    right_mod = 0.7
    bot_mod = 0.7
    w, h = image.size
    cropped = image.crop(
        (
            max(0, bbox.origin_x - int(margin_w * left_mod)),
            max(0, bbox.origin_y - int(margin_h * top_mod)),
            min(w, bbox.origin_x + bbox.width + int(margin_w * right_mod)),
            min(h, bbox.origin_y + bbox.height + int(margin_h * bot_mod)),
        )
    )
    #
    # # Get the first face's bounding box
    # detection = result.detections[0]
    # facebox = detection.location_data.relative_bounding_box
    #
    # image_w, image_h = image.size
    # x = int(facebox.xmin * image_w)
    # y = int(facebox.ymin * image_h)
    # face_w = int(facebox.width * image_w)
    # face_h = int(facebox.height * image_h)
    #
    # cropped = image.crop((x, y, x + face_w, y + face_h))
    outputBuffer = io.BytesIO()
    cropped.save(outputBuffer, format="webp")
    return base64.b64encode(outputBuffer.getvalue()).decode("utf-8")


class SimplePrompt(BaseModel):
    content: str


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
init_db()
router = APIRouter()
chosenModel = "gemini-3-flash-preview"

# ── Easily editable prompts ──────────────────────────────────────────────────

# Stage 1: Parse OCR text from driving licence into JSON for Stage 2 autofill
STAGE1_OCR_PROMPT = """You are extracting information from a UK driving licence.
Given the following raw OCR text, extract these fields and return ONLY a valid JSON object with exactly these keys:
{{
  "surname": "...",
  "forenames": "...",
  "dob": "YYYY-MM-DD",
  "licenseRef": "..."
}}
If a field cannot be found, use an empty string. Return ONLY the JSON object with no extra text or markdown.

OCR Text:
{ocr_text}"""

# Stage 4: Generate a claim report from the incident map canvas image
STAGE4_REPORT_PROMPT = """You are an insurance claim assistant. You have been given an incident map diagram and a description of the accident.

Description from claimant: {description}

Based on the incident diagram image and the description above, write a formal insurance claim report from the claimant's first-person perspective.
Describe the incident clearly and professionally, including vehicle positions shown in the diagram, the nature of the collision, damage levels indicated by the coloured markers (green = light damage, yellow = medium damage, red = heavy damage), and any other relevant observations.
Write in first person as the claimant."""

# ─────────────────────────────────────────────────────────────────────────────


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

    raw_results = reader.readtext(img, detail=0)

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


# --- auth helpers ---


def create_token(user_id: int) -> str:
    payload = {"sub": str(user_id), "exp": datetime.utcnow() + timedelta(hours=24)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return user


# --- auth routes ---


class AuthRequest(BaseModel):
    email: str
    password: str


class ClaimOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    created_at: datetime


class ClaimRequest(BaseModel):
    content: str


class IdUploadRequest(BaseModel):
    image: str  # base64-encoded image


@router.post("/auth/register")
def register(body: AuthRequest, db: Session = Depends(get_db)):
    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    user = User(email=body.email, password=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email}


def _run_image_generation(
    task_id: int, happy_prompt: str, sad_prompt: str, face_b64: str
):
    face_bytes = base64.b64decode(face_b64)

    def generate(prompt: str, label: str):
        response = gemini.models.generate_content(
            model="gemini-2.0-flash-preview-image-generation",
            contents=[
                genai.types.Part.from_bytes(data=face_bytes, mime_type="image/webp"),
                genai.types.Part.from_text(text=prompt),
            ],
            config=genai.types.GenerateContentConfig(
                response_modalities=["IMAGE"],
            ),
        )
        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                image_bytes = part.inline_data.data
                with open(f"task_{task_id}_{label}.png", "wb") as f:
                    f.write(image_bytes)
                return base64.b64encode(image_bytes).decode()
        raise ValueError("No image returned by Gemini")

    try:
        TASK_RESULTS[task_id] = {
            "status": "done",
            "happy": generate(happy_prompt, "happy"),
            "sad": generate(sad_prompt, "sad"),
        }
    except Exception as e:
        TASK_RESULTS[task_id] = {"status": "error", "detail": str(e)}


@router.post("/id-upload")
def stage1(
    body: IdUploadRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    # Strip data URL prefix if present
    raw_b64 = body.image.split(",")[-1] if "," in body.image else body.image

    global current_task_id
    current_task_id += 1
    task_id = current_task_id
    TASK_RESULTS[task_id] = {"status": "pending"}
    background_tasks.add_task(
        _run_image_generation,
        task_id,
        "Keep the image grayscale, make the person on the picture look happy and smiling with lighting coming from the top",
        "Keep the image grayscale, make the person slightly angry and frustrated looking, with lighting coming from the bottom",
        raw_b64,
    )

    # Run OCR on the uploaded image
    image_bytes = base64.b64decode(raw_b64)
    np_img = np.frombuffer(image_bytes, np.uint8)
    img_cv = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
    ocr_fields = {"surname": "", "forenames": "", "dob": "", "licenseRef": ""}
    if img_cv is not None:
        ocr_words = reader.readtext(img_cv, detail=0)
        ocr_text = " ".join(ocr_words)
        try:
            gemini_resp = gemini.models.generate_content(
                contents=STAGE1_OCR_PROMPT.format(ocr_text=ocr_text),
                model=chosenModel,
            )
            resp_text = gemini_resp.text.strip()
            match = re.search(r"\{.*\}", resp_text, re.DOTALL)
            if match:
                ocr_fields = json.loads(match.group())
        except Exception:
            pass  # Fall back to empty fields if OCR/Gemini fails

    return {
        "surname": ocr_fields.get("surname", ""),
        "forenames": ocr_fields.get("forenames", ""),
        "dob": ocr_fields.get("dob", ""),
        "licenseRef": ocr_fields.get("licenseRef", ""),
        "task_id": task_id,
    }


@router.post("/generate-report")
def generate_report(
    request: ReportRequest,
    current_user: User = Depends(get_current_user),
):
    if not request.canvas_image:
        raise HTTPException(status_code=400, detail="canvas_image is required")

    image_bytes = base64.b64decode(request.canvas_image)
    prompt = STAGE4_REPORT_PROMPT.format(
        description=request.title or "No description provided"
    )

    response = gemini.models.generate_content(
        model=chosenModel,
        contents=[
            genai.types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
            genai.types.Part.from_text(
                text=f"""""You are generating a accident report for an claimaint trying to make an insurance claim Background info: {prompt} | Please dont write it like a letter, you are on a portal. Include only 3 sections as per the following example 
*Incident Description:**
At the time of the incident, I was driving the vehicle represented as the blue car in the attached diagram. I had come to a complete stop at a red traffic light. While stationary and waiting for the signal to change, my vehicle was struck from behind by another vehicle (represented as the red car in the diagram). The driver of the other vehicle failed to stop in time, resulting in a direct rear-end collision.

**Vehicle Positions and Collision Nature:**
As illustrated in the incident map, my vehicle was positioned directly in front of the other vehicle. The arrow indicates the trajectory of the other car as it moved forward into the rear of my stationary vehicle. The point of impact was the center-rear of my car and the front-center of the other vehicle.

**Damage Assessment:**
Based on the damage severity scale (green = light, yellow = medium, red = heavy), the following damage was sustained:

*   **My Vehicle (Blue Car):** My vehicle sustained heavy damage to the rear bumper, trunk area, and potentially the underlying frame, as indicated by the red marker at the point of impact on the diagram.
*   **Other Vehicle (Red Car):** The striking vehicle is depicted in red, indicating that it sustained heavy damage to its front end as a result of the collision.
                                       """
            ),
        ],
    )
    return {"report": response.text}


@router.get("/task/{task_id}")
def get_task(task_id: int, current_user: User = Depends(get_current_user)):
    result = TASK_RESULTS.get(task_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return result


@router.post("/auth/login")
def login(body: AuthRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not bcrypt.checkpw(body.password.encode(), user.password.encode()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return {
        "access_token": create_token(user.id),
        "token_type": "bearer",
        "email": user.email,
    }


# --- protected claim routes ---


@router.get("/claims", response_model=List[ClaimOut])
def get_claims(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return db.query(Claim).filter(Claim.user_id == current_user.id).all()


@router.post("/claims")
def create_claim(
    body: ClaimRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    claim = Claim(user_id=current_user.id, content=body.content)
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim


app.include_router(router)

if __name__ == "__main__":
    with open("test1.webp", "rb") as file:
        base64_string = base64.b64encode(file.read()).decode("utf-8")

    print(base64_string)
    with open("result.webp", "wb") as file:
        file.write(base64.b64decode(getFace(base64_string)))

    print("working")
