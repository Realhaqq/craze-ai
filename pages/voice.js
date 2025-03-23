import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { FiArrowLeft, FiMic, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
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
  // Add new states for timeout handling
  const [timedOut, setTimedOut] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const timeoutRef = useRef(null);

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
      
      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Add a new useEffect to handle mobile-specific browser behaviors
  useEffect(() => {
    // Some mobile browsers (especially iOS) require special handling
    const isMobile = /iPhone|iPad|iPod|Android/i.test(
      typeof navigator !== 'undefined' ? navigator.userAgent : ''
    );
    
    // For mobile browsers, we'll use a more aggressive timeout strategy
    if (isMobile) {
      // If we're in processing state for too long, force reset
      const mobileProcessingTimeout = setTimeout(() => {
        if (loading) {
          console.log('Mobile timeout triggered - resetting state');
          setLoading(false);
          setTimedOut(true);
        }
      }, 15000); // 15 seconds timeout for mobile
      
      return () => clearTimeout(mobileProcessingTimeout);
    }
  }, [loading]);

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

  // Add a new function to request microphone permission separately
  const requestMicrophonePermission = async () => {
    try {
      // This will trigger the permission prompt without starting recording
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicrophoneSupported(true);
      setErrorMessage('');
      return true;
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      setErrorMessage('Microphone access denied. Please enable it in your browser settings.');
      setMicrophoneSupported(false);
      return false;
    }
  };

  // Modify the startListening function to handle permissions properly
  const startListening = async () => {
    setUserMessage('');
    setErrorMessage('');
    
    try {
      // First check if we need to request permission
      if (typeof navigator !== 'undefined' && navigator.permissions) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
        
        if (permissionStatus.state === 'prompt') {
          // Request permission explicitly before starting recognition
          const permissionGranted = await requestMicrophonePermission();
          if (!permissionGranted) return;
        } else if (permissionStatus.state === 'denied') {
          setErrorMessage('Microphone access denied. Please enable it in your browser settings.');
          return;
        }
      }

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
      
      // If error is related to permission, try to explicitly request it
      if (error.name === 'NotAllowedError') {
        await requestMicrophonePermission();
      }
    }
  };

  // Replace the press-and-hold approach with a toggle button for better mobile compatibility
  const toggleListening = async () => {
    if (!microphoneSupported) {
      const permissionGranted = await requestMicrophonePermission();
      if (!permissionGranted) {
        alert('Microphone access is required for voice chat. Please enable it in your browser settings.');
        return;
      }
    }
    
    if (isListening) {
      stopListening();
    } else {
      await startListening();
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

  // Fix the processTranscript function to be more reliable on mobile
  const processTranscript = async (transcript) => {
    // Clear any existing timeouts first
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setLoading(true);
    setTimedOut(false);
    setLastTranscript(transcript);
    
    console.log('Processing transcript:', transcript);
    
    // Set a shorter timeout for mobile devices
    const timeoutDuration = isMobileDevice() ? 15000 : 20000; // 15s for mobile, 20s for desktop
    
    timeoutRef.current = setTimeout(() => {
      console.log('Request timed out after', timeoutDuration, 'ms');
      if (loading) {
        setTimedOut(true);
        setLoading(false);
        setErrorMessage('Request timed out. Tap the retry button to try again.');
      }
    }, timeoutDuration);
    
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
      
      console.log('Sending request to chat API');
      const controller = new AbortController();
      const signal = controller.signal;
      
      // Create a separate timeout for the fetch operation
      const fetchTimeoutId = setTimeout(() => controller.abort(), timeoutDuration - 1000);
      
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: transcript,
          userName: userName || '',
          isFirstMessage: isFirstMessage,
        }),
        signal
      });
      
      clearTimeout(fetchTimeoutId);
      
      // Clear the timeout as we got a response
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      console.log('Received response from API');
      
      if (!chatResponse.ok) {
        throw new Error(`Failed to get AI response: ${chatResponse.status}`);
      }
      
      const data = await chatResponse.json();
      console.log('Parsed JSON response');
      setAiResponse(data.reply);
      
      // If name was detected in the API, update it
      if (data.detectedName && !userName) {
        setUserName(data.detectedName);
        localStorage.setItem('crazeAI_userName', data.detectedName);
      }
      
      // If audio is enabled, generate speech
      if (audioEnabled) {
        console.log('Generating speech for response');
        await speakResponse(data.reply);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error processing transcript:', error);
      
      if (error.name === 'AbortError') {
        setErrorMessage('Request took too long. Please try again.');
        setTimedOut(true);
      } else {
        setErrorMessage(`Error: ${error.message}`);
        setAiResponse("Ah! System don crash. Na your fault! Try again later, mumu!");
      }
      
      setLoading(false);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  };

  // Update the speakResponse method to handle mobile issues better
  const speakResponse = async (text) => {
    try {
      // Check if audio is supported
      if (!audioRef.current) {
        console.log('Audio not supported');
        setLoading(false);
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
      
      console.log('Requesting text-to-speech');
      // Get speech audio from OpenAI with a shorter timeout for mobile
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'onyx' }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to generate speech: ${response.status}`);
      }
      
      console.log('Received TTS response');
      // Create blob from response
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      
      console.log('Playing audio');
      // Set up event handlers before playing
      audioRef.current.onplay = () => {
        console.log('Audio started playing');
        setIsSpeaking(true);
        setLoading(false); // End loading state when speech begins
      };
      
      audioRef.current.onended = () => {
        console.log('Audio finished playing');
        setIsSpeaking(false);
      };
      
      audioRef.current.onerror = (e) => {
        console.error('Audio error:', e);
        setIsSpeaking(false);
        setLoading(false);
      };
      
      // Play the audio
      audioRef.current.src = url;
      
      // On mobile, adding a slight delay before playing can help
      setTimeout(() => {
        audioRef.current.play()
          .then(() => console.log('Audio playback started successfully'))
          .catch(err => {
            console.error('Error playing audio:', err);
            // If autoplay fails (common on mobile), show a message and end loading
            setErrorMessage('Tap to enable audio playback');
            setLoading(false);
          });
      }, 300);
      
      // Safety timeout - ensure loading state doesn't get stuck
      setTimeout(() => {
        if (loading) {
          console.log('Safety timeout triggered');
          setLoading(false);
        }
      }, 5000);
      
    } catch (error) {
      console.error('Error generating speech:', error);
      setErrorMessage('Failed to generate speech');
      setLoading(false);
    }
  };

  // Fix the handleRetry function - this was not properly clearing states
  const handleRetry = () => {
    if (lastTranscript) {
      console.log('Retrying with transcript:', lastTranscript);
      
      // Clear all states first
      setTimedOut(false);
      setErrorMessage('');
      setLoading(true);
      
      // Cancel any existing timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Use setTimeout to ensure the state updates have propagated
      setTimeout(() => {
        // Start fresh processing
        processTranscript(lastTranscript);
      }, 100);
    }
  };

  // Improved detection for mobile devices
  const isMobileDevice = () => {
    return (typeof navigator !== 'undefined') && 
      (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2));
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
              <div className="mb-4 text-yellow-700 text-sm flex items-center gap-1 bg-yellow-50 p-3 rounded-lg w-full max-w-md">
                <FiAlertCircle className="flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            
            {/* Voice interaction area */}
            <div className="flex flex-col items-center justify-center gap-8 text-center">
              {/* Status indicator with timeout handling */}
              <div className="text-lg text-gray-700 font-medium max-w-sm">
                {isListening ? (
                  <span>Listening... Tap again when done</span>
                ) : isSpeaking ? (
                  <span>Speaking...</span>
                ) : loading ? (
                  <span>Processing...</span>
                ) : timedOut ? (
                  <span>Request took too long</span>
                ) : (
                  <span>Tap to start talking</span>
                )}
              </div>
              
              {/* Controls with retry button when timed out */}
              <div className="flex flex-col items-center gap-6">
                {timedOut ? (
                  <button
                    onClick={handleRetry}
                    type="button" /* Explicitly make it a button type for better mobile compatibility */
                    className="p-10 rounded-full bg-yellow-500 text-white hover:bg-yellow-600 active:bg-yellow-700 shadow-lg touch-manipulation"
                    aria-label="Retry last request"
                  >
                    <FiRefreshCw size={56} />
                  </button>
                ) : (
                  <div className={`relative ${loading ? 'animate-pulse' : ''}`}>
                    <button
                      onClick={toggleListening}
                      disabled={loading || isSpeaking}
                      type="button" /* Explicitly make it a button type for better mobile compatibility */
                      className={`p-10 rounded-full transition-colors ${
                        !microphoneSupported
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : isListening
                            ? "bg-red-500 text-white scale-110 transform transition-transform"
                            : "bg-green-600 text-white hover:bg-green-700 active:bg-green-800"
                      } ${(loading || isSpeaking) ? "opacity-70" : ""} shadow-lg touch-manipulation`}
                      aria-label={isListening ? "Tap to stop" : "Tap to start talking"}
                    >
                      <FiMic size={56} />
                    </button>
                    
                    {/* Loading spinner around mic button */}
                    {loading && (
                      <div className="absolute inset-0 rounded-full border-4 border-green-200 border-t-green-600 animate-spin"></div>
                    )}
                  </div>
                )}
                
                {/* Audio toggle button remains commented out */}
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
