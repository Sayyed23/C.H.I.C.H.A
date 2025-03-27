
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { corsHeaders } from "../_shared/cors.ts";

// Initialize the Gemini API client 
const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, targetLanguage } = await req.json();

    // Validate required parameters
    if (!text || !targetLanguage) {
      throw new Error('Missing required parameters: text and targetLanguage');
    }

    console.log('Starting translation request:', { targetLanguage, textLength: text.length });

    // Map language codes to full language names
    const languageMap: Record<string, string> = {
      'hi': 'Hindi',
      'mr': 'Marathi',
      'sa': 'Sanskrit',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ar': 'Arabic',
      'ur':'urdu',
    };
    
    const targetLang = languageMap[targetLanguage] || targetLanguage;

    // First try with Gemini
    try {
      console.log(`Using Gemini for translation to ${targetLang}`);
      
      const prompt = `Translate the following text to ${targetLang}. Only respond with the translated text, nothing else:
      
      "${text}"`;
      
      const result = await model.generateContent(prompt);
      const response = result.text().trim();
      
      if (response) {
        console.log('Translation successful with Gemini');
        return new Response(
          JSON.stringify({ translatedText: response }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    } catch (geminiError) {
      console.error('Gemini translation error:', geminiError);
      // Fall back to Google Translate API if Gemini fails
    }

    // Try Google Translate API
    try {
      const googleTranslateApiKey = Deno.env.get('GOOGLE_TRANSLATE_API_KEY');
      
      if (!googleTranslateApiKey) {
        throw new Error('Google Translate API key not configured');
      }
      
      console.log('Using Google Translate API');
      
      const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${googleTranslateApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          target: targetLanguage,
          format: 'text',
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Google Translate API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.data?.translations?.[0]?.translatedText) {
        console.log('Translation successful with Google Translate API');
        return new Response(
          JSON.stringify({ translatedText: data.data.translations[0].translatedText }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } else {
        throw new Error('Invalid response format from Google Translate API');
      }
    } catch (googleError) {
      console.error('Google Translate API error:', googleError);
      // Fall back to Weglot as a last resort
    }

    // Fallback to Weglot API
    console.log('Falling back to Weglot API');
    const weglotApiKey = Deno.env.get('WEGLOT_API_KEY') || 'wg_ad88906fad074f874635867d42dc7d5d6';
    
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
            to_language: targetLanguage,
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
        details: (lastError as unknown as Error)?.message || String(lastError)
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
});