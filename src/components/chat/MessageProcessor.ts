
import { handleWebSearch } from "./handlers/WebSearchHandler";
import { handleNavigation } from "./handlers/NavigationHandler";
import { handleWeather } from "./handlers/WeatherHandler";
import { handleDistance } from "./handlers/DistanceHandler";
import { handleLocation } from "./handlers/LocationHandler";
import { handleImageGeneration } from "./handlers/ImageHandler";

export interface MessageProcessorOptions {
  onSend: (message: string, options?: { targetLanguage?: string }) => void;
}

export const MessageProcessor = (options: MessageProcessorOptions) => {
  const { onSend } = options;

  const processMessage = async (
    message: string, 
    imageUrls: string[] = [], 
    selectedLanguage: string | null = null
  ) => {
    // Try each handler in order
    if (await handleWebSearch(message, onSend)) return true;
    if (handleNavigation(message, onSend)) return true;
    if (await handleWeather(message, onSend)) return true;
    if (await handleDistance(message, onSend)) return true;
    if (await handleLocation(message, onSend)) return true;
    if (await handleImageGeneration(message, imageUrls, onSend)) return true;

    // If no special processing was done, combine message and image URLs into a single message string
    const fullMessage = [
      message,
      ...imageUrls.map(url => `![Image](${url})`)
    ].filter(Boolean).join('\n');

    // Pass selected language if available
    onSend(fullMessage, { targetLanguage: selectedLanguage || undefined });
    return true;
  };

  return { processMessage };
};
