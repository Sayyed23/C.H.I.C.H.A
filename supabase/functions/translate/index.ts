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

    // Map our language codes to Eden AI language codes
    const languageMap: Record<string, string> = {
      'hi': 'hi', // Hindi
      'mr': 'mr', // Marathi
      'sa': 'sa', // Sanskrit
    };

    const edenLanguage = languageMap[targetLanguage];
    if (!edenLanguage) {
      throw new Error(`Unsupported target language: ${targetLanguage}`);
    }

    console.log('Making request to Eden AI with language:', edenLanguage);

    const response = await fetch('https://api.edenai.run/v2/translation/automatic_translation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('EDEN_AI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        providers: "google",
        text: text,
        source_language: "en",
        target_language: edenLanguage
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Eden AI API error:', errorText);
      throw new Error(`Eden AI API returned status ${response.status}`);
    }

    const data = await response.json();
    console.log('Eden AI raw response:', JSON.stringify(data));

    // Check if we have a valid response with the translated text
    if (!data.google || data.google.status !== 'success' || !data.google.result) {
      console.error('Invalid response structure:', data);
      throw new Error('Invalid response format from Eden AI');
    }

    const translatedText = data.google.result;
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