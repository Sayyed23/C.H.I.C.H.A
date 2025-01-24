import { useEffect, useRef, useState } from 'react';
import { Card } from '../ui/card';
import { supabase } from "@/integrations/supabase/client";

interface LocationMapProps {
  locations: string[];
  className?: string;
}

interface WeatherInfo {
  location: string;
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
}

interface GeocodeResult {
  geometry: {
    location: {
      toJSON(): { lat: number; lng: number };
    };
  };
}

declare global {
  interface Window {
    google: any;
  }
}

export const LocationMap = ({ locations, className }: LocationMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const [selectedWeather, setSelectedWeather] = useState<WeatherInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWeatherData = async (location: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-weather', {
        body: { location },
      });

      if (error) throw error;

      if (data.message) {
        // Parse the weather message to create a WeatherInfo object
        const weatherInfo = {
          location: location,
          temperature: parseFloat(data.message.match(/Temperature: (\d+)/)?.[1] || '0'),
          description: data.message.match(/Conditions: ([^\n]+)/)?.[1] || '',
          humidity: parseFloat(data.message.match(/Humidity: (\d+)/)?.[1] || '0'),
          windSpeed: parseFloat(data.message.match(/Wind Speed: (\d+)/)?.[1] || '0'),
          feelsLike: parseFloat(data.message.match(/Feels like: (\d+)/)?.[1] || '0'),
        };
        setSelectedWeather(weatherInfo);
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initMap = async () => {
      if (!locations.length || !mapRef.current) return;

      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.GOOGLE_MAPS_API_KEY}`;
        document.head.appendChild(script);

        script.onload = () => {
          createMap();
        };
      } else {
        createMap();
      }
    };

    const createMap = async () => {
      try {
        const geocoder = new window.google.maps.Geocoder();
        const bounds = new window.google.maps.LatLngBounds();
        
        googleMapRef.current = new window.google.maps.Map(mapRef.current, {
          zoom: 2,
          center: { lat: 0, lng: 0 },
          styles: [
            {
              featureType: "all",
              elementType: "labels.text.fill",
              stylers: [{ color: "#000000" }]
            }
          ]
        });

        for (const location of locations) {
          try {
            const { results } = await new Promise<{ results: GeocodeResult[] }>((resolve, reject) => {
              geocoder.geocode({ address: location }, (results: GeocodeResult[], status: string) => {
                if (status === 'OK') {
                  resolve({ results });
                } else {
                  reject(new Error(`Geocoding failed for ${location}: ${status}`));
                }
              });
            });

            const { lat, lng } = results[0].geometry.location.toJSON();
            const position = { lat, lng };

            const marker = new window.google.maps.Marker({
              position,
              map: googleMapRef.current,
              title: location
            });

            // Add click event listener to marker
            marker.addListener('click', () => {
              fetchWeatherData(location);
            });

            bounds.extend(position);
          } catch (error) {
            console.error(`Error geocoding location ${location}:`, error);
          }
        }

        if (!bounds.isEmpty()) {
          googleMapRef.current.fitBounds(bounds);
          const listener = googleMapRef.current.addListener('idle', () => {
            if (googleMapRef.current.getZoom() > 12) {
              googleMapRef.current.setZoom(12);
            }
            window.google.maps.event.removeListener(listener);
          });
        }
      } catch (error) {
        console.error('Error creating map:', error);
      }
    };

    initMap();

    return () => {
      if (googleMapRef.current) {
        // Cleanup map instance if needed
      }
    };
  }, [locations]);

  return (
    <div className="space-y-4">
      <Card className={className}>
        <div 
          ref={mapRef} 
          style={{ width: '100%', height: '300px', borderRadius: 'inherit' }}
          aria-label={`Map showing locations: ${locations.join(', ')}`}
        />
      </Card>
      
      {isLoading && (
        <Card className="p-4">
          <p className="text-center text-muted-foreground">Loading weather information...</p>
        </Card>
      )}

      {selectedWeather && !isLoading && (
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Weather in {selectedWeather.location}</h3>
          <div className="space-y-1 text-sm">
            <p>Temperature: {selectedWeather.temperature}°C (Feels like: {selectedWeather.feelsLike}°C)</p>
            <p>Conditions: {selectedWeather.description}</p>
            <p>Humidity: {selectedWeather.humidity}%</p>
            <p>Wind Speed: {selectedWeather.windSpeed} km/h</p>
          </div>
        </Card>
      )}
    </div>
  );
};