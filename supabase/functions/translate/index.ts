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

    // Implement retry logic with exponential backoff
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Wait before retrying, with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }

        const response = await fetch('https://api.apilayer.com/language_translation/translate', {
          method: 'POST',
          headers: {
            'apikey': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: text,
            target: targetLang,
            source: 'en'
          })
        });

        console.log('APILayer Translation API response status:', response.status);

        if (!response.ok) {
          const errorBody = await response.text();
          console.error('APILayer Translation API error:', errorBody);
          
          if (response.status === 503 || response.status === 429) {
            // For these specific errors, we want to retry
            throw new Error(`Translation service error (${response.status})`);
          } else {
            // For other errors, fail immediately
            return new Response(
              JSON.stringify({ 
                error: `Translation service error (${response.status}). Please try again.` 
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: response.status
              }
            );
          }
        }

        const data = await response.json();
        console.log('APILayer Translation API response:', JSON.stringify(data));

        // Validate response format
        if (!data.translations || !data.translations[0] || !data.translations[0].translation) {
          console.error('Invalid response format:', data);
          throw new Error('Invalid response format from translation service');
        }

        // If we get here, the request was successful
        return new Response(
          JSON.stringify({ translatedText: data.translations[0].translation }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        );
      } catch (retryError) {
        console.error(`Attempt ${attempt + 1} failed:`, retryError);
        lastError = retryError;
        
        // If this was our last attempt, or if it's not a retryable error, break
        if (attempt === maxRetries - 1 || !retryError.message.includes('503') && !retryError.message.includes('429')) {
          break;
        }
      }
    }

    // If we get here, all retries failed
    console.error('All translation attempts failed:', lastError);
    return new Response(
      JSON.stringify({ 
        error: 'Translation service is temporarily unavailable. Please try again later.',
        details: lastError?.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 503,
      }
    );

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
      }
    )
  }
})