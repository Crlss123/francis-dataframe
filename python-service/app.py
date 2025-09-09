from fastapi import FastAPI, Response
from pydantic import BaseModel
from scripts.booking import search_activities
from scripts.scrapper import scraper
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

app = FastAPI()

BASE_URL = os.getenv("BASE_URL")
URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(URL, KEY)


class InputData(BaseModel):
    city: str
    start_date: str
    end_date: str
    price: float
    category: list[str]
    hotel: str
    request_id: int


@app.post("/booking", status_code=200)
def booking(data: InputData, res: Response):
    if not data:
        res.status_code = 400
        return {"status": "error", "message": "No input data provided"}

    request_id = data.request_id
    data = {
        "city": data.city,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "price": data.price,
        "category": data.category,
        "hotel": data.hotel,
    }

    results = search_activities(data)
    response = (
        supabase.table("activities")
        .insert(
            [
                {
                    "json": r,
                    "request_id": request_id.data[0]["id"] if request_id.data else None,
                }
                for r in results
            ]
        )
        .execute()
    )

    return {
        "status": "success",
        "message": "Activities saved successfully from Booking.com API",
    }


@app.post("/scrapping", status_code=200)
def scrapping(data: InputData, res: Response):

    if not data:
        res.status_code = 400
        return {"status": "error", "message": "No input data provided"}

    request_id = data.request_id
    data = {
        "city": data.city,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "price": data.price,
        "category": data.category,
        "hotel": data.hotel,
    }
    results = scraper.scraping_completo(data)

    response = (
        supabase.table("activities")
        .insert(
            [
                {
                    "json": r,
                    "request_id": request_id.data[0]["id"] if request_id.data else None,
                }
                for r in results
            ]
        )
        .execute()
    )

    return {
        "status": "success",
        "message": "Activities saved successfully from web scraping",
    }
