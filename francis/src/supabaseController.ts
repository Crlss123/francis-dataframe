import { createClient } from '@supabase/supabase-js';
import { DayReport } from './apis/weather';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_KEY as string
);

interface Forecast {
  json: DayReport;
  request_id: number;
}

export async function createRequest() {
  try {
    const { data, error } = await supabase.from('requests').insert({}).select();
    const requestId = data?.[0]?.id ?? null;
    return requestId;
  } catch (error) {
    throw error;
  }
}

export async function createWeatherForecasts(forecasts: Forecast[]) {
  try {
    const { data, error } = await supabase.from('weather_forecasts').insert(forecasts);
  } catch (error) {
    throw error;
  }
}

export async function getActivities(request_id: Number) {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('request_id', request_id);

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getWeather(request_id: Number) {
  try {
    const { data, error } = await supabase
      .from('weather_forecasts')
      .select('*')
      .eq('request_id', request_id);

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getHotelActivities(request_id: Number) {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('request_id', request_id);

    return data;
  } catch (error) {
    throw error;
  }
}
