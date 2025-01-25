import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { location } = await req.json()
    console.log('Fetching weather for location:', location)

    const WEATHER_API_KEY = Deno.env.get('APILAYER_API_KEY')
    if (!WEATHER_API_KEY) {
      throw new Error('WEATHER_API_KEY is not configured')
    }

    const response = await fetch(
      `http://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&aqi=no`
    )

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Weather API response:', data)

    if (data.error) {
      throw new Error(data.error.message || 'Failed to fetch weather data')
    }

    // Format the weather data into a readable message
    const weatherInfo = {
      location: `${data.location.name}, ${data.location.country}`,
      temperature: data.current.temp_c,
      description: data.current.condition.text,
      humidity: data.current.humidity,
      windSpeed: data.current.wind_kph,
      feelsLike: data.current.feelslike_c,
      lastUpdated: data.current.last_updated,
      coordinates: {
        lat: data.location.lat,
        lon: data.location.lon,
      },
    }

    const message = `🌤️ Weather in ${weatherInfo.location}:
Temperature: ${weatherInfo.temperature}°C (Feels like: ${weatherInfo.feelsLike}°C)
Conditions: ${weatherInfo.description}
Humidity: ${weatherInfo.humidity}%
Wind Speed: ${weatherInfo.windSpeed} km/h
Last Updated: ${weatherInfo.lastUpdated}`

    return new Response(
      JSON.stringify({ 
        message,
        coordinates: weatherInfo.coordinates
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Weather function error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch weather data'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})