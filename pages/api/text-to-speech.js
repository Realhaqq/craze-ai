import openai from '../../utils/openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set headers for better mobile caching behavior
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  const startTime = Date.now();
  console.log('TTS API request received at:', new Date().toISOString());

  try {
    const { text, voice = 'onyx', retryAttempt = 0 } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`TTS request received. Voice: ${voice}, Retry attempt: ${retryAttempt}, Text length: ${text.length}`);

    // Progressive timeouts based on retry attempts and text length
    const baseTimeout = 60000; // 1 minute base timeout
    const retryBonus = retryAttempt * 30000; // +30s per retry
    const lengthBonus = Math.min(30000, text.length * 100); // +100ms per character, max 30s
    const totalTimeout = baseTimeout + retryBonus + lengthBonus;
    
    console.log(`TTS timeout set to ${totalTimeout}ms`);

    // Call OpenAI TTS API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), totalTimeout);
    
    try {
      const response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: voice,
        input: text,
        speed: 0.92,
      }, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      // Get the audio data
      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      // Set appropriate headers for audio streaming
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.setHeader('Accept-Ranges', 'bytes');
      
      // Send the audio data
      res.status(200).send(audioBuffer);
      
      const endTime = Date.now();
      console.log(`TTS success: ${audioBuffer.length} bytes returned in ${endTime - startTime}ms`);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    const endTime = Date.now();
    console.error(`TTS error after ${endTime - startTime}ms:`, error);
    
    // Provide more detailed error information
    let errorMessage = error.message;
    let errorStatus = 500;
    
    if (error.name === 'AbortError') {
      errorMessage = 'The text-to-speech request took too long';
      errorStatus = 408; // Request Timeout
    } else if (error.status) {
      errorStatus = error.status;
    }
    
    res.status(errorStatus).json({ 
      error: 'Failed to generate speech', 
      details: errorMessage,
      requestTime: endTime - startTime
    });
  }
}
