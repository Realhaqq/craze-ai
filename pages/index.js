import Head from 'next/head';
import ChatInterface from '../components/ChatInterface';

export default function Home() {
  return (
    <>
      <Head>
        <title>CrazeAI - Nigerian Rudeness at its Finest</title>
        <meta name="description" content="Chat with CrazeAI - the rudest Nigerian AI assistant" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <style jsx global>{`
          /* Fallback styles to ensure something is visible */
          body {
            background-color: #f0fdf4;
          }
          .header-section {
            background-color: #008751;
            padding: 16px;
          }
          .chat-container {
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
        `}</style>
      </Head>

      <div className="flex flex-col h-screen" style={{ backgroundColor: '#f0fdf4' }}>
        <header className="header-section bg-gradient-to-r from-green-700 to-green-600 text-white p-3 md:p-4 shadow-md">
          <div className="container mx-auto px-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center">
                  CrazeAI <span className="ml-2 text-2xl">🇳🇬</span>
                </h1>
                <p className="text-sm md:text-base opacity-80">The rudest Nigerian AI wey dey exist!</p>
              </div>
              <div className="hidden md:block">
                <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm">
                  Built by Elasto Web Services
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto max-w-3xl px-2 md:px-0 py-4">
          <div className="chat-container h-full border rounded-xl shadow-lg overflow-hidden bg-white">
            <ChatInterface />
          </div>
        </main>

        <footer className="bg-green-900 text-white p-3 text-center text-sm">
          <p className="flex items-center justify-center gap-1 flex-wrap">
            <span>Built by</span> 
            <span className="font-bold">Elasto Web Services</span> 
            <span className="mx-2">|</span>
            <span>No be by force to use am o!</span>
          </p>
        </footer>
      </div>
    </>
  );
}
