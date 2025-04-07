
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, imageUrl } = await req.json();
    console.log('Generating image for prompt:', prompt);
    
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiApiKey) {
      console.error('OPENAI_API_KEY is not set in environment variables');
      throw new Error('OPENAI_API_KEY is not set');
    }

    // Enhance the prompt for better results
    const enhancedPrompt = imageUrl 
      ? `Transform this image based on the following instruction: ${prompt}` 
      : prompt;

    // Create the appropriate request body based on whether we have an image
    let requestBody;
    
    if (imageUrl) {
      // First, we need to fetch the image data
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image from ${imageUrl}`);
      }
      
      // Convert image to base64 string if needed
      const imageBlob = await imageResponse.blob();
      
      // For image variation/edit
      requestBody = {
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        image: imageUrl
      };
    } else {
      // For text-to-image generation
      requestBody = {
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard"
      };
    }

    console.log('Making request to OpenAI API...');
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error response:', error);
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    console.log('OpenAI API response received');
    
    if (!data.data || data.data.length === 0 || !data.data[0].url) {
      throw new Error('No image URL in response data');
    }

    return new Response(
      JSON.stringify({ imageUrl: data.data[0].url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-image function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: 'generation_error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});