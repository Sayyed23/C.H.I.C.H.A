import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set in environment variables');
      throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log('Initializing Gemini...');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const { prompt } = await req.json();
    console.log('Received prompt:', prompt);

    // Configure the chat
    const chat = model.startChat({
      generationConfig: {
        temperature: 0.7,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      },
      tools: [{
        googleSearch: {
          enable: true,
        },
      }],
    });

    console.log('Sending prompt to Gemini');
    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    let text = response.text();

    // Format the response
    text = text.replace(/\*\*/g, '')
              .replace(/\*/g, '')
              .replace(/\n\s*\n/g, '\n')
              .trim();

    console.log('Successfully received response from Gemini');

    return new Response(
      JSON.stringify({ 
        response: text,
        sources: [
          {
            title: "Search Results",
            url: "https://www.google.com",
            domain: "google.com",
            icon: "https://www.google.com/favicon.ico"
          }
        ]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error in chat-with-gemini function:', error);
    
    // Return a more detailed error response
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'If you are seeing an API key error, please ensure you have set a valid Gemini API key in the Supabase Edge Function secrets.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});