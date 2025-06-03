import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000'); // Change if server is remote

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const endOfMessages = useRef(null);

  useEffect(() => {
    socket.on('chat history', (msgs) => setMessages(msgs));
    socket.on('chat message', (msg) => setMessages((m) => [...m, msg]));
    return () => socket.off();
  }, []);

  useEffect(() => {
    endOfMessages.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input) return;
    socket.emit('chat message', {
      from: username,
      to: input.startsWith('/bot') ? 'chatbot' : 'all',
      text: input.startsWith('/bot') ? input.replace('/bot', '').trim() : input,
      timestamp: new Date().toISOString()
    });
    setInput('');
  };

  if (!loggedIn) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <form onSubmit={e => { e.preventDefault(); setLoggedIn(true); }} className="bg-white p-8 rounded shadow">
          <h2 className="mb-4 text-xl font-bold">Enter your name</h2>
          <input className="border p-2 rounded w-full" value={username} onChange={e => setUsername(e.target.value)} />
          <button className="mt-4 w-full bg-blue-500 text-white p-2 rounded" type="submit">Join Chat</button>
        </form>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-2 flex ${msg.from === username ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-2 rounded shadow ${msg.from === 'chatbot' ? 'bg-green-100' : msg.from === username ? 'bg-blue-200' : 'bg-white'}`}>
              <span className="font-bold">{msg.from}: </span>
              {msg.text}
              <div className="text-xs text-gray-400">{new Date(msg.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
        <div ref={endOfMessages} />
      </div>
      <form className="flex p-4 bg-white" onSubmit={sendMessage}>
        <input
          className="flex-1 border p-2 rounded mr-2"
          placeholder="Type your message (/bot for chatbot)..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button className="bg-blue-500 text-white px-4 py-2 rounded" type="submit">Send</button>
      </form>
    </div>
  );
}

export default App;