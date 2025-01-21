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
    const { prompt } = await req.json();
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Configure the chat with web search capabilities
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

    console.log('Sending prompt to Gemini:', prompt);

    // Get the response with web search enabled
    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    let text = response.text();

    // Format the response by removing asterisks and ensuring proper spacing
    text = text.replace(/\*\*/g, '') // Remove double asterisks
              .replace(/\*/g, '')    // Remove single asterisks
              .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
              .trim();

    console.log('Formatted response from Gemini:', text);

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
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});