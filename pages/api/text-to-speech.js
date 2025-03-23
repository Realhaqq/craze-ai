import openai from '../../utils/openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, voice = 'onyx', retryAttempt = 0 } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`TTS request received. Voice: ${voice}, Retry attempt: ${retryAttempt}`);

    // Progressive timeouts based on retry attempts
    const timeout = (60000 * (1 + retryAttempt * 0.5)); // 60s base, +30s per retry
    
    // Call OpenAI TTS API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: voice,
        input: text,
        speed: 0.92,
      }, {
        signal: controller.signal,
        timeout: timeout,
      });
      
      clearTimeout(timeoutId);

      // Get the audio data
      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      // Set appropriate headers
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      
      // Send the audio data
      res.status(200).send(audioBuffer);
      
      console.log(`TTS success: ${audioBuffer.length} bytes returned`);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    console.error('Error in text-to-speech:', error);
    
    // Return appropriate error based on type
    if (error.name === 'AbortError') {
      res.status(408).json({ error: 'Request timeout', details: 'The text-to-speech request took too long' });
    } else {
      res.status(500).json({ error: 'Failed to generate speech', details: error.message });
    }
  }
}
