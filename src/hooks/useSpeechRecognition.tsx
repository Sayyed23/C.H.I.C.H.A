import { useEffect, useState } from 'react';

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  const startListening = () => {
    if (recognition) recognition.start();
  };

  const stopListening = () => {
    if (recognition) recognition.stop();
  };

  useEffect(() => {
    if (!SpeechRecognition) {
      setIsError(true);
      setErrorMessage("Speech Recognition is not supported in this browser.");
      return;
    }

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      setIsError(true);
      setErrorMessage(event.error);
    };
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      setTranscript(finalTranscript);
      setInterimTranscript(interimTranscript);
    };
  }, [recognition]);

  return {
    isListening,
    transcript,
    interimTranscript,
    isError,
    errorMessage,
    startListening,
    stopListening,
  };
};