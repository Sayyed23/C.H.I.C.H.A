
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { supabase } from "@/integrations/supabase/client";

export const useVoiceInput = (setMessage: React.Dispatch<React.SetStateAction<string>>) => {
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(false);
  const { toast } = useToast();
  
  const { 
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    getBase64Audio
  } = useAudioRecorder();

  const { 
    transcript, 
    isListening, 
    startListening, 
    stopListening,
    isError,
    errorMessage,
    setLanguage,
    currentLanguage
  } = useSpeechRecognition();
  
  useEffect(() => {
    if (transcript && transcript.trim()) {
      setMessage(prev => prev + (prev ? ' ' : '') + transcript);
    }
  }, [transcript, setMessage]);

  useEffect(() => {
    if (isError) {
      toast({
        title: "Speech Recognition Error",
        description: errorMessage || "An error occurred with speech recognition",
        variant: "destructive",
      });
    }
  }, [isError, errorMessage, toast]);

  useEffect(() => {
    if (audioBlob) {
      handleVoiceTranscription();
    }
  }, [audioBlob]);
  
  const handleVoiceTranscription = async () => {
    if (!audioBlob) return;

    try {
      const base64Audio = await getBase64Audio();
      if (!base64Audio) return;

      toast({
        title: "Processing Audio",
        description: "Converting your speech to text...",
      });

      const { data, error } = await supabase.functions.invoke('speech-to-text', {
        body: { 
          audioData: base64Audio,
          language: currentLanguage
        }
      });

      if (error) throw error;

      if (data?.text) {
        setMessage(prev => prev + (prev ? ' ' : '') + data.text);
        toast({
          title: "Speech Detected",
          description: `"${data.text}"`,
        });
      } else {
        toast({
          title: "No Speech Detected",
          description: "Could not detect any speech in the recording.",
        });
      }
    } catch (error) {
      console.error('Voice transcription error:', error);
      toast({
        title: "Transcription Error",
        description: "Failed to convert your speech to text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVoiceInputActive(false);
    }
  };

  const toggleVoiceInput = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      setIsVoiceInputActive(true);
      await startRecording();
    }
  };
  
  const changeRecognitionLanguage = (languageCode: string) => {
    setLanguage(languageCode);
  };

  return {
    isVoiceInputActive,
    isRecording,
    isListening,
    toggleVoiceInput,
    startListening,
    stopListening,
    changeRecognitionLanguage,
    currentLanguage
  };
};