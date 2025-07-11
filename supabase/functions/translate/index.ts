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

    const response = await fetch(
      `https://api.apilayer.com/language_translation/translate?target=${targetLang}&source=en`,
      {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('APILayer Translation API error:', errorText);
      throw new Error(`APILayer Translation API returned status ${response.status}`);
    }

    const data = await response.json();
    console.log('APILayer Translation API response:', JSON.stringify(data));

    if (!data.translated_text) {
      throw new Error('Invalid response format from APILayer Translation API');
    }

    return new Response(
      JSON.stringify({ translatedText: data.translated_text }),
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