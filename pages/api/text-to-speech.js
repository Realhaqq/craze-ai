import openai from '../../utils/openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, voice = 'onyx' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Call OpenAI TTS API
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice, // onyx is a deep male voice that works well for Nigerian accent
      input: text,
      speed: 0.92, // Slightly slower for Nigerian cadence
    });

    // Get the audio data
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    
    // Send the audio data
    res.status(200).send(audioBuffer);
  } catch (error) {
    console.error('Error in text-to-speech:', error);
    res.status(500).json({ error: 'Failed to generate speech', details: error.message });
  }
}
