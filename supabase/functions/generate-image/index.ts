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
    const { prompt } = await req.json();
    console.log('Generating image for prompt:', prompt);

    const runwareApiKey = Deno.env.get('RUNWARE_API_KEY');
    if (!runwareApiKey) {
      console.error('RUNWARE_API_KEY is not set in environment variables');
      throw new Error('RUNWARE_API_KEY is not set');
    }

    console.log('Making request to Runware API...');
    const response = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          taskType: "authentication",
          apiKey: runwareApiKey
        },
        {
          taskType: "imageInference",
          taskUUID: crypto.randomUUID(),
          positivePrompt: prompt,
          width: 1024,
          height: 1024,
          model: "runware:100@1",
          numberResults: 1,
          outputFormat: "WEBP",
          CFGScale: 1,
          scheduler: "FlowMatchEulerDiscreteScheduler",
          strength: 0.8
        }
      ])
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Runware API error response:', error);
      throw new Error(`Runware API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    console.log('Runware API response:', data);

    // Find the image inference response in the data array
    const imageData = data.data?.find(item => item.taskType === "imageInference");
    
    if (!imageData || !imageData.imageURL) {
      console.error('No image URL in response data:', data);
      throw new Error('No image URL in image inference response');
    }

    return new Response(
      JSON.stringify({ imageUrl: imageData.imageURL }),
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