
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const languageOptions = [
  { name: "English", code: "en-US" },
  { name: "Hindi", code: "hi-IN" },
  { name: "Marathi", code: "mr-IN" },
  { name: "Spanish", code: "es-ES" },
  { name: "French", code: "fr-FR" },
  { name: "German", code: "de-DE" },
  { name: "Italian", code: "it-IT" },
  { name: "Japanese", code: "ja-JP" },
  { name: "Chinese", code: "zh-CN" },
];

interface VoiceAssistantProps {
  className?: string;
  onMessage?: (message: string) => void;
}

export function VoiceAssistant({ className, onMessage }: VoiceAssistantProps) {
  const [message, setMessage] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [languageCode, setLanguageCode] = useState("en-US");
  const { toast } = useToast();

  const {
    isVoiceInputActive,
    isRecording,
    isListening,
    toggleVoiceInput,
    startListening,
    stopListening,
    changeRecognitionLanguage,
    currentLanguage
  } = useVoiceInput(setMessage);

  useEffect(() => {
    if (message && onMessage) {
      onMessage(message);
    }
  }, [message, onMessage]);

  useEffect(() => {
    changeRecognitionLanguage(languageCode);
  }, [languageCode]);

  const handleStopSpeaking = () => {
    const audio = document.querySelector('audio');
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsPlaying(false);
  };

  const handleSpeakMessage = async () => {
    if (!message.trim() || isPlaying) return;

    try {
      setIsPlaying(true);
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { 
          text: message,
          language: languageCode
        },
      });

      if (error) throw error;

      if (data?.audioContent) {
        const audioBlob = base64ToBlob(data.audioContent, 'audio/mp3');
        const url = URL.createObjectURL(audioBlob);
        
        const audioElement = document.createElement('audio');
        audioElement.src = url;
        audioElement.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(url);
        };
        audioElement.onerror = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(url);
          toast({
            title: "Audio Playback Error",
            description: "Failed to play the audio",
            variant: "destructive",
          });
        };
        
        document.body.appendChild(audioElement);
        await audioElement.play();
        
        audioElement.onended = () => {
          document.body.removeChild(audioElement);
          setIsPlaying(false);
          URL.revokeObjectURL(url);
        };
      }
    } catch (error) {
      console.error('Text-to-speech error:', error);
      toast({
        title: "Voice Playback Error",
        description: "Failed to convert text to speech. Please try again.",
        variant: "destructive",
      });
      setIsPlaying(false);
    }
  };

  const base64ToBlob = (base64: string, mimeType: string) => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, { type: mimeType });
  };

  const handleClearMessage = () => {
    setMessage("");
  };

  return (
    <div className={cn("flex flex-col gap-4 p-4 bg-card border rounded-lg shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Voice Assistant</h3>
        <Select value={languageCode} onValueChange={setLanguageCode}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {languageOptions.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex flex-col gap-2">
        <div className="min-h-[60px] p-3 bg-muted/50 rounded-md">
          {message || "Speak or click the microphone to start..."}
        </div>
        
        <div className="flex justify-between gap-2 mt-2">
          <div className="flex gap-2">
            <Button
              variant={isRecording || isListening ? "destructive" : "secondary"}
              size="icon"
              onClick={isListening ? stopListening : (isRecording ? toggleVoiceInput : startListening)}
              className={isRecording || isListening ? "animate-pulse" : ""}
            >
              {isRecording || isListening ? <MicOff /> : <Mic />}
            </Button>
            
            <Button
              variant={isPlaying ? "destructive" : "secondary"}
              size="icon"
              onClick={isPlaying ? handleStopSpeaking : handleSpeakMessage}
              disabled={!message.trim()}
            >
              {isPlaying ? <VolumeX /> : <Volume2 />}
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClearMessage} disabled={!message.trim()}>
              Clear
            </Button>
            
            {onMessage && (
              <Button onClick={() => onMessage(message)} disabled={!message.trim()}>
                Send
              </Button>
            )}
          </div>
        </div>
        
        {(isRecording || isListening) && (
          <div className="text-center mt-2 text-sm text-primary">
            {isRecording ? "Recording..." : "Listening..."}
          </div>
        )}
      </div>
    </div>
  );
}