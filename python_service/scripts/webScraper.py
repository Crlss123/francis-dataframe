import os
from typing import List, Dict, Optional, Set
import logging
from dataclasses import dataclass
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


_genai_client = None
_requests_session = None

class Actividad(BaseModel):
    url: str
    nombre_de_actividad: str
    descripcion: str
    horarios: List[str]
    fechas: List[str]
    precio: float
    solicitudes_especiales: List[str]

@dataclass
class ScrapingConfig:
    max_workers: int = 2
    request_delay: int = 3
    timeout: int = 10
    max_urls_per_activity: int = 8
    gemini_model: str = "gemini-1.5-flash"

def get_genai_client():
    global _genai_client
    if _genai_client is None:
        from google import genai
        _genai_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        logger.info("Google GenAI client loaded")
    return _genai_client

def get_requests_session():
    global _requests_session
    if _requests_session is None:
        import requests
        _requests_session = requests.Session()
        _requests_session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        })
        logger.info("Requests session loaded")
    return _requests_session

def lazy_search_google(query, num=8, pause=2.0):
    from googlesearch import search
    import time
    return search(query, num=num, stop=num, pause=pause, lang='es')

def lazy_parse_html(content):
    from bs4 import BeautifulSoup
    return BeautifulSoup(content, 'html.parser')

def lazy_markdownify(html_content, heading_style="ATX"):
    from markdownify import markdownify
    return markdownify(html_content, heading_style=heading_style)

