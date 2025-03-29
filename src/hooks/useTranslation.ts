import { supabase } from "@/integrations/supabase/client";

interface TranslationOptions {
  targetLanguage?: string;
  imageUrl?: string | null;
}

export const useTranslation = () => {
  const translateText = async (content: string, options?: TranslationOptions) => {
    const { data, error } = await supabase.functions.invoke('chat-with-gemini', {
      body: { 
        prompt: content, 
        imageUrl: options?.imageUrl,
        targetLanguage: options?.targetLanguage 
      },
    });

    if (error) throw error;
    return data;
  };

  return { translateText };
};
