import openai from './openai';

/**
 * Convert text to speech using OpenAI's TTS API
 * @param {string} text - The text to convert to speech
 * @param {string} voice - The voice to use (alloy, echo, fable, onyx, nova, shimmer)
 * @returns {Promise<Blob>} - Audio blob
 */
export async function textToSpeech(text, voice = 'onyx') {
  try {
    // OpenAI TTS supports these voices: alloy, echo, fable, onyx, nova, shimmer
    // We'll use 'onyx' for the Nigerian tone as it has a deeper voice
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice,
      input: text,
      speed: 0.92, // Slightly slower for Nigerian cadence
    });

    // Convert the response to a Blob
    const audioBlob = await response.blob();
    return audioBlob;
  } catch (error) {
    console.error('OpenAI TTS error:', error);
    throw error;
  }
}

/**
 * Convert speech to text using OpenAI's Speech-to-Text API
 * @param {Blob|File} audioBlob - The audio file to transcribe
 * @returns {Promise<string>} - Transcribed text
 */
export async function speechToText(audioBlob) {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audioBlob,
      model: 'whisper-1',
      language: 'en',
    });

    return transcription.text;
  } catch (error) {
    console.error('OpenAI Speech-to-Text error:', error);
    throw error;
  }
}
