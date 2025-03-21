import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import { FiSend, FiRefreshCw } from 'react-icons/fi';

export default function ChatInterface() {
  const [messages, setMessages] = useState([
    { 
      text: "Who you be? Tell me your name first before we start this thing!", 
      isUser: false 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Check if a message likely contains a user introducing themselves
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
    
    // For first message, if no pattern matches, try to get the first word that might be a name
    if (isFirstMessage) {
      const words = message.split(/\s+/);
      // Get first word that's not too short and has proper capitalization (likely a name)
      const possibleName = words.find(word => 
        word.length > 1 && 
        word[0] === word[0].toUpperCase() && 
        word.slice(1) === word.slice(1).toLowerCase()
      );
      
      if (possibleName) {
        return possibleName;
      }
      
      // If no capitalized word, just use first word that's not too short
      if (words[0] && words[0].length > 1) {
        return words[0];
      }
    }
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Add user message to chat
    const userMessage = input.trim();
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setInput('');
    setLoading(true);

    // For first message, prioritize extracting name
    if (isFirstMessage) {
      const extractedName = extractNameFromMessage(userMessage);
      if (extractedName) {
        setUserName(extractedName);
      }
      setIsFirstMessage(false);
    } 
    // For subsequent messages, still try to extract name if not known
    else if (!userName) {
      const extractedName = extractNameFromMessage(userMessage);
      if (extractedName) {
        setUserName(extractedName);
      }
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          userName: userName || '',
          isFirstMessage: isFirstMessage,
        }),
      });

      if (!response.ok) {
        throw new Error('API response error');
      }

      const data = await response.json();
      
      // Add AI response to chat
      setMessages(prev => [...prev, { text: data.reply, isUser: false }]);
      
      // If AI detected a name, update state
      if (data.detectedName && !userName) {
        setUserName(data.detectedName);
      }
      
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        { 
          text: "Ah! System don crash. Na your fault! Try again later, mumu!", 
          isUser: false 
        }
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([
      { 
        text: userName ? 
          `${userName}, you don clear everything? Werey! Oya start again, I no get all day!` : 
          "Who you be? Tell me your name first before we start this thing!", 
        isUser: false 
      }
    ]);
    setIsFirstMessage(true);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-2 bg-green-100 border-b border-green-300 flex justify-between items-center">
        <h2 className="font-semibold text-gray-800">Chat with CrazeAI</h2>
        <button 
          onClick={clearChat}
          className="text-sm flex items-center gap-1 px-2 py-1 rounded hover:bg-green-200 transition-colors"
          title="Clear chat"
        >
          <FiRefreshCw size={14} /> Clear
        </button>
      </div>
      
      <div 
        className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4" 
        style={{ 
          scrollBehavior: 'smooth',
          height: 'calc(100vh - 200px)',
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto'
        }}
      >
        {messages.map((message, index) => (
          <ChatMessage 
            key={index} 
            message={message.text} 
            isUser={message.isUser} 
          />
        ))}
        {loading && (
          <div className="flex justify-start mb-3">
            <div className="bg-gray-200 text-gray-800 rounded-xl px-4 py-2 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                <span className="ml-1">CrazeAI dey think...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t border-gray-200 p-3 md:p-4 flex items-center gap-2 bg-white shadow-inner">
        <form onSubmit={handleSubmit} className="w-full flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all shadow-sm text-gray-800"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSend className={loading ? 'opacity-50' : ''} />
          </button>
        </form>
      </div>
    </div>
  );
}
