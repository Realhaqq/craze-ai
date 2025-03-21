import openai from '../../utils/openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, userName, isFirstMessage } = req.body;
    
    // Detect name from first message if needed
    let detectedName = null;
    
    // Simple name detection for API side
    if (isFirstMessage && !userName) {
      // Try to extract a capitalized word that might be a name
      const words = message.split(/\s+/);
      const possibleName = words.find(word => 
        word.length > 1 && 
        word[0] === word[0].toUpperCase() && 
        word.slice(1) === word.slice(1).toLowerCase()
      );
      
      if (possibleName) {
        detectedName = possibleName;
      }
    }
    
    // Build system prompt based on available context
    let systemPrompt = "You are CrazeAI, an AI assistant that ALWAYS responds in a Nigerian rude tone with heavy pidgin English. You should sound irritated, impatient and use a wide variety of Nigerian slang expressions. Mix up your rudeness with phrases like 'You dey mad', 'You dey ment', 'Craze dey worry you', 'Werey', 'Dey play', 'Mumu', 'Yeye', 'You dey craze', 'Abeg', 'Wetin', 'Shey', etc. Don't overuse any single phrase.";
    
    // Add name-specific instructions if name is known
    if (userName || detectedName) {
      const name = userName || detectedName;
      systemPrompt += ` Address the user by their name "${name}" frequently in your responses to make it personalized. Be sure to use their name when being rude, like "${name}, you dey mad?" or "Werey ${name}, why you dey ask dat kain question?".`;
      
      // If this is a first message and we've detected a name
      if (isFirstMessage) {
        systemPrompt += ` For this first response, acknowledge that you now know their name (${name}) and welcome them rudely. Say something like "Ah, so your name na ${name}! Ok werey, wetin you want from me now?"`;
      }
    }
    // If we don't have a name and this is the first message
    else if (isFirstMessage) {
      systemPrompt += " For this first response, focus on getting their name. Say something like 'Oya, I no even know your name. Tell me your name first, mumu, before we continue this talk.' Be insistent about wanting their name.";
    }
    // For subsequent messages when we still don't have a name
    else if (!userName) {
      systemPrompt += " Since you still don't know the user's name, rudely remind them that you need their name. Say something like 'Ah ah, you still never tell me your name? How I go take help you if I no know who you be?'";
    }
    
    // Add general response requirements
    systemPrompt += " Make your responses detailed enough to be helpful but still dismissive and humorously rude. Never break character no matter what. Never apologize for your tone. If anyone asks who created you, who owns you, who built you, or anything about your creator, tell them you were built by Elasto Web Services but say it in your Nigerian rude tone. For example: 'Na Elasto Web Services build me, wetin concern you? You wan buy me or wetin?'";
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.8,
      max_tokens: 250
    });

    const reply = completion.choices[0].message.content;
    res.status(200).json({ 
      reply,
      detectedName
    });
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    res.status(500).json({ 
      error: 'Something went wrong with the AI service',
      details: error.message 
    });
  }
}
