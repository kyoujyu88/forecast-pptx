import asyncio
import io

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from pptx_generator import generate_pptx
from weather import fetch_forecast, geocode

PPTX_MIME = (
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
)

app = FastAPI(title="Forecast PPTX")
app.mount("/static", StaticFiles(directory="static"), name="static")


class LocationIn(BaseModel):
    name: str
    lat: float
    lon: float


class GenerateRequest(BaseModel):
    locations: list[LocationIn]
    days: int


@app.get("/")
async def index():
    return FileResponse("static/index.html")


@app.get("/api/geocode")
async def geocode_api(name: str):
    results = await geocode(name)
    return {"results": results}


@app.post("/api/generate")
async def generate_api(req: GenerateRequest):
    if not (1 <= len(req.locations) <= 5):
        raise HTTPException(400, "地点は1〜5件で指定してください")
    if req.days not in (7, 10, 14, 16):
        raise HTTPException(400, "日数は 7, 10, 14, 16 のいずれかを指定してください")

    forecasts = await asyncio.gather(
        *[fetch_forecast(loc.lat, loc.lon, req.days) for loc in req.locations]
    )

    locs = [loc.model_dump() for loc in req.locations]
    pptx_bytes = generate_pptx(locs, list(forecasts), req.days)

    return StreamingResponse(
        io.BytesIO(pptx_bytes),
        media_type=PPTX_MIME,
        headers={"Content-Disposition": "attachment; filename=forecast.pptx"},
    )
