export default function ChatMessage({ message, isUser }) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold mr-2">
          C
        </div>
      )}
      <div
        className={`${
          isUser
            ? 'bg-blue-500 text-white rounded-tl-xl rounded-tr-xl rounded-bl-xl'
            : 'bg-white border border-gray-200 text-gray-800 rounded-tr-xl rounded-br-xl rounded-bl-xl'
        } px-4 py-3 max-w-[80%]`}
      >
        <p>{message}</p>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold ml-2">
          U
        </div>
      )}
    </div>
  );
}
