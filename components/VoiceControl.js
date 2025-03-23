import { useState, useEffect, useRef } from 'react';
import { FiMic, FiMicOff, FiVolume2, FiVolumeX, FiAlertTriangle } from 'react-icons/fi';
import AudioWaveform from './AudioWaveform';

const VoiceControl = ({ onSpeechResult, onVoiceStart, isProcessing, lastResponse }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [audioSupported, setAudioSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const utteranceRef = useRef(null);

  // Check for speech recognition and TTS support
  useEffect(() => {
    // Check for speech recognition
    const hasSpeechRecognition = 
      'SpeechRecognition' in window || 
      'webkitSpeechRecognition' in window;
    
    setSpeechSupported(hasSpeechRecognition);
    
    // Check for speech synthesis
    const hasSpeechSynthesis = 'speechSynthesis' in window;
    setAudioSupported(hasSpeechSynthesis);
    
    if (hasSpeechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
    
    // Initialize error message
    if (!hasSpeechRecognition && !hasSpeechSynthesis) {
      setErrorMessage('Voice features not supported in your browser');
    } else if (!hasSpeechRecognition) {
      setErrorMessage('Speech recognition not supported');
    } else if (!hasSpeechSynthesis) {
      setErrorMessage('Text-to-speech not supported');
    }
    
    // Check for microphone permission
    if (hasSpeechRecognition) {
      navigator.permissions.query({ name: 'microphone' })
        .then(permissionStatus => {
          if (permissionStatus.state === 'denied') {
            setErrorMessage('Microphone access denied');
            setSpeechSupported(false);
          }
          
          permissionStatus.onchange = () => {
            if (permissionStatus.state === 'denied') {
              setErrorMessage('Microphone access denied');
              setSpeechSupported(false);
            } else {
              if (hasSpeechRecognition) {
                setSpeechSupported(true);
                setErrorMessage('');
              }
            }
          };
        })
        .catch(() => {
          // Some browsers may not support permissions API
          // We'll attempt to initialize speech recognition anyway
        });
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!speechSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onSpeechResult(transcript);
      setIsListening(false);
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      
      if (event.error === 'not-allowed') {
        setErrorMessage('Microphone access denied');
        setSpeechSupported(false);
      } else if (event.error === 'network') {
        setErrorMessage('Network error. Voice features unavailable offline.');
      } else {
        setErrorMessage(`Speech recognition error: ${event.error}`);
      }
      
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.log('Error aborting speech recognition:', e);
        }
      }
    };
  }, [speechSupported, onSpeechResult]);

  // Speak the AI response when it changes
  useEffect(() => {
    if (lastResponse && audioEnabled && audioSupported && !isProcessing && !isListening) {
      speakText(lastResponse);
    }
  }, [lastResponse, audioEnabled, audioSupported, isProcessing, isListening]);

  const toggleListening = () => {
    if (!speechSupported) {
      // Show a helpful message about browser compatibility
      alert('Speech recognition is not supported in your browser. Try Chrome or Edge for best experience.');
      return;
    }
    
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        if (onVoiceStart) onVoiceStart();
        setErrorMessage(''); // Clear any previous errors
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setErrorMessage('Could not start recording');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Error stopping speech recognition:', e);
      }
      setIsListening(false);
    }
  };

  const speakText = (text) => {
    if (!audioEnabled || !audioSupported) return;
    
    // Stop any ongoing speech
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
    }
    
    // Create a new utterance
    utteranceRef.current = new SpeechSynthesisUtterance(text);
    
    // Find a suitable voice (preferably one that sounds Nigerian-ish)
    const voices = synthRef.current.getVoices();
    const englishVoices = voices.filter(voice => voice.lang.includes('en'));
    
    // Try to find a voice that might sound somewhat African
    // This is a best effort - most systems won't have a perfect Nigerian accent
    const preferredVoices = englishVoices.filter(voice => 
      voice.name.includes('Nigerian') || 
      voice.name.includes('African') || 
      voice.name.includes('Ghana')
    );
    
    if (preferredVoices.length > 0) {
      utteranceRef.current.voice = preferredVoices[0];
    } else if (englishVoices.length > 0) {
      utteranceRef.current.voice = englishVoices[0];
    }
    
    // Make it sound more natural for Nigerian slang
    utteranceRef.current.rate = 0.9;
    utteranceRef.current.pitch = 1.1;
    
    // Events
    utteranceRef.current.onstart = () => setIsSpeaking(true);
    utteranceRef.current.onend = () => setIsSpeaking(false);
    utteranceRef.current.onerror = (error) => {
      console.error('Speech synthesis error:', error);
      setIsSpeaking(false);
      setErrorMessage('Text-to-speech error');
    };
    
    // Speak
    synthRef.current.speak(utteranceRef.current);
  };

  const toggleAudio = () => {
    if (isSpeaking && audioSupported) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
    setAudioEnabled(!audioEnabled);
  };

  return (
    <div className="flex flex-col w-full">
      {errorMessage && (
        <div className="mb-2 text-yellow-700 text-sm flex items-center gap-1 bg-yellow-50 p-2 rounded">
          <FiAlertTriangle className="flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      
      <div className="flex items-center justify-center md:justify-start gap-3">
        <button
          onClick={toggleAudio}
          disabled={!audioSupported}
          className={`p-2 rounded-full transition-colors ${
            !audioSupported 
              ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
              : audioEnabled 
                ? "bg-green-100 text-green-700 hover:bg-green-200 active:bg-green-300" 
                : "bg-gray-200 text-gray-500 hover:bg-gray-300 active:bg-gray-400"
          } touch-manipulation`}
          title={audioEnabled ? "Mute audio" : "Enable audio"}
        >
          {audioEnabled ? <FiVolume2 size={24} /> : <FiVolumeX size={24} />}
        </button>
        
        <button
          onClick={toggleListening}
          disabled={isProcessing || isSpeaking || !speechSupported}
          className={`p-4 rounded-full transition-colors ${
            !speechSupported
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : isListening
                ? "bg-red-500 text-white animate-pulse"
                : "bg-green-600 text-white hover:bg-green-700 active:bg-green-800"
          } ${(isProcessing || isSpeaking) ? "opacity-50 cursor-not-allowed" : ""} touch-manipulation`}
          title={
            !speechSupported 
              ? "Speech recognition not supported" 
              : isListening 
                ? "Stop recording" 
                : "Start recording"
          }
        >
          {isListening ? <FiMicOff size={28} /> : <FiMic size={28} />}
        </button>
        
        {isListening && (
          <span className="text-sm text-gray-600">Listening...</span>
        )}
        {isSpeaking && (
          <span className="text-sm text-gray-600">Speaking...</span>
        )}
      </div>

      {/* Audio visualization waveform */}
      <AudioWaveform isRecording={isListening} />
    </div>
  );
};

export default VoiceControl;
