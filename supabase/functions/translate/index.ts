import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { config } from "https://deno.land/std@0.168.0/dotenv/mod.ts";
const env = config();
const GOOGLE_TRANSLATE_API_KEY = env.GOOGLE_TRANSLATE_API_KEY;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate API key exists
    if (!GOOGLE_TRANSLATE_API_KEY) {
      throw new Error('Google Translate API key is not configured');
    }

    const { text, targetLanguage } = await req.json()

    // Validate required parameters
    if (!text || !targetLanguage) {
      throw new Error('Missing required parameters: text and targetLanguage');
    }

    console.log('Attempting translation:', { targetLanguage, textLength: text.length });

    const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        target: targetLanguage,
        format: 'text'
      }),
    });

    const data = await response.json();
    
    // Log the response for debugging
    console.log('Translation API response:', JSON.stringify(data));
    
    if (data.error) {
      throw new Error(data.error.message || 'Translation API error');
    }

    if (!data.data?.translations?.[0]?.translatedText) {
      throw new Error('Invalid response format from Translation API');
    }

    return new Response(
      JSON.stringify({ 
        translatedText: data.data.translations[0].translatedText 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Translation error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})