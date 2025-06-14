
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";

export const uploadChatImage = async (file: File): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    if (!publicUrl) throw new Error("Failed to get public URL for uploaded image.");
    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

export const saveMessageToDb = async (chatId: string, content: string, isBot: boolean): Promise<void> => {
  await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      content: content,
      is_bot: isBot,
    });
};

export const callGeminiAI = async (
  prompt: string, 
  targetLanguage?: string, 
  model: string = "gemini-pro-1.5"
): Promise<{ response: string; sources?: any[]; model?: string; translatedTo?: string }> => {
  const { data, error } = await supabase.functions.invoke('chat-with-gemini', {
    body: {
      prompt: prompt,
      targetLanguage: targetLanguage,
      model: model
    },
  });

  if (error) {
    console.error('Supabase function error calling Gemini:', error);
    throw new Error(`Supabase function error: ${error.message || 'Unknown error'}`);
  }

  if (!data || !data.response) {
    throw new Error('Received empty response from AI');
  }
  return data;
};

export const fetchChatMessagesFromDb = async (chatId: string): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading chat messages from DB:', error);
    throw error;
  }

  return data.map(msg => ({
    content: msg.content,
    isBot: msg.is_bot,
    // Ensure other potential fields from Message interface are handled if they exist in db
    // sources: msg.sources, 
    // model: msg.model,
    // translatedTo: msg.translatedTo
  }));
};
