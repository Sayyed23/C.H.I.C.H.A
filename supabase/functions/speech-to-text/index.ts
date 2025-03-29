
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioData, language = "en" } = await req.json();
    
    if (!audioData) {
      throw new Error("No audio data provided");
    }

    // Call the Eleven Labs API for speech-to-text conversion
    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": Deno.env.get("ELEVEN_LABS_API_KEY") || "",
      },
      body: JSON.stringify({
        audio: audioData,
        model_id: "eleven_turbo_v2",
        language_code: language.substring(0, 2) // Extract the language code (e.g., "en" from "en-US")
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to convert speech to text");
    }

    const result = await response.json();
    
    return new Response(
      JSON.stringify({ text: result.text }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Speech to text error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
