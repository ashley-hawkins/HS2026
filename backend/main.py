from fastapi import FastAPI, APIRouter, File, UploadFile, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from database import init_db, get_db, User, Claim
from pydantic import BaseModel
from typing import Optional
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

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

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
    payload = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
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


class ClaimRequest(BaseModel):
    content: str


@router.post("/auth/register")
def register(body: AuthRequest, db: Session = Depends(get_db)):
    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    user = User(email=body.email, password=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email}


@router.post("/auth/login")
def login(body: AuthRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not bcrypt.checkpw(body.password.encode(), user.password.encode()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return {"access_token": create_token(user.id), "token_type": "bearer", "email": user.email}


# --- protected claim routes ---

@router.get("/claims")
def get_claims(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Claim).filter(Claim.user_id == current_user.id).all()


@router.post("/claims")
def create_claim(body: ClaimRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    claim = Claim(user_id=current_user.id, content=body.content)
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim


app.include_router(router)

if __name__ == "__main__":
    with open("test1.webp", "rb") as file:
        base64_string = base64.b64encode(file.read()).decode("utf-8")

    with open("result.webp", "wb") as file:
        file.write(base64.b64decode(getFace(base64_string)))

    print("working")
