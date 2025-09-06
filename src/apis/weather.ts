import 'dotenv/config';

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

interface DayReport {
  date: string;
  hours: WeatherReport[];
}

const getWeather = async (input: WeatherRequest) => {
  const { location, days } = input;

  const weatherReports: DayReport[] = [];

  await Promise.all(
    days.map(async day => {
      const response = await fetch(
        `${BASE_URL}/forecast.json?key=${process.env.WEATHER_API_KEY}&q=${location}&dt=${day}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }
      const data: any = await response.json();
      const dayReport: DayReport = {
        date: day,
        hours: []
      };
      const forecast = data.forecast.forecastday[0].hour;
      forecast.map((hour:any) => {
        dayReport.hours.push({
          dateAndHour: hour.time,
          temperatureCelsius: `${hour.temp_c}°C`,
          condition: hour.condition.text
        });
      });
      weatherReports.push(dayReport);
    })
  );

  return weatherReports;
};

export default getWeather;
