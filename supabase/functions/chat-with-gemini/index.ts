import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    const { prompt } = await req.json();
    
    if (!prompt) {
      throw new Error('Prompt is required');
    }

    console.log('Initializing Gemini with prompt:', prompt);
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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

    // Get the response
    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    let text = response.text();

    // Format the response
    text = text.replace(/\*\*/g, '')
              .replace(/\*/g, '')
              .replace(/\n\s*\n/g, '\n')
              .trim();

    console.log('Successfully generated response:', text.substring(0, 100) + '...');

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
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        },
      },
    );
  } catch (error) {
    console.error('Error in chat-with-gemini function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to process chat request'
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        },
      },
    );
  }
});