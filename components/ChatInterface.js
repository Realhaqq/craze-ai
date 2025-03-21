import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import { FiSend, FiRefreshCw } from 'react-icons/fi';

export default function ChatInterface() {
  const [messages, setMessages] = useState([
    { 
      text: "Wetin you want? Make you talk fast, I no get all day!", 
      isUser: false 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Add user message to chat
    const userMessage = input.trim();
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error('API response error');
      }

      const data = await response.json();
      
      // Add AI response to chat
      setMessages(prev => [...prev, { text: data.reply, isUser: false }]);
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
        text: "You don clear everything? Oya start again, I no get all day!", 
        isUser: false 
      }
    ]);
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
