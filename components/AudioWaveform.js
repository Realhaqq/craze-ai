import { useEffect, useRef } from 'react';

export default function AudioWaveform({ isRecording }) {
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);
  const animationRef = useRef(null);
  
  // Setup audio analyzer when recording starts
  useEffect(() => {
    if (!isRecording) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    let audioContext;
    let analyser;
    let microphone;
    
    const startVisualization = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
        
        microphone = audioContext.createMediaStreamSource(stream);
        sourceRef.current = microphone;
        
        analyser = audioContext.createAnalyser();
        analyserRef.current = analyser;
        analyser.fftSize = 256;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        dataArrayRef.current = dataArray;
        
        microphone.connect(analyser);
        
        // Start drawing
        draw();
      } catch (err) {
        console.error('Error accessing microphone for visualization:', err);
      }
    };

    const draw = () => {
      if (!canvasRef.current || !isRecording) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      
      // Get frequencies
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Set bar width and spacing
      const barWidth = 3;
      const barSpacing = 1;
      const barCount = Math.floor(width / (barWidth + barSpacing));
      const sliceWidth = Math.floor(dataArrayRef.current.length / barCount);
      
      // Draw bars
      ctx.fillStyle = '#4ade80'; // green-500 in tailwind
      
      for (let i = 0; i < barCount; i++) {
        const index = Math.floor(i * sliceWidth);
        const value = dataArrayRef.current[index];
        
        // Audio data is 0-255, map to canvas height
        const barHeight = (value / 255) * height;
        
        // Draw the bar
        const x = i * (barWidth + barSpacing);
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      }
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    startVisualization();
    
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        if (sourceRef.current) {
          sourceRef.current.disconnect();
        }
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording]);

  return (
    <div className={`w-full h-16 mt-1 ${isRecording ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
      <canvas 
        ref={canvasRef} 
        width={300} 
        height={60}
        className="w-full h-full rounded bg-gray-100"
      />
    </div>
  );
}
