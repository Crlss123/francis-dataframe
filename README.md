# Francis-Dataframe

Tool para obtener un itinerario de las distintas experiencias que el usuario puede vivir, de acuerdo a los datos de entrada y los filtros que esta tenga.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## Usage

This tool implements the AI Spine universal contract and can be used with any AI Spine platform.

### Local Development

Start the development server:

```bash
npm run dev
```

The tool will be available at `http://localhost:3000` with the following endpoints:

- `GET /health` - Health check and tool metadata
- `POST /execute` - Execute the tool with input data

### Testing the Tool

You can test the tool using curl or any HTTP client:

```bash
# Health check
curl http://localhost:3000/health

# Execute the tool
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input_data": {
      "message": "Hello, World!"
    }
  }'
```

### Configuration

The tool can be configured using environment variables:

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `LOG_LEVEL` - Logging level (debug, info, warn, error)
- `API_KEY_AUTH` - Enable API key authentication (true/false)
- `VALID_API_KEYS` - Comma-separated list of valid API keys

### Deployment

#### Docker

Build and run with Docker:

```bash
# Build the image
docker build -t francis .

# Run the container
docker run -p 3000:3000 francis
```

#### Manual Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

#### AI Spine Platform

Deploy to the AI Spine platform:

```bash
npm run deploy
```

## Development

### Project Structure

```
francis/
├── src/
│   └── index.ts          # Main tool implementation
├── tests/
│   └── tool.test.ts      # Test files
├── Dockerfile                # Docker configuration
├── package.json            # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

### Adding Features

1. Update the tool schema in `src/index.ts`
2. Implement the new functionality in the `execute` function
3. Add tests for the new features
4. Update this README with usage examples

### Schema Definition

The tool uses a schema-based approach for input validation:

```typescript
schema: {
  input: {
    fieldName: stringField({
      required: true,
      description: 'Field description',
      // Additional validation options
    }),
  },
  config: {
    configField: apiKeyField({
      required: true,
      description: 'Configuration description',
    }),
  },
}
```

Available field types:
- `stringField()` - String input with validation
- `numberField()` - Numeric input with min/max validation
- `booleanField()` - Boolean true/false input
- `arrayField()` - Array of items
- `objectField()` - Object with properties
- `dateField()` - Date in YYYY-MM-DD format
- `timeField()` - Time in HH:MM format
- `apiKeyField()` - API key configuration field

## API Reference

### Health Check

**GET /health**

Returns tool metadata and health status.

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "tool_metadata": {
    "name": "francis",
    "description": "Tool para obtener un itinerario de las distintas experiencias que el usuario puede vivir, de acuerdo a los datos de entrada y los filtros que esta tenga.",
    "capabilities": ["..."]
  },
  "uptime_seconds": 1234,
  "last_execution": "2024-01-01T00:00:00Z"
}
```

### Execute Tool

**POST /execute**

Executes the tool with provided input data.

Request:
```json
{
  "input_data": {
    // Tool-specific input fields
  },
  "config": {
    // Optional configuration overrides
  },
  "execution_id": "optional-custom-id",
  "metadata": {
    // Optional metadata
  }
}
```

