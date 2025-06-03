const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Simple in-memory messages
let messages = [];

io.on('connection', (socket) => {
  socket.emit('chat history', messages);

  socket.on('chat message', async (msg) => {
    messages.push(msg);
    io.emit('chat message', msg);

    // If message is to chatbot, reply
    if (msg.to === 'chatbot') {
      const botReply = await getBotReply(msg.text);
      const botMsg = { from: 'chatbot', to: msg.from, text: botReply, timestamp: new Date().toISOString() };
      messages.push(botMsg);
      io.emit('chat message', botMsg);
    }
  });
});

app.get('/', (req, res) => {
  res.send('Chat server is running');
});

// Chatbot (OpenAI GPT) integration
async function getBotReply(userMsg) {
  try {
    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: userMsg }]
    }, {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
    });
    return res.data.choices[0].message.content.trim();
  } catch (e) {
    return "Sorry, I couldn't process that!";
  }
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log('Server running on port', PORT));