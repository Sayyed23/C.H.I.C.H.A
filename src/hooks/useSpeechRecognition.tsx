
import { useEffect, useState, useCallback } from 'react';

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [recognition, setRecognition] = useState<any>(null);
  const [currentLanguage, setCurrentLanguage] = useState('en-US');

  useEffect(() => {
    if (!SpeechRecognition) {
      setIsError(true);
      setErrorMessage("Speech Recognition is not supported in this browser.");
      return;
    }

    const createRecognitionInstance = () => {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = currentLanguage;

      recognitionInstance.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      recognitionInstance.onerror = (event: any) => {
        setIsError(true);
        setErrorMessage(event.error);
        setIsListening(false);
      };

      recognitionInstance.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
        }
      };

      return recognitionInstance;
    };

    const recognitionInstance = createRecognitionInstance();
    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance && isListening) {
        recognitionInstance.stop();
      }
    };
  }, [currentLanguage]);

  const startListening = useCallback(() => {
    if (recognition) {
      setIsError(false);
      setErrorMessage('');
      recognition.start();
    }
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
    }
  }, [recognition]);

  const setLanguage = useCallback((languageCode: string) => {
    // Stop current recognition if running
    if (isListening && recognition) {
      recognition.stop();
    }
    
    // Update language
    setCurrentLanguage(languageCode);
    
    // Language will be applied when recognition is reinitialized in the useEffect
  }, [isListening, recognition]);

  return {
    isListening,
    transcript,
    isError,
    errorMessage,
    startListening,
    stopListening,
    setLanguage,
    currentLanguage
  };
};