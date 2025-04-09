
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, language = "en", voice = "en-US-Standard-D" } = await req.json();
    
    if (!text) {
      throw new Error("No text provided");
    }

    // Determine voice based on language for better speech quality
    let selectedVoice = voice;
    if (language === "ja") {
      selectedVoice = "ja-JP-Standard-A"; // Japanese female voice
    } else if (language === "zh") {
      selectedVoice = "zh-CN-Standard-A"; // Chinese voice
    }

    // First try using Google's Text-to-Speech API
    const googleApiKey = Deno.env.get("GOOGLE_TRANSLATE_API_KEY");
    if (googleApiKey) {
      try {
        // Determine the Google TTS language code
        let googleLangCode = language;
        if (language.length === 2) {
          // Convert ISO 639-1 codes to Google's format
          const langMap: Record<string, string> = {
            'en': 'en-US',
            'hi': 'hi-IN',
            'mr': 'mr-IN',
            'sa': 'sa-IN', // Sanskrit
            'ar': 'ar-XA', // Arabic
            'ur': 'ur-PK', // Urdu
            'es': 'es-ES',
            'fr': 'fr-FR',
            'de': 'de-DE',
            'it': 'it-IT',
            'ja': 'ja-JP',
            'zh': 'zh-CN'
          };
          googleLangCode = langMap[language] || 'en-US';
        }

        // Handle long text by chunking if necessary
        const maxGoogleTTSLength = 5000;
        if (text.length > maxGoogleTTSLength) {
          // For Japanese text, we need to be even more careful with splitting
          const chunks = language === 'ja' ? 
            splitJapaneseTextIntoChunks(text, maxGoogleTTSLength) : 
            splitTextIntoChunks(text, maxGoogleTTSLength);
            
          const audioChunks: string[] = [];
          
          for (const chunk of chunks) {
            // Call the Google Cloud Text-to-Speech API for each chunk
            const response = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": googleApiKey
              },
              body: JSON.stringify({
                input: { text: chunk },
                voice: { 
                  languageCode: googleLangCode,
                  name: selectedVoice
                },
                audioConfig: { audioEncoding: "MP3" }
              }),
            });

            if (!response.ok) {
              console.error(`Google TTS failed for chunk: ${await response.text()}`);
              throw new Error(`Google TTS failed: ${await response.text()}`);
            }

            const data = await response.json();
            audioChunks.push(data.audioContent);
          }
          
          // Return the first chunk for now (ideally we would concatenate the audio)
          // Client-side code will use browser TTS for very long text
          return new Response(
            JSON.stringify({ 
              audioContent: audioChunks[0], // Using first chunk for simplicity
              format: "mp3",
              source: "google",
              fullText: text, // Send the full text back for browser TTS fallback
              hasMultipleChunks: audioChunks.length > 1
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        } else {
          // For shorter text, process normally
          const response = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": googleApiKey
            },
            body: JSON.stringify({
              input: { text: text },
              voice: { 
                languageCode: googleLangCode,
                name: selectedVoice
              },
              audioConfig: { audioEncoding: "MP3" }
            }),
          });

          if (response.ok) {
            const data = await response.json();
            
            return new Response(
              JSON.stringify({ 
                audioContent: data.audioContent,
                format: "mp3",
                source: "google",
                fullText: text // Send the full text back for browser TTS fallback
              }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          } else {
            // Log the error but don't throw - we'll try OpenAI next
            console.error("Google TTS failed:", await response.text());
          }
        }
      } catch (googleError) {
        console.error("Google TTS error:", googleError);
      }
    }
    
    // Fall back to browser TTS for all languages as OpenAI has quota issues
    return new Response(
      JSON.stringify({ 
        useBrowserSpeech: true,
        text: text,
        language: language,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Text to speech error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        useBrowserSpeech: true 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper function to split text into chunks at sentence boundaries
function splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let currentChunk = '';
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length <= maxChunkSize) {
      currentChunk += sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      // If a single sentence exceeds maxChunkSize, we need to split it by words
      if (sentence.length > maxChunkSize) {
        const words = sentence.split(' ');
        currentChunk = '';
        for (const word of words) {
          if (currentChunk.length + word.length + 1 <= maxChunkSize) {
            currentChunk += (currentChunk ? ' ' : '') + word;
          } else {
            chunks.push(currentChunk);
            currentChunk = word;
          }
        }
      } else {
        currentChunk = sentence;
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

// Special function for Japanese text which doesn't use spaces between words
function splitJapaneseTextIntoChunks(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  
  // Split by sentence-ending punctuation for Japanese
  // Japanese sentences typically end with characters like "。", "！", "？"
  const sentences = text.split(/([。！？]+)/g).filter(Boolean);
  
  let currentChunk = '';
  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = sentences[i];
    const punctuation = i + 1 < sentences.length ? sentences[i + 1] : '';
    const fullSentence = sentence + punctuation;
    
    if (currentChunk.length + fullSentence.length <= maxChunkSize) {
      currentChunk += fullSentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      // If a single sentence is too long, split it into smaller pieces
      if (fullSentence.length > maxChunkSize) {
        // Split by characters (since Japanese doesn't use spaces)
        for (let j = 0; j < fullSentence.length; j += maxChunkSize) {
          const piece = fullSentence.substring(j, j + maxChunkSize);
          chunks.push(piece);
        }
      } else {
        currentChunk = fullSentence;
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}
