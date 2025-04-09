
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

    // Check if Google Speech-to-Text API key is available
    const googleApiKey = Deno.env.get("GOOGLE_TRANSLATE_API_KEY");
    if (googleApiKey) {
      try {
        // Create a Blob from the base64 audio data
        const binaryData = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
        
        // Convert to base64 encoding expected by Google Speech API
        const base64Audio = btoa(String.fromCharCode(...binaryData));
        
        // Determine language code in Google's expected format
        let googleLangCode = language;
        // Convert ISO 639-1 codes to BCP-47 format expected by Google
        if (language.length === 2) {
          // Map of language codes to their common BCP-47 equivalents
          const langMap: Record<string, string> = {
            'en': 'en-US',
            'hi': 'hi-IN',
            'mr': 'mr-IN',
            'sa': 'sa-IN',
            'es': 'es-ES',
            'fr': 'fr-FR',
            'de': 'de-DE',
            'it': 'it-IT',
            'ja': 'ja-JP',
            'zh': 'zh-CN',
            'ar': 'ar-AE',
            'ur': 'ur-PK'
          };
          googleLangCode = langMap[language] || `${language}-${language.toUpperCase()}`;
        }
        
        // Use specific settings for Japanese
        const audioConfig: any = {
          encoding: "WEBM_OPUS",
          sampleRateHertz: 48000,
          languageCode: googleLangCode,
          enableAutomaticPunctuation: true,
          model: "default",
          useEnhanced: true,
          maxAlternatives: 1
        };
        
        // Add Japanese-specific settings
        if (language === 'ja') {
          audioConfig.model = "latest_long"; // Better for Japanese
          audioConfig.profanityFilter = false; // Don't filter profanity for non-English
          audioConfig.languageCode = "ja-JP";
        } else if (language === 'zh') {
          audioConfig.model = "latest_long"; // Better for CJK languages
          audioConfig.languageCode = "cmn-Hans-CN"; // Mandarin Chinese
        }
        
        // Prepare the request body for Google Speech-to-Text API
        const requestBody = {
          config: audioConfig,
          audio: {
            content: base64Audio
          }
        };

        // Call the Google Speech-to-Text API
        const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${googleApiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        });

        if (response.ok) {
          const result = await response.json();
          
          // Combine all transcripts if multiple results are returned
          let transcript = "";
          if (result.results && result.results.length > 0) {
            transcript = result.results
              .map((result: any) => result.alternatives[0]?.transcript || "")
              .join(" ")
              .trim();
          }
          
          return new Response(
            JSON.stringify({ text: transcript, source: "google" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        } else {
          console.error("Google STT failed:", await response.text());
          // Fall back to OpenAI if Google fails
        }
      } catch (googleError) {
        console.error("Google STT error:", googleError);
        // Fall back to OpenAI
      }
    }

    // Fall back to OpenAI if Google API failed or is not available
    // Create a Blob from the base64 audio data
    const binaryData = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
    const blob = new Blob([binaryData], { type: "audio/webm" });
    
    // Prepare FormData for the API request
    const formData = new FormData();
    formData.append("file", blob, "audio.webm");
    formData.append("model", "whisper-1");
    
    // For non-English languages, specify the language code
    if (language !== "en" && language.length === 2) {
      formData.append("language", language);
    }
    
    // Request full transcription with punctuation
    formData.append("response_format", "json");
    formData.append("temperature", "0");

    // Call the OpenAI API for speech-to-text conversion
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY") || ""}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to convert speech to text");
    }

    const result = await response.json();
    
    return new Response(
      JSON.stringify({ text: result.text, source: "openai" }),
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
