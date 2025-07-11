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

    const apiKey = Deno.env.get('GEMINI_TRANSLATE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Translation service is currently unavailable',
          translatedText: text // Return original text as fallback
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Map our language codes to full language names for Gemini
    const languageMap: Record<string, string> = {
      'hi': 'Hindi',
      'mr': 'Marathi', 
      'sa': 'Sanskrit',
      'en': 'English',
    };

    const targetLang = languageMap[targetLanguage];
    if (!targetLang) {
      return new Response(
        JSON.stringify({ 
          error: `Unsupported target language: ${targetLanguage}`,
          translatedText: text
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    console.log('Making request to Gemini Translation API with language:', targetLang);

    const requestBody = {
      contents: [{
        parts: [{
          text: `Translate the following text to ${targetLang}. Return only the translated text without any additional formatting, explanations, or notes:\n\n${text}`
        }]
      }]
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini Translation API error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Translation service temporarily unavailable',
          translatedText: text // Return original text as fallback
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    const data = await response.json();
    console.log('Gemini Translation API response:', JSON.stringify(data));

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response format from Gemini Translation API',
          translatedText: text
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    const translatedText = data.candidates[0].content.parts[0].text.trim();

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
        error: 'Translation service temporarily unavailable',
        translatedText: text || 'Translation failed' // Return original text as fallback
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  }
})