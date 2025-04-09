
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, imageUrl } = await req.json();
    console.log('Editing image with prompt:', prompt);
    console.log('Source image URL:', imageUrl);

    if (!prompt || !imageUrl) {
      throw new Error('Missing required parameters: prompt and imageUrl');
    }

    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiApiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    // Enhance the prompt for better image editing results
    const enhancedPrompt = `Edit this image according to these instructions: ${prompt}. Maintain the overall style and composition where appropriate.`;

    // Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    const imageBlob = await imageResponse.blob();
    
    // Create form data for the multipart request
    const formData = new FormData();
    formData.append('image', imageBlob);
    formData.append('prompt', enhancedPrompt);
    formData.append('n', '1');
    formData.append('size', '1024x1024');
    formData.append('model', 'dall-e-3');

    console.log('Making request to OpenAI API for image editing...');
    
    // Use the image variations endpoint instead of edits
    const response = await fetch('https://api.openai.com/v1/images/variations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error response:', errorText);
      
      // Try the fallback to the generations endpoint if variations fails
      console.log('Trying fallback to generations endpoint...');
      const fallbackResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: `${enhancedPrompt} The original image shows: [Describe the image in detail that would be useful context]`,
          n: 1,
          size: "1024x1024",
        })
      });
      
      if (!fallbackResponse.ok) {
        const fallbackError = await fallbackResponse.text();
        throw new Error(`OpenAI API error: ${fallbackError}`);
      }
      
      const fallbackData = await fallbackResponse.json();
      
      return new Response(
        JSON.stringify({ 
          imageUrl: fallbackData.data[0].url,
          usedFallback: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('OpenAI API response received');
    
    if (!data.data || data.data.length === 0 || !data.data[0].url) {
      throw new Error('No image URL in response');
    }

    return new Response(
      JSON.stringify({ imageUrl: data.data[0].url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in edit-image function:', error);
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
