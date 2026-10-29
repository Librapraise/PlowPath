import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface WeatherData {
  temp: number;
  condition: string;
  accumulation_rate_inches: number;
  alert?: string;
  updated_at: string;
}

export async function fetchWeatherAlerts(lat = 41.8781, lon = -87.6298): Promise<WeatherData> {
  const apiKey = env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    // Return mock data for development when API key is missing
    const tempChoices = [18, 22, 26, 30, 32];
    const mockTemp = tempChoices[Math.floor(Math.random() * tempChoices.length)];
    const mockRate = parseFloat((Math.random() * 1.5).toFixed(2)); // rate between 0 and 1.5 inches/hr
    const alertChoices = [
      'Winter Storm Warning: 4-8 inches expected tonight.',
      'Winter Weather Advisory: High winds and blowing snow.',
      'Heavy Snow Warning: Fast accumulation rates expected.',
      undefined,
    ];
    const mockAlert = alertChoices[Math.floor(Math.random() * alertChoices.length)];

    return {
      temp: mockTemp,
      condition: mockRate > 0 ? 'Snowing' : 'Overcast',
      accumulation_rate_inches: mockRate,
      alert: mockAlert,
      updated_at: new Date().toISOString(),
    };
  }

  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`,
      { timeout: 5000 },
    );
    const data = response.data;
    const temp = data.main?.temp ?? 32;
    const weather = data.weather?.[0]?.main ?? 'Clear';
    
    // Look for snow accumulation rate
    let accumulationRate = 0;
    if (weather.toLowerCase().includes('snow')) {
      accumulationRate = data.snow?.['1h'] ? (data.snow['1h'] / 25.4) : 0.2; // Convert mm to inches
    }

    // Determine alerts from API if present, or mock
    let alert: string | undefined;
    if (data.alerts && data.alerts.length > 0) {
      alert = data.alerts[0].event + ': ' + data.alerts[0].description;
    } else if (accumulationRate > 0.5) {
      alert = `Winter Weather Alert: Active snowfall at ${accumulationRate.toFixed(2)} inches/hour.`;
    }

    return {
      temp: Math.round(temp),
      condition: weather,
      accumulation_rate_inches: parseFloat(accumulationRate.toFixed(2)),
      alert,
      updated_at: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('Error fetching weather from OpenWeather API, falling back to mock:', err);
    return {
      temp: 28,
      condition: 'Snowing (Fallback)',
      accumulation_rate_inches: 0.5,
      alert: 'Winter Storm Warning: API connection fallback active.',
      updated_at: new Date().toISOString(),
    };
  }
}
