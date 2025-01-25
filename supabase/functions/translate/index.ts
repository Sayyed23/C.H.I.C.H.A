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

    // Map our language codes to Google Translate language codes
    const languageMap: Record<string, string> = {
      'hi': 'hi', // Hindi
      'mr': 'mr', // Marathi
      'sa': 'sa', // Sanskrit
    };

    const googleLanguage = languageMap[targetLanguage];
    if (!googleLanguage) {
      throw new Error(`Unsupported target language: ${targetLanguage}`);
    }

    console.log('Making request to Google Translate API with language:', googleLanguage);

    const apiKey = Deno.env.get('GOOGLE_TRANSLATE_API_KEY');
    if (!apiKey) {
      throw new Error('Google Translate API key not configured');
    }

    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          target: googleLanguage,
          source: 'en'
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Translate API error:', errorText);
      throw new Error(`Google Translate API returned status ${response.status}`);
    }

    const data = await response.json();
    console.log('Google Translate API response:', JSON.stringify(data));

    if (!data.data?.translations?.[0]?.translatedText) {
      throw new Error('Invalid response format from Google Translate API');
    }

    const translatedText = data.data.translations[0].translatedText;
    console.log('Successfully translated text:', translatedText);

    return new Response(
      JSON.stringify({ translatedText }),
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
        status: 500,
      },
    )
  }
})