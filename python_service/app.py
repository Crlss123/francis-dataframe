import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Response
from pydantic import BaseModel
from scripts import scraper, search_activities
from dotenv import load_dotenv
from supabase import create_client, Client


load_dotenv()

app = FastAPI()

BASE_URL = os.getenv("BASE_URL")
URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(URL, KEY)

class Request(BaseModel):
    city: str
    start_date: str
    end_date: str
    category: list[str]
    price: int
    hotel: str
    request_id: int

@app.get("/")
def read_root():
    return "hello world"


@app.post("/booking", status_code=200)
def booking(body: Request, res: Response):
    if not body:
        res.status_code = 400
        return {"status": "error", "message": "No input data provided"}

    request_id = body.request_id
    data = {
        "city": body.city,
        "start_date": body.start_date,
        "end_date": body.end_date,
        "category": body.category,
    }
    print(data)

    results = search_activities(data)

    response = (
        supabase.table("activities")
        .insert(
            [
                {
                    "json": r,
                    "request_id": request_id,
                }
                for r in results
            ]
        )
        .execute()
    )

    return {
        "status": "success",
        "message": "Activities saved successfully from Booking.com API",
        "payload": results
    }


@app.post("/scraping", status_code=200)
def scrapping(body: Request, res: Response):

    if not body:
        res.status_code = 400
        return {"status": "error", "message": "No input data provided"}

    request_id = body.request_id
    data = {
        "city": body.city,
        "start_date": body.start_date,
        "end_date": body.end_date,
        "price": body.price,
        "category": body.category,
    }
    print(data)
    results = scraper.scraping_completo(data)
    for r in results:
        print(r)
    response = (
        supabase.table("activities")
        .insert(
            [
                {
                    "json": r,
                    "request_id": request_id,
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