class DynamicEventScraper:
    def __init__(self, config: ScrapingConfig = None):
        self.config = config or ScrapingConfig()
        self.processed_urls: Set[str] = set()

        self.api_endpoints = {
            "eventbrite": "https://www.eventbriteapi.com/v3/events/search/",
            "meetup": "https://api.meetup.com/find/upcoming_events",
            "ticketmaster": "https://app.ticketmaster.com/discovery/v2/events.json"
        }

        self.patrones_busqueda = {
            "museo": ["museum", "museo", "gallery", "galeria", "exhibition", "exposicion"],
            "teatro": ["theatre", "teatro", "theater", "obra", "play", "drama"],
            "concierto": ["concert", "concierto", "music", "musica", "live music"],
            "festival": ["festival", "event", "evento", "celebration"],
            "deportes": ["sports", "deportes", "game", "match", "partido"],
            "gastronomia": ["food", "restaurant", "gastronomia", "culinary", "cooking"],
            "general": ["events", "eventos", "activities", "actividades", "things to do"]
        }
        logger.info("DynamicEventScraper initialized (lazy loading enabled)")

    def detectar_tipo_actividad(self, actividad: str) -> List[str]:
        actividad_lower = actividad.lower()
        terminos = []

        for tipo, palabras_clave in self.patrones_busqueda.items():
            if any(palabra in actividad_lower for palabra in palabras_clave):
                terminos.extend(palabras_clave[:3])

        if not terminos:
            terminos = self.patrones_busqueda["general"]

        return list(set(terminos))

    def generar_queries_busqueda(self, actividad: str, ciudad: str) -> List[str]:
        terminos = self.detectar_tipo_actividad(actividad)
        ciudad_limpia = ciudad.split(',')[0].strip()

        queries = []

        patrones = [
            f'"{actividad}" {ciudad_limpia} events',
            f'"{actividad}" {ciudad_limpia} agenda',
            f'{terminos[0]} {ciudad_limpia} calendar',
            f'{terminos[0]} {ciudad_limpia} schedule',
            f'what to do {ciudad_limpia} {terminos[0]}',
            f'{ciudad_limpia} {actividad} tickets',
            f'{ciudad_limpia} cultural events {terminos[0]}',
            f'eventos {ciudad_limpia} {actividad}',
        ]

        sitios_globales = [
            f'site:eventbrite.com "{actividad}" {ciudad_limpia}',
            f'site:facebook.com/events "{actividad}" {ciudad_limpia}',
            f'site:meetup.com {terminos[0]} {ciudad_limpia}',
            f'site:ticketmaster.com {terminos[0]} {ciudad_limpia}',
            f'site:timeout.com {ciudad_limpia} {terminos[0]}',
        ]

        queries.extend(patrones[:6])
        queries.extend(sitios_globales[:4])

        return queries

    def buscar_urls_con_google(self, actividad: str, ciudad: str) -> List[str]:
        import time

        urls_encontradas = set()
        queries = self.generar_queries_busqueda(actividad, ciudad)

        logger.info(f"Ejecutando {len(queries)} búsquedas para '{actividad}' en {ciudad}")

        for i, query in enumerate(queries):
            try:
                logger.info(f"Búsqueda {i+1}: {query}")
                resultados = lazy_search_google(
                    query,
                    num=self.config.max_urls_per_activity,
                    pause=2.0
                )

                for url in resultados:
                    if self._es_url_valida(url):
                        urls_encontradas.add(url)

                time.sleep(self.config.request_delay)

            except Exception as e:
                logger.warning(f"Error en búsqueda '{query}': {e}")
                continue

        logger.info(f"Total URLs encontradas: {len(urls_encontradas)}")
        return list(urls_encontradas)

    def _es_url_valida(self, url: str) -> bool:
        from urllib.parse import urlparse

        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                return False

            filtros_negativos = [
                'google.com', 'youtube.com/watch', 'instagram.com/p/',
                'twitter.com/status', 'linkedin.com/posts',
                'whatsapp.com', 'mailto:', 'tel:', 'javascript:',
                '.pdf', '.jpg', '.png', '.gif', '.zip', '.doc',
                'login', 'signup', 'register', 'cart', 'checkout'
            ]

            indicadores_positivos = [
                'event', 'calendar', 'schedule', 'agenda', 'ticket',
                'show', 'concert', 'museum', 'theater', 'festival',
                'activities', 'things-to-do', 'what-to-do',
                'cultura', 'eventos', 'espectaculo'
            ]

            url_lower = url.lower()

            if any(filtro in url_lower for filtro in filtros_negativos):
                return False

            if any(indicador in url_lower for indicador in indicadores_positivos):
                return True

            dominios_buenos = [
                'eventbrite.com', 'meetup.com', 'facebook.com/events',
                'ticketmaster.com', 'timeout.com', 'tripadvisor.com',
                'yelp.com', 'foursquare.com', 'allevents.in'
            ]

            if any(dominio in url_lower for dominio in dominios_buenos):
                return True

            return False

        except:
            return False

    def extraer_contenido_inteligente(self, url: str) -> Optional[str]:
        if url in self.processed_urls:
            return None

        self.processed_urls.add(url)

        try:
            logger.info(f"Extrayendo contenido de: {url}")
            session = get_requests_session()
            response = session.get(url, timeout=self.config.timeout)
            response.raise_for_status()

            soup = lazy_parse_html(response.content)

            contenido_estructurado = self._extraer_json_ld(soup)
            if contenido_estructurado:
                return contenido_estructurado

            contenido_microdata = self._extraer_microdata(soup)
            if contenido_microdata:
                return contenido_microdata

            contenido_eventos = self._extraer_contenido_eventos_avanzado(soup)
            if contenido_eventos:
                return contenido_eventos

            return self._extraer_contenido_general_filtrado(soup)

        except Exception as e:
            logger.warning(f"Error extrayendo contenido de {url}: {e}")
            return None

    def _extraer_json_ld(self, soup) -> Optional[str]:
        import json

        scripts = soup.find_all('script', {'type': 'application/ld+json'})
        eventos_estructurados = []

        for script in scripts:
            try:
                data = json.loads(script.string)
                eventos = self._encontrar_eventos_en_json(data)
                if eventos:
                    eventos_estructurados.extend(eventos)
            except:
                continue

        if eventos_estructurados:
            return self._formatear_eventos_estructurados(eventos_estructurados)

        return None

    def _encontrar_eventos_en_json(self, data) -> List[dict]:
        eventos = []

        def buscar_eventos(obj):
            if isinstance(obj, dict):
                if obj.get('@type') in ['Event', 'TheaterEvent', 'MusicEvent', 'SportsEvent']:
                    eventos.append(obj)
                for value in obj.values():
                    buscar_eventos(value)
            elif isinstance(obj, list):
                for item in obj:
                    buscar_eventos(item)

        buscar_eventos(data)
        return eventos

    def _formatear_eventos_estructurados(self, eventos: List[dict]) -> str:
        contenido = "# Eventos Encontrados\n\n"

        for evento in eventos:
            contenido += f"## {evento.get('name', 'Evento sin nombre')}\n"
            contenido += f"**Descripción:** {evento.get('description', 'No disponible')}\n"

            fecha_inicio = evento.get('startDate', '')
            fecha_fin = evento.get('endDate', '')
            if fecha_inicio:
                contenido += f"**Fecha inicio:** {fecha_inicio}\n"
            if fecha_fin:
                contenido += f"**Fecha fin:** {fecha_fin}\n"

            location = evento.get('location', {})
            if isinstance(location, dict):
                lugar = location.get('name', '')
                direccion = location.get('address', '')
                if lugar:
                    contenido += f"**Lugar:** {lugar}\n"
                if direccion:
                    contenido += f"**Dirección:** {direccion}\n"

            offers = evento.get('offers', {})
            if isinstance(offers, dict):
                precio = offers.get('price', '')
                if precio:
                    contenido += f"**Precio:** {precio}\n"

            contenido += "\n---\n\n"

        return contenido

    def _extraer_microdata(self, soup) -> Optional[str]:
        import re

        elementos_evento = soup.find_all(attrs={"itemtype": re.compile(r".*Event")})
        if not elementos_evento:
            return None

        contenido = "# Eventos (Microdata)\n\n"
        for elemento in elementos_evento:
            nombre = elemento.find(attrs={"itemprop": "name"})
            descripcion = elemento.find(attrs={"itemprop": "description"})
            fecha = elemento.find(attrs={"itemprop": "startDate"})
            lugar = elemento.find(attrs={"itemprop": "location"})

            if nombre:
                contenido += f"## {nombre.get_text(strip=True)}\n"
            if descripcion:
                contenido += f"**Descripción:** {descripcion.get_text(strip=True)}\n"
            if fecha:
                contenido += f"**Fecha:** {fecha.get('datetime', fecha.get_text(strip=True))}\n"
            if lugar:
                contenido += f"**Lugar:** {lugar.get_text(strip=True)}\n"
            contenido += "\n---\n\n"

        return contenido if len(contenido) > 50 else None

    def _extraer_contenido_eventos_avanzado(self, soup) -> Optional[str]:
        for elemento in soup(['script', 'style', 'nav', 'footer', 'aside', 'header']):
            elemento.decompose()

        contenido_eventos = []

        selectores_eventos = [
            '[class*="event"]', '[class*="Event"]',
            '[class*="activity"]', '[class*="Activity"]',
            '[id*="event"]', '[id*="Event"]',
            '.card', '.listing', '.item',
            '[class*="show"]', '[class*="performance"]'
        ]

        for selector in selectores_eventos:
            elementos = soup.select(selector)
            for elemento in elementos:
                texto = elemento.get_text(strip=True)
                if len(texto) > 100 and self._contiene_info_evento(texto):
                    contenido_eventos.append(str(elemento))

        if contenido_eventos:
            html_combinado = '\n'.join(contenido_eventos[:5])  # Limitar a 5 elementos
            return lazy_markdownify(html_combinado, heading_style="ATX")

        return None

    def _contiene_info_evento(self, texto: str) -> bool:
        texto_lower = texto.lower()

        palabras_evento = [
            'fecha', 'date', 'horario', 'time', 'hour',
            'lugar', 'location', 'venue', 'address',
            'precio', 'price', 'ticket', 'entrada',
            'evento', 'event', 'show', 'performance',
            'museo', 'museum', 'teatro', 'theater',
            'concierto', 'concert', 'festival'
        ]

        coincidencias = sum(1 for palabra in palabras_evento if palabra in texto_lower)
        return coincidencias >= 2

    def _extraer_contenido_general_filtrado(self, soup) -> str:
        import re  # Lightweight import

        contenido_principal = soup.find('main') or soup.find('article') or soup.find('div', class_=re.compile(r'content|main'))

        if not contenido_principal:
            contenido_principal = soup.find('body')

        if contenido_principal:
            for elemento in contenido_principal(['script', 'style', 'nav', 'footer', 'aside']):
                elemento.decompose()

            return lazy_markdownify(str(contenido_principal), heading_style="ATX")

        return lazy_markdownify(str(soup), heading_style="ATX")

    def procesar_contenido_con_ia(self, contenido: str, url: str) -> Optional[Actividad]:
        try:
            contenido_limitado = contenido[:6000]

            prompt = f"""
            Analiza el siguiente contenido de la URL: {url}

            Extrae información sobre UN evento/actividad específica siguiendo estas reglas estrictas:

            1. Si hay múltiples eventos, elige el más completo o relevante
            2. Todos los campos son OBLIGATORIOS:
               - url: usar la URL proporcionada
               - nombre_de_actividad: nombre específico del evento (no genérico)
               - descripcion: 2-3 oraciones describiendo el evento
               - horarios: lista de horarios encontrados (formato "HH:MM")
               - fechas: lista de fechas encontradas (formato "YYYY-MM-DD" si es posible)
               - precio: precio numérico (usar 0.0 si es gratis)
               - solicitudes_especiales: servicios especiales mencionados

            3. Si NO encuentras información suficiente para crear un evento válido, responde con null
            4. NO inventes información que no esté en el contenido
            5. Los nombres de actividades deben ser específicos, no genéricos como "evento" o "actividad"

            Contenido a analizar:
            {contenido_limitado}
            """

            client = get_genai_client()
            response = client.models.generate_content(
                model=self.config.gemini_model,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": Actividad
                }
            )

            if response.parsed:
                actividad = response.parsed
                if (actividad.nombre_de_actividad and
                    len(actividad.nombre_de_actividad.strip()) > 3 and
                    actividad.nombre_de_actividad.lower() not in ['none', 'null', 'n/a', 'evento', 'actividad']):
                    return actividad

            return None

        except Exception as e:
            logger.error(f"Error procesando contenido con IA para {url}: {e}")
            return None

    def scraping_completo(self, input_data: Dict) -> List[Dict]:
        import time

        logger.info(f"=== INICIANDO SCRAPING DINÁMICO ===")
        logger.info(f"Ubicación: {input_data['city']}")
        logger.info(f"Actividades: {input_data['category']}")

        todas_las_urls = set()

        for actividad in input_data["category"]:
            logger.info(f"\n--- Buscando URLs para: {actividad} ---")
            urls_actividad = self.buscar_urls_con_google(actividad, input_data["city"])
            todas_las_urls.update(urls_actividad)
            logger.info(f"URLs encontradas para '{actividad}': {len(urls_actividad)}")

        if len(todas_las_urls) == 0:
            logger.warning("No se encontraron URLs con búsquedas, usando método alternativo...")
            urls_alternativas = self._buscar_urls_alternativo(input_data)
            todas_las_urls.update(urls_alternativas)
            logger.info(f"URLs encontradas con método alternativo: {len(urls_alternativas)}")

        urls_finales = list(todas_las_urls)[:15]  # Limitar a 15 URLs para eficiencia
        logger.info(f"\n=== PROCESANDO {len(urls_finales)} URLs FINALES ===")

        if not urls_finales:
            logger.error("No se encontraron URLs para procesar")
            return []

        resultados = []
        for i, url in enumerate(urls_finales, 1):
            logger.info(f"\nProcesando URL {i}/{len(urls_finales)}: {url}")

            try:
                contenido = self.extraer_contenido_inteligente(url)
                if not contenido or len(contenido.strip()) < 200:
                    logger.warning(f"Contenido insuficiente en {url}")
                    continue

                resultado = self.procesar_contenido_con_ia(contenido, url)
                if resultado:
                    resultados.append(resultado.model_dump())
                    logger.info(f"Evento extraído: {resultado.nombre_de_actividad}")
                else:
                    logger.warning(f"No se pudo extraer evento válido de {url}")

            except Exception as e:
                logger.error(f"Error procesando {url}: {e}")

            time.sleep(self.config.request_delay)

        logger.info(f"\n=== SCRAPING COMPLETADO ===")
        logger.info(f"Total de eventos extraídos: {len(resultados)}")

        return resultados

    def _buscar_urls_alternativo(self, input_data: Dict) -> Set[str]:
        from urllib.parse import urljoin  # Lightweight import
        import time

        urls = set()
        ciudad = input_data["city"].split(',')[0].strip()

        urls_base = [
            f"https://www.google.com/search?q=eventos+{ciudad}+museo+teatro",
            f"https://www.facebook.com/search/top?q=eventos%20{ciudad}",
            f"https://www.eventbrite.com.mx/d/mexico--{ciudad.lower()}/all-events/",
        ]

        for url_base in urls_base:
            try:
                session = get_requests_session()
                response = session.get(url_base, timeout=self.config.timeout)
                soup = lazy_parse_html(response.content)

                enlaces = soup.find_all('a', href=True)
                for enlace in enlaces:
                    href = enlace['href']

                    if href.startswith('/url?q='):
                        href = href.split('/url?q=')[1].split('&')[0]
                    elif href.startswith('/'):
                        href = urljoin(url_base, href)

                    if href.startswith('http') and self._es_url_valida(href):
                        urls.add(href)

                time.sleep(2)

            except Exception as e:
                logger.warning(f"Error en búsqueda alternativa {url_base}: {e}")
                continue

        urls_fallback = self._generar_urls_fallback(ciudad)
        urls.update(urls_fallback)

        return urls

    def _generar_urls_fallback(self, ciudad: str) -> Set[str]:
        urls = set()
        ciudad_lower = ciudad.lower()

        patrones_url = [
            f"https://www.tripadvisor.com/Attractions-g150765/Activities-{ciudad}.html",
            f"https://www.timeout.com/{ciudad_lower}/things-to-do",
            f"https://foursquare.com/explore?near={ciudad}",
            f"https://www.yelp.com/{ciudad_lower}/events",
        ]

        if ciudad_lower in ["hermosillo", "culiacan", "guadalajara", "mexico city", "tijuana"]:
            urls_mx = [
                f"https://dondeir.com/ciudad/{ciudad_lower}",
                f"https://www.informador.mx/jalisco/{ciudad_lower}/",
                f"https://www.elimparcial.com/{ciudad_lower}/",
            ]
            patrones_url.extend(urls_mx)

        for patron in patrones_url:
            urls.add(patron)

        return urls


config = ScrapingConfig(
    max_workers=2,
    request_delay=2,
    timeout=15,
    max_urls_per_activity=6,
    gemini_model="gemini-1.5-flash"
)
scraper = DynamicEventScraper(config)
