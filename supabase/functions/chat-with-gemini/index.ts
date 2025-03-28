// For TypeScript support while editing, using Deno URL imports
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";
import { corsHeaders } from "../_shared/cors.ts";

// Initialize Gemini with API key
const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);

// Simple translation function
async function translateText(text: string, targetLanguage: string, modelName = "gemini-pro-1.5") {
  if (!targetLanguage) return { translatedText: text };

  console.log(`Translating to ${targetLanguage} using ${modelName}`);
  try {
    // Use the specified model for translation
    const translationModel = genAI.getGenerativeModel({ model: modelName });
    const prompt = `Translate the following text to ${targetLanguage}. Respond with only the translated text:
    
    "${text}"`;
    
    const result = await translationModel.generateContent(prompt);
    const translatedText = result.response.text();
    return { translatedText };
  } catch (error) {
    console.error("Translation error:", error);
    return { error: "Translation failed", translatedText: text };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, imageUrl, voice, targetLanguage, model: requestedModel } = await req.json();
    
    // Use the requested model or default to gemini-pro-1.5
    const modelName = requestedModel || "gemini-pro-1.5";
    console.log(`Using model: ${modelName}`);
    
    // Get the appropriate model
    const model = genAI.getGenerativeModel({ model: modelName });
    
    // Check if this is a code generation request
    const isCodeRequest = prompt.toLowerCase().includes("generate code") || 
                         prompt.toLowerCase().includes("write code") ||
                         prompt.toLowerCase().includes("code example") ||
                         prompt.toLowerCase().includes("programming") ||
                         prompt.toLowerCase().includes("function") ||
                         prompt.toLowerCase().includes("implementation");

    // Detect language request patterns
    const promptLower = prompt.toLowerCase();
    
    // Check if the user is requesting a specific language
    const requestedLanguage = promptLower.includes("in urdu") || promptLower.includes("to urdu") || 
                             promptLower.includes("using urdu") || promptLower.includes("speak urdu") || 
                             promptLower.includes("in the urdu language") || promptLower.includes("urdu language") || 
                             promptLower.includes("urdu translation") ? "ur" :
                              promptLower.includes("in hindi") || promptLower.includes("to hindi") || 
                              promptLower.includes("using hindi") || promptLower.includes("speak hindi") ||
                              promptLower.includes("in the hindi language") ? "hi" :
                              promptLower.includes("in marathi") || promptLower.includes("to marathi") || 
                              promptLower.includes("using marathi") || promptLower.includes("in the marathi language") ? "mr" :
                              promptLower.includes("in sanskrit") || promptLower.includes("to sanskrit") || 
                              promptLower.includes("using sanskrit") || promptLower.includes("in the sanskrit language") ? "sa" :
                              promptLower.includes("in english") || promptLower.includes("to english") || 
                              promptLower.includes("using english") || promptLower.includes("speak english") ||
                              promptLower.includes("in the english language") ? "en" :
                              promptLower.includes("in arabic") || promptLower.includes("to arabic") || 
                              promptLower.includes("using arabic") || promptLower.includes("speak arabic") ||
                              promptLower.includes("in the arabic language") || promptLower.includes("arabic language") ? "ar" :
                              null;
    
    // Check if it's a translation request
    const isTranslationRequest = promptLower.includes("translate") ||
                                promptLower.includes("translation") ||
                                promptLower.includes("convert to") ||
                                promptLower.includes("in hindi") ||
                                promptLower.includes("in marathi") ||
                                promptLower.includes("in sanskrit") ||
                                promptLower.includes("in urdu") ||
                                promptLower.includes("in english") ||
                                promptLower.includes("in arabic") ||
                                promptLower.includes("arabic language") ||
                                promptLower.includes("respond in urdu") ||
                                promptLower.includes("answer in urdu") ||
                                promptLower.includes("reply in urdu") ||
                                promptLower.includes("speak urdu") ||
                                promptLower.includes("respond in english") ||
                                promptLower.includes("answer in english") ||
                                promptLower.includes("reply in english") ||
                                promptLower.includes("respond in arabic") ||
                                promptLower.includes("answer in arabic") ||
                                promptLower.includes("reply in arabic");

    // Enhance prompt for code generation
    let enhancedPrompt = prompt;
    if (isCodeRequest) {
      enhancedPrompt = `As a coding assistant, please help with the following request. 
      Provide clean, well-documented code with explanations.
      Include:
      - Code implementation
      - Brief explanation of the approach
      - Best practices and considerations
      - Any important notes about error handling or edge cases
      
      Request: ${prompt}`;
    } else if (isTranslationRequest) {
      enhancedPrompt = `As a multilingual assistant, please translate the following text accurately while preserving meaning and context:
      
      Text: ${prompt}
      
      If the target language isn't specified, please ask which language to translate to.`;
    } else if (voice === "assistant") {
      enhancedPrompt = `As CHICHA, a helpful virtual assistant, please respond in a friendly, conversational tone to the following:
      
      ${prompt}
      
      Provide concise but comprehensive responses and offer follow-up suggestions when appropriate.`;
    }

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: "You are CHICHA, a helpful AI assistant powered by Gemini. You're knowledgeable about technology, programming, web development, and general knowledge topics. When providing code examples, always format them properly with markdown and include explanations. For translations, preserve the original meaning as much as possible.",
        },
        {
          role: "model",
          parts: "I understand. I'll help users with their questions and requests across various domains including technology, programming, and general knowledge. I'll provide well-formatted code with clear explanations when needed, and accurate translations that preserve the original meaning. I'll use markdown for proper formatting and ensure my responses are clear, helpful, and conversational.",
        },
      ],
    });

    const result = await chat.sendMessage(enhancedPrompt);
    let response = result.response.text();

    console.log("Generated response:", response);

    // Translate the response if targetLanguage is provided or requested in prompt
    const finalTargetLanguage = targetLanguage || requestedLanguage;
    
    if (finalTargetLanguage) {
      console.log(`Translating response to ${finalTargetLanguage}`);
      try {
        const translationResult = await translateText(response, finalTargetLanguage, modelName);
        
        if (translationResult.translatedText) {
          console.log("Translation successful");
          response = translationResult.translatedText;
        } else if (translationResult.error) {
          console.error("Translation error:", translationResult.error);
          // Continue with original response if translation fails
        }
      } catch (translationError) {
        console.error("Error during translation:", translationError);
        // Continue with original response if translation fails
      }
    }

    return new Response(
      JSON.stringify({
        response: response,
        model: modelName,
        translatedTo: finalTargetLanguage
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});