
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const voicesByLanguage = {
  "en": "EXAVITQu4vr4xnSDxMaL", // Sarah (English)
  "hi": "pMsXgVXv3BLzUgSXRRbl", // Hindi voice
  "mr": "EOznRNTxiYb3bvGGHCwr", // Marathi-like voice
  "sa": "EOznRNTxiYb3bvGGHCwr", // Sanskrit-like voice (using fallback)
  "es": "GBv7mTt0atIp3Br8iCZE", // Spanish voice
  "fr": "ODkFQcw3T2t8CUvVTVYi", // French voice
  "de": "MqJdzLi3cAV9ISI09dLR", // German voice
  "default": "EXAVITQu4vr4xnSDxMaL", // Default to Sarah
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId, language } = await req.json();
    
    if (!text) {
      throw new Error("No text provided");
    }

    // Select appropriate voice based on language or use provided voiceId or default
    let voice = voiceId;
    if (!voice && language) {
      const languageCode = language.substring(0, 2).toLowerCase();
      voice = voicesByLanguage[languageCode] || voicesByLanguage["default"];
    } else if (!voice) {
      voice = voicesByLanguage["default"];
    }

    console.log(`Using voice ID: ${voice} for language: ${language || 'default'}`);

    // Call the Eleven Labs API for text-to-speech conversion
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": Deno.env.get("ELEVEN_LABS_API_KEY") || "",
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.detail?.message || "Failed to convert text to speech");
      } catch {
        throw new Error(errorText || "Failed to convert text to speech");
      }
    }

    // Get audio data as ArrayBuffer and convert to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    return new Response(
      JSON.stringify({ 
        audioContent: base64Audio,
        format: "mp3"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Text to speech error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
