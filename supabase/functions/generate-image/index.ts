import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STABILITY_API_KEY = Deno.env.get('STABILITY_API_KEY');
const STABILITY_API_HOST = 'https://api.stability.ai';

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

    const response = await fetch(
      `${STABILITY_API_HOST}/v1/generation/stable-diffusion-v1-6/text-to-image`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${STABILITY_API_KEY}`,
        },
        body: JSON.stringify({
          text_prompts: [{ text: prompt }],
          cfg_scale: 7,
          height: 512,
          width: 512,
          samples: 1,
          steps: 30,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Stability AI API error:', error);
      throw new Error(`Stability AI API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    console.log('Stability AI response received');

    // The API returns base64 encoded images
    const imageBase64 = data.artifacts[0].base64;
    
    // Convert base64 to blob and upload to Supabase Storage
    const imageBlob = await fetch(`data:image/png;base64,${imageBase64}`).then(res => res.blob());
    
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('images')
      .upload(`generated/${fileName}`, imageBlob, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabaseClient
      .storage
      .from('images')
      .getPublicUrl(`generated/${fileName}`);

    return new Response(
      JSON.stringify({ imageUrl: publicUrl }),
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