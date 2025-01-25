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

    console.log('Starting Weglot translation request:', { targetLanguage, textLength: text.length });

    const weglotApiKey = 'wg_ad88906fad074f874635867d42dc7d5d6';
    
    // Map our language codes to Weglot language codes
    const languageMap: Record<string, string> = {
      'hi': 'hi', // Hindi
      'mr': 'mr', // Marathi
      'sa': 'sa', // Sanskrit
    };

    const targetLang = languageMap[targetLanguage];
    if (!targetLang) {
      throw new Error(`Unsupported target language: ${targetLanguage}`);
    }

    // Implement retry logic with exponential backoff
    const maxRetries = 3;
    let lastError = null;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        if (attempt > 0) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`Retry attempt ${attempt + 1}, waiting ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        console.log(`Making Weglot translation request (attempt ${attempt + 1}/${maxRetries})`);
        
        const response = await fetch('https://api.weglot.com/translate', {
          method: 'POST',
          headers: {
            'Api-Key': weglotApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from_language: 'en',
            to_language: targetLang,
            texts: [text]
          })
        });

        console.log('Weglot API response status:', response.status);

        if (!response.ok) {
          const errorBody = await response.text();
          console.error('Weglot API error:', errorBody);
          
          // For 503 or 429, retry
          if (response.status === 503 || response.status === 429) {
            throw new Error(`Translation service error (${response.status})`);
          }
          
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

        const data = await response.json();
        console.log('Weglot API response:', JSON.stringify(data));

        if (!data.to_texts?.[0]) {
          throw new Error('Invalid response format from translation service');
        }

        return new Response(
          JSON.stringify({ translatedText: data.to_texts[0] }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        lastError = error;
        
        // Only retry on specific error codes
        if (!error.message?.includes('503') && !error.message?.includes('429')) {
          break;
        }
        
        attempt++;
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
    console.error('Translation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})