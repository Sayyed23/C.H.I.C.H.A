
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log("chat-with-gemini function started");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const { prompt, imageUrls } = await req.json();
    console.log('Received request with prompt:', prompt);
    console.log('Received image URLs:', imageUrls);

    let systemContext = "You are CHICHA, a helpful AI assistant. Provide concise answers in 10-15 lines maximum. If applicable, use numbered points. Avoid special characters and only mention dates/times if specifically asked. Focus on the most relevant information.";

    const requestBody = {
      contents: [{
        parts: [{
          text: `${systemContext}\n\nUser's question: ${prompt}`
        }]
      }]
    };

    // Process multiple images if provided
    if (imageUrls && Array.isArray(imageUrls)) {
      console.log('Processing multiple images:', imageUrls.length);
      
      for (const imageUrl of imageUrls) {
        try {
          console.log('Processing image URL:', imageUrl);
          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            console.error(`Failed to fetch image: ${imageResponse.statusText}`);
            continue;
          }
          const imageData = await imageResponse.blob();
          const base64Image = await blobToBase64(imageData);
          
          requestBody.contents[0].parts.push({
            inlineData: {
              mimeType: imageData.type,
              data: base64Image
            }
          });
        } catch (error) {
          console.error('Error processing image:', imageUrl, error);
        }
      }
    }

    console.log('Sending request to Gemini API');
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
      throw new Error('Invalid response format from Gemini API');
    }

    const result = data.candidates[0].content.parts[0].text;
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const urls = result.match(urlPattern) || [];

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

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}