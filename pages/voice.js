import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { FiArrowLeft, FiMic, FiVolume2, FiVolumeX, FiAlertCircle } from 'react-icons/fi';
// Comment out AudioWaveform as requested
// import AudioWaveform from '../components/AudioWaveform';

export default function VoiceInteraction() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [microphoneSupported, setMicrophoneSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userMessage, setUserMessage] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const [audioUrl, setAudioUrl] = useState(null);

  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  // Initialize browser-only objects after component mounts
  useEffect(() => {
    // Create audio object only on the client side
    audioRef.current = new Audio();
    
    // Set up audio playback events
    if (audioRef.current) {
      audioRef.current.onplay = () => setIsSpeaking(true);
      audioRef.current.onended = () => setIsSpeaking(false);
      audioRef.current.onerror = () => {
        setIsSpeaking(false);
        setErrorMessage('Audio playback error');
      };
    }

    // Initialize speech recognition (local)
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setIsListening(false);
          setUserMessage(transcript);
          processTranscript(transcript);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
          setErrorMessage(`Speech recognition error: ${event.error}`);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };

        setMicrophoneSupported(true);
      } else {
        setMicrophoneSupported(false);
        setErrorMessage('Speech recognition not supported in your browser');
      }
    }
  }, []);

  // Try to get userName from localStorage on first load
  useEffect(() => {
    const storedName = localStorage.getItem('crazeAI_userName');
    if (storedName) {
      setUserName(storedName);
      setIsFirstMessage(false);
    }

    // Initialize welcome message
    setAiResponse("Click the microphone to start talking with CrazeAI");

    // Check for microphone support
    if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setMicrophoneSupported(true);
      
      // Check for microphone permission
      navigator.permissions.query({ name: 'microphone' })
        .then(permissionStatus => {
          if (permissionStatus.state === 'denied') {
            setErrorMessage('Microphone access denied');
            setMicrophoneSupported(false);
          }
          
          permissionStatus.onchange = () => {
            setMicrophoneSupported(permissionStatus.state !== 'denied');
            if (permissionStatus.state !== 'denied') {
              setErrorMessage('');
            } else {
              setErrorMessage('Microphone access denied');
            }
          };
        })
        .catch(() => {
          // Some browsers may not support permissions API
          // We'll still try to use the microphone
        });
    } else {
      setErrorMessage('Microphone not supported in this browser');
    }

    return () => {
      // Clean up
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  // Extract name from speech
  const extractNameFromMessage = (message) => {
    // Common patterns for name introduction
    const patterns = [
      /my name is (\w+)/i,
      /i am (\w+)/i,
      /i'm (\w+)/i,
      /call me (\w+)/i,
      /name's (\w+)/i,
      /(\w+) is my name/i,
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    if (isFirstMessage) {
      const words = message.split(/\s+/);
      const possibleName = words.find(word => 
        word.length > 1 && 
        word[0] === word[0].toUpperCase() && 
        word.slice(1) === word.slice(1).toLowerCase()
      );
      
      if (possibleName) {
        return possibleName;
      }
      
      if (words[0] && words[0].length > 1) {
        return words[0];
      }
    }
    
    return null;
  };

  // Start listening - now called on mousedown/touchstart
  const startListening = () => {
    setUserMessage('');
    setErrorMessage('');
    
    try {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
        
        // Update UI to indicate user should speak
        setAiResponse("I'm listening... Speak now and release when done");
      } else {
        throw new Error('Speech recognition not initialized');
      }
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setErrorMessage('Failed to start speech recognition: ' + error.message);
    }
  };

  // Stop listening - now called on mouseup/touchend
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        setLoading(true); // Start loading state when mic is released
      } catch (e) {
        console.log('Error stopping speech recognition:', e);
      }
      setIsListening(false);
    }
  };

  const processTranscript = async (transcript) => {
    setLoading(true);
    
    try {
      // Process name detection same as before
      if (isFirstMessage) {
        const extractedName = extractNameFromMessage(transcript);
        if (extractedName) {
          setUserName(extractedName);
          localStorage.setItem('crazeAI_userName', extractedName);
        }
        setIsFirstMessage(false);
      } else if (!userName) {
        const extractedName = extractNameFromMessage(transcript);
        if (extractedName) {
          setUserName(extractedName);
          localStorage.setItem('crazeAI_userName', extractedName);
        }
      }
      
      // Send the transcribed text to our chat API (no change here)
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: transcript,
          userName: userName || '',
          isFirstMessage: isFirstMessage,
        }),
      });
      
      if (!chatResponse.ok) {
        throw new Error('Failed to get AI response');
      }
      
      const { reply, detectedName } = await chatResponse.json();
      setAiResponse(reply);
      
      // If name was detected in the API, update it
      if (detectedName && !userName) {
        setUserName(detectedName);
        localStorage.setItem('crazeAI_userName', detectedName);
      }
      
      // If audio is enabled, generate speech
      if (audioEnabled) {
        // Notice we don't set loading to false here, we'll do it when speech starts
        speakResponse(reply);
      } else {
        // If audio is disabled, we can end the loading state immediately
        setLoading(false);
      }
    } catch (error) {
      console.error('Error processing transcript:', error);
      setErrorMessage(`Error: ${error.message}`);
      setAiResponse("Ah! System don crash. Na your fault! Try again later, mumu!");
      // On error, we should end the loading state
      setLoading(false);
    }
    // Removed the 'finally' block that was setting loading to false
  };

  // Update the speakResponse method to manage loading state
  const speakResponse = async (text) => {
    try {
      // Check if audio is supported
      if (!audioRef.current) {
        setLoading(false); // End loading if no audio support
        return;
      }
      
      // Clear previous audio
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      
      // Stop any current playback
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // Get speech audio from OpenAI
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'onyx' }), // onyx is a deep male voice
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }
      
      // Create blob from response
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      
      // Set up event handlers before playing
      audioRef.current.onplay = () => {
        setIsSpeaking(true);
        setLoading(false); // End loading state when speech begins
      };
      
      // Play the audio
      audioRef.current.src = url;
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err);
        setLoading(false); // End loading on playback error
      });
    } catch (error) {
      console.error('Error generating speech:', error);
      setErrorMessage('Failed to generate speech');
      setLoading(false); // End loading on error
    }
  };

  const toggleAudio = () => {
    if (isSpeaking) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
    setAudioEnabled(!audioEnabled);
  };

  return (
    <>
      <Head>
        <title>Voice Chat with CrazeAI</title>
        <meta name="description" content="Talk with CrazeAI - the rudest Nigerian AI assistant" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>

      <div className="flex flex-col h-screen bg-gradient-to-br from-green-50 to-gray-100">
        <header className="bg-gradient-to-r from-green-700 to-green-600 text-white p-3 md:p-4 shadow-md">
          <div className="container mx-auto px-2">
            <div className="flex items-center">
              <Link href="/" className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full mr-2">
                <FiArrowLeft size={24} />
              </Link>
              <div>
                <h1 className="text-xl md:text-3xl font-bold flex items-center">
                  Voice CrazeAI <span className="ml-2 text-xl md:text-2xl">🇳🇬</span>
                </h1>
                <p className="text-xs md:text-base opacity-80">Press and hold to talk!</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto max-w-3xl px-2 md:px-0 py-4 flex flex-col">
          <div className="flex-1 bg-white rounded-xl shadow-lg overflow-hidden mb-4 p-4 md:p-6 flex flex-col justify-center items-center">
            {/* Error message */}
            {errorMessage && (
              <div className="mb-4 text-yellow-700 text-sm flex items-center gap-1 bg-yellow-50 p-3 rounded">
                <FiAlertCircle className="flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            
            {/* Voice interaction area - simplified to just show status */}
            <div className="flex flex-col items-center justify-center gap-8 text-center">
              {/* Status indicator - simplified to remove redundant processing info */}
              <div className="text-lg text-gray-700 font-medium max-w-sm">
                {isListening ? (
                  <span>Listening... Release when done</span>
                ) : isSpeaking ? (
                  <span>Speaking...</span>
                ) : loading ? (
                  <span>Processing...</span>
                ) : (
                  <span>Press and hold to talk</span>
                )}
              </div>
              
              {/* Controls with bigger mic button and press/hold events */}
              <div className="flex flex-col items-center gap-6">
                {/* Big microphone button - now using mousedown/up events */}
                <div className={`relative ${loading ? 'animate-pulse' : ''}`}>
                  <button
                    onMouseDown={startListening}
                    onMouseUp={stopListening}
                    onMouseLeave={stopListening}
                    onTouchStart={startListening}
                    onTouchEnd={stopListening}
                    onTouchCancel={stopListening}
                    disabled={loading || isSpeaking || !microphoneSupported}
                    className={`p-10 rounded-full transition-colors ${
                      !microphoneSupported
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : isListening
                          ? "bg-red-500 text-white scale-110 transform transition-transform"
                          : "bg-green-600 text-white hover:bg-green-700"
                    } ${(loading || isSpeaking) ? "opacity-70" : ""} shadow-lg`}
                    title={isListening ? "Release to stop" : "Press and hold to talk"}
                  >
                    <FiMic size={56} />
                  </button>
                  
                  {/* Loading spinner around mic button */}
                  {loading && (
                    <div className="absolute inset-0 rounded-full border-4 border-green-200 border-t-green-600 animate-spin"></div>
                  )}
                </div>
                
                {/* Audio toggle button - Commented out as requested but kept in code */}
                {/* 
                <button
                  onClick={toggleAudio}
                  className={`p-4 rounded-full transition-colors ${
                    audioEnabled 
                      ? "bg-green-100 text-green-700 hover:bg-green-200" 
                      : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                  }`}
                  title={audioEnabled ? "Mute audio" : "Enable audio"}
                >
                  {audioEnabled ? <FiVolume2 size={28} /> : <FiVolumeX size={28} />}
                </button>
                */}
              </div>
            </div>
          </div>
        </main>

        <footer className="bg-green-900 text-white p-2 md:p-3 text-center text-xs md:text-sm">
          <p>Built by Elasto Web Services | No be by force to use am o!</p>
        </footer>
      </div>
    </>
  );
}