Response:
```json
{
  "execution_id": "exec_123",
  "status": "success",
  "output_data": {
    // Tool output
  },
  "execution_time_ms": 123,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## License

MIT License - see LICENSE file for details.

## Support

For support and documentation, visit [AI Spine Documentation](https://docs.ai-spine.com/tools).
=======
# 🏨📍 Francis - Agente de experiencias y tours

## 📌 Descripción
Francis es una herramienta que funciona como un **agente** para recomendar actividades y experiencias turísticas a huéspedes de hotel. 

Recibe un **JSON de entrada** con información del huésped y su estancia, incluyendo ciudad de destino, fechas, categoría de interés, presupuesto y hotel. Luego, obtiene información turística mediante **APIs externas** y **web scrapping**, los guarda en una base de datos para posteriormente recopilar y filtrar los resultados según criterios relevantes y devuelve un plan de actividades personalizado.

---
## ⚡ Ejemplo de ejecución
### Input de ejemplo

```json
{
  "input_data":{
    "city": "Cancun",
    "start_date": "2025-09-10",
    "end_date": "2025-09-12",
    "category": [
      "Deportes",
      "Parques"
    ],
    "price":1000,
    "hotel": "The Westin Resort & Spa Cancun"
  }
}
```
### Health Check

Para verificar que el servidor de la tool está funcionando correctamente, se puede ejecutar:

```bash
curl -X GET http://localhost:3000/health
```
Respuesta esperada:
```bash
{
    "status": "healthy",
    "version": "1.0.0",
    "tool_metadata": {
        "name": "francis",
        "description": "Tool used to obtain a experiences itinerary based on user input and filters.",
        "version": "1.0.0",
        "capabilities": ["text-processing"],
        "author": "Your Name",
        "tags": []
    },
    "capabilities": ["text-processing"],
    "uptime_seconds": 4,
    "error_rate_percent": 0,
    "avg_response_time_ms": 0,
    "checks": {
        "performance": {
            "status": "healthy",
            "metrics": {
                "avg_response_time_ms": 0,
                "error_rate_percent": 0,
                "requests_per_minute": 0,
                "memory_usage_mb": 17,
                "uptime_seconds": 4
            }
        },
        "tool_state": {
            "status": "healthy",
            "current_state": "running",
            "configuration_valid": false
        }
    },
    "system_info": {
        "node_version": "v22.11.0",
        "platform": "win32",
        "architecture": "x64",
        "pid": 29620
    },
    "health_check_duration_ms": 0,
    "timestamp": "2025-09-11T02:21:46.309Z"
}
```
### Solicitud de recomendaciones

Envía los datos de entrada para obtener recomendaciones de actividades:
```bash
curl -X POST http://localhost:3000/api/execute
  -H "Content-Type: application/json" 
  -d '{
  "input_data":{
    "city": "Cancun",
    "start_date": "2025-09-10",
    "end_date": "2025-09-12",
    "category": [
      "Deportes",
      "Parques"
    ],
    "price":1000,
    "hotel": "The Westin Resort & Spa Cancun"
  }
}'
```
Respuesta esperada:
```bash
{
  "execution_id": "e48951da-abf0-41de-adca-da1177a2245a",
  "status": "success",
  "output_data": {
    "output": [
      {
        "date": "2025-09-10",
        "activities": [
          {
            "activity": "Chichén Itzá Full-Day Tour with Mayan Buffet, Cenote & Valladolid",
            "description": "Chichén Itzá in Style: A Great Journey Through Time\n\nStep into the past with our Chichén Itzá tou...",
            "location": "Cancun",
            "price": "35",
            "url": "https://www.booking.com/attractions/mx/prwghutd4ejo-top-chichen-itza-full-day-tour-with-2-cenotes-valladolid-buffet.html",
            "time": "09:00-18:00",
            "weather": "Mist in the morning, Partly Cloudy in the afternoon"
          }
        ],
        "total_price": 35,
        "day_summary": "Enjoy a full-day tour to Chichén Itzá with a Mayan buffet, cenote visit, and Valladolid. Be prepared for mist in the morning and partly cloudy conditions in the afternoon."
      },
      {
        "date": "2025-09-11",
        "activities": [
          {
            "activity": "Chichen Itza, Cenote Sagrado and Valladolid from Cancun",
            "description": "Visit one of the 7 wonders of the modern world complemented by admission to a beautiful cenote in...",
            "location": "Cancun",
            "price": "29",
            "url": "https://www.booking.com/attractions/mx/prljmifh351j-chichen-itza-cenote-sagrado-and-valladolid-from-cancun.html",
            "time": "09:00-18:00",
            "weather": "Partly Cloudy in the morning and afternoon, Sunny in the late afternoon"
          }
        ],
        "total_price": 29,
        "day_summary": "Explore Chichen Itza, Cenote Sagrado, and Valladolid. Expect partly cloudy conditions throughout the day with sunny skies in the late afternoon."
      },
      {
        "date": "2025-09-12",
        "activities": [
          {
            "activity": "Early morning Chichen Itza Tour: Cenote and Tequila Tasting",
            "description": "Embark on an exclusive journey with us to uncover the marvels of Chichen Itza, a remarkable Mayan...",
            "location": "Cancun",
            "price": "28.86",
            "url": "https://www.booking.com/attractions/mx/prrpyizahee9-chichen-itza-cenote-and-valladolid-tour.html",
            "time": "06:30-16:00",
            "weather": "Overcast in the morning, Partly Cloudy in the afternoon, Thundery outbreaks in nearby in the late afternoon"
          }
        ],
        "total_price": 28.86,
        "day_summary": "Take an early morning tour of Chichen Itza with cenote and tequila tasting. Be aware of overcast conditions in the morning, partly cloudy skies in the afternoon, and potential thundery outbreaks in the late afternoon."
      }
    ],
    "metadata": {
      "execution_id": "e48951da-abf0-41de-adca-da1177a2245a",
      "timestamp": "2025-09-11T04:02:48.270Z",
      "tool_version": "1.0.0"
    }
  },
  "execution_time_ms": 110714.97934199999,
  "timestamp": "2025-09-11T04:04:38.878Z"
}
```
---
## 🔧 Estructura del Sistema

Todo el desarrollo de los agentes en **AI Spine** se hizo en **TypeScript** según los estándares del SDK. Para el **web scraping** y la **API de Booking.com**, se creó un **microservicio en Python** con **FastAPI** que procesa y expone la información de manera compatible, integrándola correctamente en la base de datos.

---
## 📦 Dependencias principales

### Dependencias principales (Node.js/TypeScript)

| Dependencia             | Propósito                                                                 |
|--------------------------|---------------------------------------------------------------------------|
| `@ai-spine/tools`        | Integración con el Agente conversacional AI Spine.                        |
| `@google/genai`          | Acceso a APIs de generación de contenido o análisis inteligente.          |
| `@supabase/supabase-js`  | Conexión a la base de datos Supabase para almacenar y recuperar datos.    |
| `axios`                  | Consumo de APIs externas para obtener información turística.              |
| `dotenv`                 | Manejo de variables de entorno (API keys, configuración de puerto, etc.). |

### Dependencias principales (Python)

| Dependencia             | Propósito                                                                 |
|--------------------------|---------------------------------------------------------------------------|
| `timezonefinder`         | Obtener la zona horaria de un destino a partir de sus coordenadas.        |
| `sentence-transformers`  | Generar embeddings de texto para filtrar y analizar similitud entre categorías y descripciones.   |
| `python-dotenv`          | Manejo de variables de entorno como API keys y configuración.    |
| `pydantic`               | Validación y manejo de modelos de datos de forma estructurada.            |

---

## 💾 Base de Datos

El sistema utiliza **Supabase** para gestionar la información turística, solicitudes de huéspedes y pronósticos climáticos de manera estructurada y confiable.  

### Tablas principales

| Tabla             | Propósito                                                                 |
|--------------------------|---------------------------------------------------------------------------|
| `requests`          | Solicitudes de los huéspedes (id, created_at).        |
| `activities`   | Actividades turísticas (URL, nombre, horarios, días, precio, descripción, rating).  |
|  `hotel_activities`         | Servicios y facilidades de cada hotel.  |
| `weather_forecasts`             | Pronósticos climáticos (fecha, hora, temperatura, condición).          |

---
## ⚙️ Cómo correr tests

1. **Instalar dependencias:**

```bash
npm install
```
2. **Ejecutar los tests:**
```bash
npm run test -- -t=“nombre de test“
```
---
## 🧩 Desafíos encontrados

Durante el desarrollo de la tool se identificaron varios retos que fueron abordados de distintas maneras:

1. **Obtención de datos desde múltiples fuentes:**  
   Integrar información de APIs externas y técnicas de web scraping resultó un desafío debido a la diversidad de formatos, estructuras y limitaciones de cada fuente.

2. **Filtrado y relevancia de recomendaciones:**  
   Diseñar un sistema que genere sugerencias útiles y personalizadas requirió definir criterios claros para priorizar y encontrar similitudes entre categorías de actividades y preferencias del usuario.

3. **Integración de nuevas tecnologías y LLMs (ej. Gemini):**  
   Incorporar modelos de lenguaje avanzados requirió adaptar flujos de procesamiento y entender cómo generar prompts eficientes para obtener resultados precisos.

4. **Adaptación al uso de AI Spine SDK:**  
   Aprender a integrar y comunicarse con la herramienta implicó adaptar lo ya avanzado, estudiar la documentación del SDK, manejar endpoints y estructurar correctamente las solicitudes y respuestas.
