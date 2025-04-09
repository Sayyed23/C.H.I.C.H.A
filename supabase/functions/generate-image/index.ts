
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
    console.log('Image URL (if any):', imageUrl);
    
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiApiKey) {
      console.error('OPENAI_API_KEY is not set in environment variables');
      throw new Error('OPENAI_API_KEY is not set');
    }

    // Enhance the prompt for better results
    const enhancedPrompt = imageUrl 
      ? `Transform this image based on the following instruction: ${prompt}` 
      : prompt;

    // Create the request body based on whether we have an image
    let requestBody;
    
    if (imageUrl) {
      console.log('Using image-to-image generation mode');
      
      // For DALL-E 3, we can't send base64 encoded images directly
      // We need to first upload the image to get a reference
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image from ${imageUrl}: ${imageResponse.statusText}`);
      }
      
      const imageBlob = await imageResponse.blob();
      
      // Convert blob to form data for the image upload
      const formData = new FormData();
      formData.append('image', imageBlob, 'image.png');
      
      // Upload the image to OpenAI
      console.log('Uploading image to OpenAI...');
      const uploadResponse = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiApiKey}`,
        },
        body: formData
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Image upload error:', errorText);
        throw new Error(`Failed to upload image: ${errorText}`);
      }
      
      const uploadData = await uploadResponse.json();
      console.log('Image uploaded successfully:', uploadData);
      
      // For text-to-image generation with the uploaded image as reference
      requestBody = {
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        image: uploadData.id || uploadData.url
      };
    } else {
      // For regular text-to-image generation
      console.log('Using text-to-image generation mode');
      requestBody = {
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard"
      };
    }

    console.log('Making request to OpenAI API with body:', JSON.stringify(requestBody));
    const endpoint = imageUrl ? 'https://api.openai.com/v1/images/edits' : 'https://api.openai.com/v1/images/generations';
    
    const response = await fetch(endpoint, {
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
    console.log('OpenAI API response received successfully');
    
    if (!data.data || data.data.length === 0 || !data.data[0].url) {
      console.error('No image URL in response data:', data);
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
