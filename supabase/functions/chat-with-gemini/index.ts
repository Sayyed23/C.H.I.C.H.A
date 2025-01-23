import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

console.log("chat-with-gemini function started");

serve(async (req) => {
  console.log('Received request:', req.method, req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set');
      throw new Error('GEMINI_API_KEY is not set');
    }

    console.log('Processing request body');
    const { prompt, imageUrl } = await req.json();
    console.log('Received request with prompt:', prompt);

    // Get current date and time
    const now = new Date();
    const date = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const time = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    // Create the request body
    const requestBody = {
      contents: [{
        parts: [{
          text: `Current date: ${date}\nCurrent time: ${time}\n\nYou are CHICHA, a helpful AI assistant. You should:\n1. Be aware of the current date and time mentioned above\n2. Reference the current date/time when relevant\n3. Provide up-to-date information based on the current context\n4. If asked about current events, weather, or time-sensitive information, acknowledge the current date/time\n5. Be clear when referencing current date vs historical information\n\nUser's question: ${prompt}`
        }]
      }]
    };

    // If there's an image, add it to the parts array
    if (imageUrl) {
      console.log('Processing image URL:', imageUrl);
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }
      const imageData = await imageResponse.blob();
      const base64Image = await blobToBase64(imageData);
      
      requestBody.contents[0].parts.push({
        inlineData: {
          mimeType: imageData.type,
          data: base64Image
        }
      });
    }

    console.log('Sending request to Gemini API with key:', apiKey.substring(0, 5) + '...');
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
      console.error('Gemini API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Received response from Gemini API:', data);

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      console.error('Unexpected response format from Gemini API:', data);
      throw new Error('Invalid response format from Gemini API');
    }

    // Extract the text from the response
    const result = data.candidates[0].content.parts[0].text;

    // Search for any URLs in the response using a regex pattern
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const urls = result.match(urlPattern) || [];

    // Format URLs as sources if found
    const sources = urls.map(url => {
      try {
        const domain = new URL(url).hostname;
        return {
          title: domain,
          url: url,
          domain: domain,
          icon: `https://www.google.com/s2/favicons?domain=${domain}`
        };
      } catch (e) {
        console.error('Error processing URL:', e);
        return null;
      }
    }).filter(Boolean);

    return new Response(
      JSON.stringify({ 
        response: result,
        sources: sources.length > 0 ? sources : undefined
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
  } catch (error) {
    console.error('Error in chat-with-gemini function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
  }
});

// Helper function to convert Blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}