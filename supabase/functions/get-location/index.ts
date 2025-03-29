
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, type } = await req.json()
    
    const PLACES_API_KEY = Deno.env.get('PLACES_API_KEY')
    const DISTANCE_MATRIX_API_KEY = Deno.env.get('DISTANCE_MATRIX_API_KEY')
    const GEOCODING_API_KEY = Deno.env.get('GEOCODING_API_KEY')
    
    if (!PLACES_API_KEY || !DISTANCE_MATRIX_API_KEY || !GEOCODING_API_KEY) {
      throw new Error('Required API keys are not configured')
    }

    let result
    
    switch (type) {
      case 'places':
        // Search for places
        result = await searchPlaces(query, PLACES_API_KEY)
        break
      case 'distance':
        // Calculate distance between two locations
        const { origin, destination, mode = 'driving' } = query
        result = await calculateDistance(origin, destination, mode, DISTANCE_MATRIX_API_KEY)
        break
      case 'geocode':
        // Convert address to coordinates
        result = await geocodeAddress(query, GEOCODING_API_KEY)
        break
      case 'weather':
        // Get weather for a location
        result = await getWeatherForLocation(query, GEOCODING_API_KEY)
        break
      default:
        throw new Error('Invalid operation type')
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Location API error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function searchPlaces(query: string, apiKey: string) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Places API responded with status ${response.status}`)
  }
  
  const data = await response.json()
  
  if (data.status !== 'OK') {
    throw new Error(`Places API error: ${data.status}`)
  }
  
  return {
    places: data.results.map((place: any) => ({
      name: place.name,
      address: place.formatted_address,
      location: place.geometry.location,
      placeId: place.place_id,
    })),
    attribution: data.html_attributions,
  }
}

async function calculateDistance(
  origin: string,
  destination: string,
  mode: string,
  apiKey: string
) {
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&mode=${mode}&key=${apiKey}`
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Distance Matrix API responded with status ${response.status}`)
  }
  
  const data = await response.json()
  
  if (data.status !== 'OK') {
    throw new Error(`Distance Matrix API error: ${data.status}`)
  }
  
  return {
    origin: data.origin_addresses[0],
    destination: data.destination_addresses[0],
    distance: data.rows[0].elements[0].distance,
    duration: data.rows[0].elements[0].duration,
    mode: mode,
  }
}

async function geocodeAddress(address: string, apiKey: string) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Geocoding API responded with status ${response.status}`)
  }
  
  const data = await response.json()
  
  if (data.status !== 'OK') {
    throw new Error(`Geocoding API error: ${data.status}`)
  }
  
  return {
    address: data.results[0].formatted_address,
    location: data.results[0].geometry.location,
    placeId: data.results[0].place_id,
  }
}

async function getWeatherForLocation(location: string, apiKey: string) {
  // First geocode the location to get precise coordinates
  const geocodeResult = await geocodeAddress(location, apiKey)
  
  // Use the OpenWeatherMap API to get the weather data
  const { lat, lng } = geocodeResult.location
  
  const weatherApiKey = Deno.env.get('OPENWEATHER_API_KEY')
  if (!weatherApiKey) {
    throw new Error('OpenWeather API key is not configured')
  }
  
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${weatherApiKey}`
  const weatherResponse = await fetch(weatherUrl)
  
  if (!weatherResponse.ok) {
    throw new Error(`Weather API responded with status ${weatherResponse.status}`)
  }
  
  const weatherData = await weatherResponse.json()
  
  return {
    location: geocodeResult.address,
    coordinates: { lat, lng },
    current: {
      temp: weatherData.main.temp,
      feels_like: weatherData.main.feels_like,
      humidity: weatherData.main.humidity,
      pressure: weatherData.main.pressure,
      description: weatherData.weather[0].description,
      icon: `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`,
      wind: {
        speed: weatherData.wind.speed,
        deg: weatherData.wind.deg
      }
    },
    timestamp: new Date().toISOString(),
  }
}

