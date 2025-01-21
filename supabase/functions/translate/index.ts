import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

const GOOGLE_TRANSLATE_API_KEY = Deno.env.get('GOOGLE_TRANSLATE_API_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, targetLanguage } = await req.json()

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
    
    if (data.error) {
      throw new Error(data.error.message);
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
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})