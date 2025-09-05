import requests
import json
from datetime import datetime, timedelta
import pytz
from timezonefinder import TimezoneFinder
from sentence_transformers import SentenceTransformer, util
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("BASE_URL")

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)

headers = {
    'x-rapidapi-key': os.getenv("RAPID_API_KEY"),
    'x-rapidapi-host': os.getenv("RAPID_API_HOST")
}

tf = TimezoneFinder()
model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

def convert_to_local_by_latlon(iso_datetime_str, lat, lon):
    try:
        dt = datetime.fromisoformat(iso_datetime_str.replace("Z", "+00:00"))
    except Exception:
        return iso_datetime_str
    timezone_str = tf.timezone_at(lat=lat, lng=lon) or "UTC"
    local_tz = pytz.timezone(timezone_str)
    dt_local = dt.astimezone(local_tz)
    return dt_local.strftime("%Y-%m-%d %H:%M")

def get_date_range(start_date, end_date):
    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
    return [(start_dt + timedelta(days=i)).strftime("%Y-%m-%d")
            for i in range((end_dt - start_dt).days + 1)]

def get_destination_id(city_name):
    url = "https://booking-com.p.rapidapi.com/v1/hotels/locations"
    params = {"name": city_name, "locale": "en-gb"}
    res = requests.get(url, headers=headers, params=params).json()

    if not res or not isinstance(res, list):
        return None, None

    for loc in res:
        if loc.get("dest_type") == "city":
            return loc.get("dest_id") or loc.get("id"), loc.get("cc1") or loc.get("country_code")

    loc = res[0]
    return loc.get("dest_id") or loc.get("id"), loc.get("cc1") or loc.get("country_code")

def search_attractions(dest_id, cc1, start_date, end_date, limit=10):
    url = f"{BASE_URL}/search"
    params = {
        "start_date": start_date,
        "end_date": end_date,
        "locale": "en-gb",
        "currency": "USD",
        "dest_id": dest_id,
        "order_by": "attr_book_score",
        "page_number": 0
    }
    res = requests.get(url, headers=headers, params=params).json()

    products = res.get("products", [])
    results = []
    for product in products[:limit]:
        slug = product.get("slug")
        results.append({
            "id": product.get("id"),
            "url": f"https://www.booking.com/attractions/{cc1}/{slug}.html" if slug else None,
            "actividad": product.get("name"),
            "descripcion": product.get("shortDescription"),
            "precio": product.get("representativePrice", {}).get("chargeAmount"),
            "rating": (product.get("reviewsStats") or {}).get("combinedNumericStats", {}).get("average"),
            "slug": slug,
            "horarios": [],
            "dias": [],
            "num_personas": None
        })
    return results

def get_attraction_details(slug):
    if not slug:
        return {}
    url = f"{BASE_URL}/details"
    params = {"slug": slug, "locale": "en-gb", "currency": "USD"}
    return requests.get(url, headers=headers, params=params).json()

def get_availability(attraction_id, date):
    url = f"{BASE_URL}/availability"
    params = {"date": date, "currency": "USD", "locale": "en-gb", "attraction_id": attraction_id}
    return requests.get(url, headers=headers, params=params).json()

def filtrar_por_categoria(attractions, categoria, umbral=0.25):
    embedding_categoria = model.encode(categoria, convert_to_tensor=True)
    filtradas = []
    for attr in attractions:
        slug = attr.get("slug")
        detalles = get_attraction_details(slug)
        texto = detalles.get("description") or attr.get("descripcion") or ""
        if not texto.strip():
            continue
        embedding_texto = model.encode(texto, convert_to_tensor=True)
        similitud = util.pytorch_cos_sim(embedding_categoria, embedding_texto).item()
        if similitud >= umbral:
            filtradas.append(attr)
    return filtradas

def search_activities(entrada):
    city = entrada["city"]
    start_date = entrada["start_date"]
    end_date = entrada["end_date"]
    category = entrada["category"]

    dest_id, cc1 = get_destination_id(city)
    if not dest_id:
        return []

    attractions = search_attractions(dest_id, cc1, start_date, end_date)
    fechas = get_date_range(start_date, end_date)

    for attr in attractions:
        all_horarios = []
        for fecha in fechas:
            availability = get_availability(attr["id"], fecha)
            for slot in availability if isinstance(availability, list) else []:
                start_time = slot.get("start")
                if start_time:
                    all_horarios.append(start_time)
        attr["horarios"] = all_horarios
        attr["dias"] = fechas

    attractions_filtradas = filtrar_por_categoria(attractions, category, umbral=0.25)

    return [
        {
            "url": attr["url"],
            "actividad": attr["actividad"],
            "horarios": attr["horarios"],
            "dias": attr["dias"],
            "precio": attr["precio"],
            "num_personas": attr["num_personas"],
            "descripcion": attr["descripcion"],
            "rating": attr["rating"]
        }
        for attr in attractions_filtradas
    ]

entrada = {
    "city": "Tokyo",
    "start_date": "2025-10-14",
    "end_date": "2025-10-16",
    "category": "restaurante"
}

resultados = search_activities(entrada)


response = (
  supabase
  .table("actividades_jsons")
  .insert([{"actividad_json": r} for r in resultados])
  .execute()
)
