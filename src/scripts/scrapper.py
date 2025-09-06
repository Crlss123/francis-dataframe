from googlesearch import search
import networkx as nx
import requests, certifi, os
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from google import genai
from markdownify import markdownify
from dotenv import load_dotenv
from pydantic import BaseModel
import time
import json

# Soluciones
# - escraear paginas especificas

class Actividad(BaseModel):
  url: str
  nombre_de_actividad:str
  descripcion:str
  horarios: list[str]
  fechas: list[str]
  precio:float
  numero_de_personas:int
  solicitudes_especiales: list[str]

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
KEYWORDS = ["cartelera", "agenda", "eventos", "programacion", "actividades"]

input = {
  "actividad":["Visita a museo", "Obras de teatro"], # Scrapper
  "horarios":["15:00"], # Sys
  "ubicacion":"Hermosillo, Sonora", # Scrapper
  "solicitudes_especiales":[], # Sys
  "precio":1000, # Sys
  "dias":"09-01-2025" # Sys
}

def buscar_google_y_crawling(ciudad, actividades):

  urls=[]
  htmls = []

  for actividad in actividades:
    query = f"{actividad} {ciudad} (cartelera OR agenda OR eventos OR programación)"
    urls_actividad = set(search(query, num_results=10, lang="es"))
    urls.extend(urls_actividad)

  urls_filtradas = [u for u in urls if any(k in u.lower() for k in KEYWORDS)]
  urls_finales = set(urls_filtradas)

  session = requests.Session()
  headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"}

  for url in urls:
    if url in urls_finales:
        continue
    try:
      resp = session.get(url, headers=headers, timeout=5, verify=certifi.where())
      htmls.append(resp.text)
      soup = BeautifulSoup(resp.text, "html.parser")
      for a in soup.find_all("a", href=True):
        link = a["href"].lower()
        if any(k in link for k in KEYWORDS):
          full_url = urljoin(url, a["href"])
          resp_new = session.get(full_url, headers=headers, timeout=5, verify=certifi.where())
          htmls.append(resp_new.text)
    except Exception as e:
      print(f"Error con {url}: {e}")
      continue

  return list(htmls)

# for url in urls_finales:
#   try:
#     print(url)
#     source = session.get(url, timeout=5, verify=certifi.where(), headers=headers)
#     htmls.add(source.text)
#     soup = BeautifulSoup(source.text, "html.parser")
#     enlaces = soup.find_all("a", href=True)

#     for a in enlaces:
#       link = a["href"]
#       parsed = urlparse(link)

#       if parsed.scheme and parsed.netloc:
#         full_url = link
#       else:
#         full_url = urljoin(url, a['href'])

#       if full_url != url:
#         new_source = session.get(full_url, timeout=5, verify=certifi.where(), headers=headers)
#         htmls.add(new_source.text)

#   except requests.exceptions.SSLError:
#     print(f"Ignorando {url} con SSL roto")
#     continue
#   except requests.exceptions.ConnectionError:
#     print(f"No se pudo conectar a {url}")
#     continue
#   except requests.exceptions.MissingSchema:
#     print(f"Schema faltante en {url}")
#     continue
#   except requests.exceptions.InvalidSchema:
#     print(f"Schema invalido en {url}")
#     continue
#   except requests.exceptions.ReadTimeout:
#     print(f"{url} dio timeout")
#     continue

htmls = buscar_google_y_crawling(ciudad=input["ubicacion"], actividades=input["actividad"])
resultados = []

for source in htmls:
  markdown = markdownify(source)
  response = client.models.generate_content(
    model="gemini-2.0-lite",
    contents=f"""

          Eres un extractor de datos especializado en páginas web en formato markdown.
          Tu tarea es analizar el siguiente markdown de una página que describe una actividad y devolver
          los datos solicitados en formato JSON con esta estructura exacta:

          {{
            "url": ...,
            "actividad": ...,
            "descripcion": ...,
            "horarios": ...,
            "fechas": ...,
            "precio": ...,
            "tratos_especiales": ...
          }}

          Reglas:
          1. Cada campo debe completarse exactamente como aparece en el markdown.
          2. Si un campo no se encuentra explícitamente, asigna `None`.
          3. La descripción debe ser breve (1 a 4 oraciones) y resumir la esencia de la actividad.
          4. Para `horarios` y `fechas`, busca palabras clave como "horarios", "fechas", "disponibilidad", y registra los valores textuales tal como aparecen.
          5. En `tratos_especiales` incluye únicamente información explícita sobre accesibilidad, intérprete de señas, descuentos u otros servicios especiales. Si no se menciona ninguno, asigna `None`.
          6. No inventes información; si no hay datos útiles, todos los campos deben ser `None`.
          7. Mantén el formato JSON limpio y válido, sin comentarios ni notas adicionales.

          Markdown a analizar:
          Contenido markdown: {markdown}

    """,
    config={
      "response_mime_type": "application/json",
      "response_schema": Actividad
    }
  )
  resultados.append(response.parsed)
  time.sleep(4)


for i in resultados:
  data = i.model_dump()
  print("-----")
  for key, value in data.items():
    print(f"{key}: {value}")
