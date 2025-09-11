import { apiKeyField } from '@ai-spine/tools';
import { getActivities, getHotelActivities, getWeather } from '../supabaseController';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { FrancisInput } from '..';
import { parse } from 'path';
dotenv.config();

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function runSystem(requestId: Number, originalInput: FrancisInput) {
  const activities = await getActivities(requestId);
  const weatherForecasts = await getWeather(requestId);
  const hotelActivities = await getHotelActivities(requestId);

  // Validar que tenemos datos
  if (!activities || activities.length === 0) {
    throw new Error('No hay actividades disponibles para generar el itinerario');
  }

  if (!weatherForecasts || weatherForecasts.length === 0) {
    throw new Error('No hay pronóstico del clima disponible');
  }

  const prompt = `
ERES UN ASISTENTE DE ITINERARIOS TURÍSTICOS. DEBES SEGUIR ESTAS REGLAS ESTRICTAMENTE:

**REGLA CRÍTICA**: SOLO puedes usar las actividades exactas del JSON "ACTIVIDADES_DISPONIBLES", "ACTIVIDADES DEL HOTEL EN EL QUE SE ALOJA EL USUARIO" y el clima del JSON "PRONOSTICO_CLIMA". NO INVENTES actividades.

**DATOS DISPONIBLES:**

ACTIVIDADES_DISPONIBLES:
${JSON.stringify(activities, null, 2)}

ACTIVIDADES DEL HOTEL EN EL QUE SE ALOJA EL USUARIO:
${JSON.stringify(hotelActivities, null, 2)}

PRONOSTICO_CLIMA:
${JSON.stringify(weatherForecasts, null, 2)}

**INFORMACIÓN DEL CLIENTE:**
- Presupuesto máximo: ${originalInput.price || 'Sin límite especificado'}
- Categorías preferidas: ${originalInput.category.join(', ')}
- Fecha inicio: ${originalInput.start_date}
- Fecha fin: ${originalInput.end_date}
- Ciudad: ${originalInput.city}

**INSTRUCCIONES OBLIGATORIAS:**

1. **USAR SOLO DATOS PROPORCIONADOS**:
   - SOLAMENTE usa actividades de los JSONs "ACTIVIDADES_DISPONIBLES" y "ACTIVIDADES DEL HOTEL EN EL QUE SE ALOJA EL USUARIO"
   - Copia EXACTAMENTE: name, description, location, price, url de cada actividad
   - NO modifiques nombres ni descripciones
   - NO inventes nuevas actividades

2. **ANÁLISIS DEL CLIMA**:
   - Revisa el pronóstico hora por hora del JSON "PRONOSTICO_CLIMA"
   - Actividades al aire libre: NO recomiendes si hay lluvia (rain/shower)
   - Actividades cubiertas: siempre disponibles
   - Ajusta horarios según condiciones climáticas

3. **ESTRUCTURA DEL ITINERARIO**:
   - Un día por cada fecha entre start_date y end_date
   - Divide en franjas: mañana (09:00-12:00), tarde (12:00-18:00), noche (18:00-23:00)
   - Máximo 3 actividades por día
   - NO sobrelapes horarios

4. **FORMATO DE RESPUESTA**:
   - Para cada actividad usa EXACTAMENTE los campos del JSON original
   - En "weather" indica: las condiciones climáticas del pronóstico para esa hora
   - En "time" indica: rango horario (ej: "09:00-11:00")

5. **PRESUPUESTO**:
   - Respeta el límite por actividad si se especifica
   - Calcula total_price sumando precios del día

**EJEMPLO DE MAPEO CORRECTO:**
Si en ACTIVIDADES_DISPONIBLES tienes:
{
  "name": "Museo XYZ",
  "description": "Un museo increíble...",
  "location": "Centro",
  "price": 150,
  "url": "https://ejemplo.com"
}

Úsalo EXACTAMENTE así en el itinerario:
{
  "activity": "Museo XYZ",
  "description": "Un museo increíble...",
  "location": "Centro",
  "price": "150",
  "url": "https://ejemplo.com",
  "time": "09:00-11:00",
  "weather": "soleado"
}

**RECORDATORIO FINAL**: NO inventes nombres de lugares, NO cambies descripciones, NO agregues actividades que no estén en el JSON. SOLO usa los datos exactos proporcionados.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.1,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              activities: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    activity: { type: Type.STRING },
                    description: { type: Type.STRING },
                    location: { type: Type.STRING },
                    price: { type: Type.STRING },
                    url: { type: Type.STRING },
                    time: { type: Type.STRING },
                    weather: { type: Type.STRING },
                  },
                  required: [
                    'activity',
                    'description',
                    'location',
                    'price',
                    'url',
                    'time',
                    'weather',
                  ],
                },
              },
              total_price: { type: Type.NUMBER },
              day_summary: { type: Type.STRING },
            },
            required: ['date', 'activities', 'total_price', 'day_summary'],
          },
        },
      },
    });

    // Parsear la respuesta JSON
    let parsedResponse;
    try {
      const responseText = response.text;
      if (!responseText) {
        throw new Error('El modelo no devolvió ninguna respuesta');
      }
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('El modelo devolvió JSON inválido');
    }

    return parsedResponse;
  } catch (error) {
    console.error('Error en runSystem:', error);
    return {
      success: false,
      data: null,
    };
  }
}
