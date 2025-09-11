import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://api.weatherapi.com/v1';

export interface WeatherRequest {
  location: string;
  days: string[];
}

interface WeatherReport {
  dateAndHour: string;
  temperatureCelsius: string;
  condition: string;
}

export interface DayReport {
  date: string;
  hours: WeatherReport[];
}

export const getWeather = async (input: WeatherRequest) => {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid input: expected object with location and days');
  }

  const { location, days } = input;

  if (!location || typeof location !== 'string') {
    throw new Error('Invalid location: expected non-empty string');
  }

  if (!Array.isArray(days)) {
    throw new Error('Invalid days: expected array of date strings');
  }

  if (days.length === 0) {
    throw new Error('Days array cannot be empty');
  }

  const validDays = days.filter(day => day && typeof day === 'string' && day.trim().length > 0);

  if (validDays.length === 0) {
    throw new Error('No valid days found in the days array');
  }

  if (validDays.length !== days.length) {
    console.warn(`Filtered out ${days.length - validDays.length} invalid days`);
  }

  const weatherReports: DayReport[] = [];

  for (const day of validDays) {
    try {
      console.log(`Fetching weather for ${location} on ${day}`);

      const response = await fetch(
        `${BASE_URL}/forecast.json?key=${process.env.WEATHER_API_KEY}&q=${encodeURIComponent(location)}&dt=${day}`
      );

      if (!response.ok) {
        console.error(`API request failed for ${day}: ${response.status} ${response.statusText}`);
        continue;
      }

      const data: any = await response.json();

      if (!data.forecast?.forecastday?.[0]?.hour) {
        console.error(`Invalid forecast data structure for ${day}`);
        continue;
      }

      const dayReport: DayReport = {
        date: day,
        hours: data.forecast.forecastday[0].hour.map((hour: any) => ({
          dateAndHour: hour.time || 'Unknown time',
          temperatureCelsius: hour.temp_c ? `${hour.temp_c}°C` : 'Unknown temp',
          condition: hour.condition?.text || 'Unknown condition',
        })),
      };

      weatherReports.push(dayReport);
    } catch (error) {
      console.error(`Error processing day ${day}:`, error);
    }
  }

  return weatherReports;
};

export default getWeather;
