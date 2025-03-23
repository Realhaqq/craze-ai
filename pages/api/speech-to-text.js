import openai from '../../utils/openai';
import formidable from 'formidable'; // Back to default import
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create a temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Use formidable to parse the form
    const form = formidable({
      uploadDir: tempDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10 MB
    });

    // Parse the form
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // Check if we have an audio file
    const audioFile = files.audio;
    if (!audioFile || (Array.isArray(audioFile) && audioFile.length === 0)) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Handle both object and array format that formidable might return
    const file = Array.isArray(audioFile) ? audioFile[0] : audioFile;
    
    console.log('Received file:', 
      file.originalFilename || 'unknown', 
      file.mimetype || 'unknown', 
      file.size || 'unknown size'
    );

    // Create a readable stream from the file
    const fileStream = fs.createReadStream(file.filepath);

    // Prepare the file for OpenAI in the format they need
    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: fileStream,
      language: "en"
    });

    // Clean up the temporary file
    fs.unlinkSync(file.filepath);
    
    console.log('Transcription successful:', transcription.text);
    res.status(200).json({ text: transcription.text });
  } catch (error) {
    console.error('Error in speech-to-text:', error);
    
    // Send detailed error information to help with debugging
    let errorDetails = error.message;
    if (error.error && error.error.message) {
      errorDetails = error.error.message;
    }
    
    res.status(500).json({ 
      error: 'Failed to transcribe audio', 
      details: errorDetails
    });
  }
}
