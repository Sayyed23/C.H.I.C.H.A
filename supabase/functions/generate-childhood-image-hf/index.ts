import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HfInference } from "https://esm.sh/@huggingface/inference@2.3.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, age, gender, location, era, style, mood, season, timeOfDay, weather, activity, companions, specialObject } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Initialize Hugging Face client
    const hf = new HfInference(Deno.env.get("HUGGING_FACE_ACCESS_TOKEN"));

    console.log("Generating childhood memory image with prompt:", prompt);

    // Create enhanced prompt with structured formatting
    let enhancedPrompt = `A stunning visualization of a treasured childhood memory`;

    // Add child details
    if (gender && gender !== "Not specified") {
      if (age && age !== "Not specified") {
        enhancedPrompt += `, featuring a ${age}-year-old ${gender.toLowerCase()} child`;
      } else {
        enhancedPrompt += `, featuring a ${gender.toLowerCase()} child`;
      }
    } else if (age && age !== "Not specified") {
      enhancedPrompt += `, featuring a ${age}-year-old child`;
    }

    // Add era-specific details
    if (era && era !== "Not specified") {
      enhancedPrompt += `, with ${era} aesthetics, technology, and fashion`;
    }

    // Add location
    if (location && location !== "Not specified") {
      enhancedPrompt += `, at ${location.toLowerCase()}`;
    }

    // Add season and time of day
    if (season && season !== "Not specified") {
      enhancedPrompt += `, during ${season.toLowerCase()}`;
    }
    if (timeOfDay && timeOfDay !== "Not specified") {
      enhancedPrompt += `, at ${timeOfDay.toLowerCase()}`;
    }

    // Add weather
    if (weather && weather !== "Not specified") {
      enhancedPrompt += `, with ${weather.toLowerCase()} weather`;
    }

    // Add activity
    if (activity && activity !== "Not specified") {
      enhancedPrompt += `, ${activity.toLowerCase()}`;
    }

    // Add companions
    if (companions && companions !== "Not specified") {
      enhancedPrompt += `, with ${companions.toLowerCase()}`;
    }

    // Add special object
    if (specialObject && specialObject !== "Not specified") {
      enhancedPrompt += `, with a ${specialObject.toLowerCase()}`;
    }

    // Add user's specific description
    enhancedPrompt += `. ${prompt}`;

    // Add style
    if (style && style !== "Default") {
      if (style === "Oil painting") {
        enhancedPrompt += `, portrayed as a rich oil painting with textured brushstrokes and depth`;
      } else if (style === "Photography") {
        enhancedPrompt += `, captured as a professional photograph with perfect focus`;
      } else {
        enhancedPrompt += `, in ${style.toLowerCase()} style`;
      }
    }

    // Add mood
    if (mood && mood !== "Default") {
      enhancedPrompt += `, ${mood.toLowerCase()} mood`;
    }

    // Add quality enhancers but keep them shorter to avoid stack overflow
    enhancedPrompt += `, high quality, detailed.`;

    console.log("Enhanced prompt:", enhancedPrompt);

    try {
      // Generate image using FLUX.1 model with simplified parameters
      const image = await hf.textToImage({
        inputs: enhancedPrompt,
        model: "black-forest-labs/FLUX.1-schnell",
        parameters: {
          guidance_scale: 7.0,
          num_inference_steps: 25,
        }
      });

      // Convert the blob to base64
      const arrayBuffer = await image.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Process the image data in chunks to avoid stack overflow
      const chunkSize = 8192;
      let binary = '';
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
      }
      
      const base64 = btoa(binary);
      const imageUrl = `data:image/jpeg;base64,${base64}`;

      return new Response(
        JSON.stringify({ 
          imageUrl,
          prompt: enhancedPrompt
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    } catch (apiError) {
      console.error("Hugging Face API error:", apiError);
      
      // Check if the error is related to API credits
      if (apiError.message && apiError.message.includes("exceeded your monthly included credits")) {
        return new Response(
          JSON.stringify({ 
            error: "API credit limit exceeded", 
            errorType: "CREDIT_LIMIT",
            details: "The Hugging Face API credit limit has been exceeded. Please try again later or upgrade to a PRO account."
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 429
          }
        );
      } else {
        // For other API errors
        return new Response(
          JSON.stringify({ 
            error: "Error generating image", 
            errorType: "API_ERROR",
            details: apiError.message 
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500
          }
        );
      }
    }
  } catch (error) {
    console.error("Error in generate-childhood-image-hf function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Error generating image", 
        errorType: "SERVER_ERROR",
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
