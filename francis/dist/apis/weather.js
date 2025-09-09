"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const BASE_URL = 'http://api.weatherapi.com/v1';
const getWeather = async (input) => {
    const { location, days } = input;
    const weatherReports = [];
    await Promise.all(days.map(async (day) => {
        const response = await fetch(`${BASE_URL}/forecast.json?key=${process.env.WEATHER_API_KEY}&q=${location}&dt=${day}`);
        if (!response.ok) {
            throw new Error('Failed to fetch weather data');
        }
        const data = await response.json();
        const dayReport = {
            date: day,
            hours: []
        };
        const forecast = data.forecast.forecastday[0].hour;
        forecast.map((hour) => {
            dayReport.hours.push({
                dateAndHour: hour.time,
                temperatureCelsius: `${hour.temp_c}°C`,
                condition: hour.condition.text
            });
        });
        weatherReports.push(dayReport);
    }));
    return weatherReports;
};
exports.default = getWeather;
//# sourceMappingURL=weather.js.map