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
    const { text, targetLanguage } = await req.json()

    // Validate required parameters
    if (!text || !targetLanguage) {
      throw new Error('Missing required parameters: text and targetLanguage');
    }

    console.log('Starting translation request:', { targetLanguage, textLength: text.length });

    const apiKey = Deno.env.get('APILAYER_API_KEY');
    if (!apiKey) {
      throw new Error('APILayer API key not configured');
    }

    // Map our language codes to APILayer language codes
    const languageMap: Record<string, string> = {
      'hi': 'hi', // Hindi
      'mr': 'mr', // Marathi
      'sa': 'sa', // Sanskrit
    };

    const targetLang = languageMap[targetLanguage];
    if (!targetLang) {
      throw new Error(`Unsupported target language: ${targetLanguage}`);
    }

    console.log('Making request to APILayer Translation API with language:', targetLang);

    const url = `https://api.apilayer.com/language_translation/translate?target=${targetLang}&source=en&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
      },
    });

    console.log('APILayer Translation API response status:', response.status);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('APILayer Translation API error:', errorBody);
      
      if (response.status === 503) {
        throw new Error('Translation service is temporarily unavailable. Please try again later.');
      } else if (response.status === 429) {
        throw new Error('Translation quota exceeded. Please try again later.');
      } else {
        throw new Error(`Translation service error (${response.status}). Please try again.`);
      }
    }

    const data = await response.json();
    console.log('APILayer Translation API response:', JSON.stringify(data));

    // APILayer returns translations in an array with additional metadata
    if (!data.translations || !data.translations[0] || !data.translations[0].translation) {
      console.error('Invalid response format:', data);
      throw new Error('Invalid response format from translation service');
    }

    return new Response(
      JSON.stringify({ translatedText: data.translations[0].translation }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Translation error:', error.message);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message.includes('temporarily unavailable') ? 503 : 500,
      },
    )
  }
})