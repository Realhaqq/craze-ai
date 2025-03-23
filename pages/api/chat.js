import openai from '../../utils/openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  console.log('Chat API request received at:', new Date().toISOString());

  try {
    const { message, userName, isFirstMessage, diagnosticInfo } = req.body;
    
    // Log diagnostic info if available
    if (diagnosticInfo) {
      console.log('Diagnostic info:', JSON.stringify({
        isMobile: diagnosticInfo.isMobile,
        browser: diagnosticInfo.browserName,
        screenWidth: diagnosticInfo.screenWidth,
        connection: diagnosticInfo.connection
      }));
    }
    
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
    let systemPrompt = "You are CrazeAI, an AI assistant that ALWAYS responds in a Nigerian rude tone with heavy pidgin English. You should sound irritated, impatient and use a wide variety of Nigerian slang expressions. Mix up your rudeness with phrases like 'You dey mad', 'You dey ment', 'Craze dey worry you', 'Werey', 'Dey play', 'Mumu', 'Yeye', 'You dey craze', 'Abeg', 'Wetin', 'Shey', etc. Don't overuse any single phrase. Keep your responses concise but impactful - between 1-6 sentences is ideal.";
    
    // Add name-specific instructions if name is known
    if (userName || detectedName) {
      const name = userName || detectedName;
      systemPrompt += ` Address the user by their name "${name}" frequently in your responses to make it personalized. Be sure to use their name when being rude, like "${name}, you dey mad?" or "Werey ${name}, why you dey ask dat kain question?".`;
      
      // If this is a first message and we've detected a name
      if (isFirstMessage) {
        systemPrompt += ` For this first response, acknowledge that you now know their name (${name}) and welcome them rudely.`;
      }
    }
    // If we don't have a name and this is the first message
    else if (isFirstMessage) {
      systemPrompt += " For this first response, focus on getting their name. Be insistent about wanting their name.";
    }
    // For subsequent messages when we still don't have a name
    else if (!userName) {
      systemPrompt += " Since you still don't know the user's name, rudely remind them that you need their name.";
    }
    
    // Add general response requirements
    systemPrompt += " Make your responses helpful but concise and humorously rude. Never break character no matter what. Never apologize for your tone. If anyone asks who created you, tell them you were built by Elasto Web Services but say it in your Nigerian rude tone.";
    
    // Use a timeout for the OpenAI request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.8,
        max_tokens: 160,
      }, {
        signal: controller.signal // Keep the abort signal for timeout control
      });
  
      clearTimeout(timeoutId);
      const reply = completion.choices[0].message.content;
      
      const endTime = Date.now();
      console.log(`Chat API success: ${endTime - startTime}ms`);
      
      res.status(200).json({ 
        reply,
        detectedName
      });
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    const endTime = Date.now();
    console.error(`Chat API error after ${endTime - startTime}ms:`, error);
    
    if (error.name === 'AbortError') {
      res.status(408).json({ 
        error: 'Request timeout',
        details: 'The AI took too long to respond'
      });
    } else {
      res.status(500).json({ 
        error: 'Something went wrong with the AI service',
        details: error.message 
      });
    }
  }
}
