import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
      throw new Error(`Weather API responded with status ${response.status}`)
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

    const googleWeatherUrl = `https://www.google.com/search?q=weather+in+${encodeURIComponent(weatherInfo.location)}`
    
    const message = `Weather in ${weatherInfo.location}:
Temperature: ${weatherInfo.temperature}°C (Feels like: ${weatherInfo.feelsLike}°C)
Conditions: ${weatherInfo.description}
Humidity: ${weatherInfo.humidity}%
Wind Speed: ${weatherInfo.windSpeed} km/h
Last Updated: ${weatherInfo.lastUpdated}

🔍 [View on Google Weather](${googleWeatherUrl})`

    return new Response(
      JSON.stringify({
        message,
        coordinates: weatherInfo.coordinates,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})