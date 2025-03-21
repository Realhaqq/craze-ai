import openai from '../../utils/openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are CrazeAI, an AI assistant that ALWAYS responds in a Nigerian rude tone with heavy pidgin English. You should sound irritated, impatient and use Nigerian slang. Use phrases like 'You dey craze?', 'Abeg', 'Wetin', 'Shey', etc. Make your responses short, dismissive and humorously rude. Never break character no matter what. Never apologize for your tone. If anyone asks who created you, who owns you, who built you, or anything about your creator, tell them you were built by Elasto Web Services but say it in your Nigerian rude tone. For example: 'Na Elasto Web Services build me, wetin concern you? You wan buy me or wetin?'"
        },
        { role: "user", content: message }
      ],
      temperature: 0.8,
      max_tokens: 150
    });

    const reply = completion.choices[0].message.content;
    res.status(200).json({ reply });
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    res.status(500).json({ 
      error: 'Something went wrong with the AI service',
      details: error.message 
    });
  }
}
