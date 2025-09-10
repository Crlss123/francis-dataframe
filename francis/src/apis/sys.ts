import { apiKeyField } from '@ai-spine/tools';
import { getActivities, getHotelActivities, getWeather } from '../supabaseController';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { FrancisInput } from '..';
dotenv.config();

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function runSystem(requestId: Number, originalInput: FrancisInput) {
  const activities = await getActivities(requestId);
  const hotelActivities = await getHotelActivities(requestId);
  const weatherForecasts = await getWeather(requestId);

  // console.log(activities);
  // console.log(hotelActivities);
  // console.log(weatherForecasts);

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `
      Eres un experto en planificación de itinerarios turísticos. Necesito que generes un itinerario personalizado basado en la siguiente información:

      *DATOS DISPONIBLES:*

      *Actividades Externas Disponibles:*
      ${activities}

      *Pronóstico del Clima:*
      ${weatherForecasts}

      *Facilidades del Hotel:*
      ${hotelActivities}

      *PREFERENCIAS DEL CLIENTE:*
      •⁠  ⁠Presupuesto máximo: ${originalInput.price || 'Sin límite'}
      •⁠  ⁠Tipos de actividades preferidas: ${originalInput.category.join(', ')}
      •⁠  ⁠Fecha de inicio: ${originalInput.start_date}
      •⁠  ⁠Fecha de fin: ${originalInput.end_date}
      •⁠  Ciudad de hospedaje: ${originalInput.city}

      ## CONTEXTO DEL PROYECTO:
      Estás trabajando para un sistema de recomendaciones de hotel que combina:
      - Actividades disponibles en la ciudad donde se hospeda el huesped
      - Facilidades y servicios del hotel
      - Condiciones climáticas en tiempo real
      - Preferencias y presupuesto del huésped

      ## INSTRUCCIONES CRÍTICAS:

      ### 1. ANÁLISIS DEL CLIMA:
      - Revisa DETALLADAMENTE la información del clima hora por hora
      - Clasifica las actividades según compatibilidad climática:
        * ACTIVIDADES AL AIRE LIBRE (ejemplos: hiking, tours en barco, deportes acuáticos, golf, tenis exterior, etc.)
        * ACTIVIDADES CUBIERTAS (ejemplos: museos, spas, restaurantes, centros comerciales, espectáculos, etc.)
      - Si llueve (rain/shower en condition): NO recomiendes actividades al aire libre
      - Si está soleado/parcialmente nublado: prioriza actividades al aire libre cuando sea apropiado
      - Si hay condiciones adversas: enfócate en actividades interiores

      ### 2. GESTIÓN DE ACTIVIDADES:
      - **ACTIVIDADES DE CIUDAD**: Usa la información de la base de datos
      - **FACILIDADES DEL HOTEL**: Usa la lista de facilities del hotel encontrada en la base de datos
      - NO sobrelapes horarios de actividades
      - Crea un flujo lógico: mañana → tarde → noche

      ### 3. ESTRUCTURA DEL ITINERARIO:
      - Divide cada día en: mañana (9:00-12:00), tarde (12:00-18:00), noche (18:00-23:00)
      - Asigna duraciones realistas a cada actividad
      - Considera desplazamientos y tiempos de descanso

      ### 4. PRESUPUESTO:
      - Respeta el límite de precio por actividad

      ## OBJETIVO FINAL:
      Crear un itinerario balanceado, realista y adaptado al clima que maximice la experiencia del huésped, respetando su presupuesto y preferencias.

      **SOLAMENTE UTILIZA LA INFORMACION ALMACENADA EN LA BASE DE DATOS, EN CASO DE NO ENCONTRAR LA INFORMACION NECESARIA DEJALO VACIO (NO INVENTES INFORMACION).**
      `,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: {
              type: Type.STRING,
            },
            activities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  url: {
                    type: Type.STRING,
                  },
                  time: {
                    type: Type.STRING,
                  },
                  activity: {
                    type: Type.STRING,
                  },
                  description: {
                    type: Type.STRING,
                  },
                  price: {
                    type: Type.STRING,
                  },
                  location: {
                    type: Type.STRING,
                  },
                  weather: {
                    type: Type.STRING,
                  },
                },
              },
            },
            total_price: {
              type: Type.NUMBER,
            },
            day_summary: {
              type: Type.STRING,
            },
          },
        },
        propertyOrdering: ['date', 'activity', 'total_price', 'day_summary'],
      },
    },
  });

  return response.text;
}
