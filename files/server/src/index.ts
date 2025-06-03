import express from "express";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import Redis from "redis";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const prisma = new PrismaClient();
const redis = Redis.createClient({ url: process.env.REDIS_URL });

redis.connect();

const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// --- Auth Endpoints ---

app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: { name, email, password: hashed }
    });
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (e) {
    res.status(400).json({ error: "Email already exists" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "1d" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } });
});

// --- Middleware ---
function authSocket(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Not authenticated"));
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error("Not authenticated"));
    (socket as any).user = decoded;
    next();
  });
}
io.use(authSocket);

// --- Chat Logic ---
io.on("connection", (socket) => {
  const user = (socket as any).user;
  socket.join(user.id);

  socket.on("joinRoom", async (roomId: string) => {
    socket.join(roomId);
  });

  socket.on("message", async ({ roomId, text }: { roomId: string; text: string }) => {
    // Save message
    const message = await prisma.message.create({
      data: { text, userId: user.id, roomId }
    });
    io.to(roomId).emit("message", {
      id: message.id,
      text: message.text,
      user: { id: user.id, name: user.name },
      createdAt: message.createdAt
    });

    // If chatbot, reply
    if (roomId === "chatbot") {
      const prompt: ChatCompletionRequestMessage[] = [
        { role: "user", content: text }
      ];
      try {
        const completion = await openai.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: prompt
        });
        const botText = completion.data.choices[0]?.message?.content || "";
        const botMsg = await prisma.message.create({
          data: { text: botText, userId: user.id, roomId }
        });
        io.to(roomId).emit("message", {
          id: botMsg.id,
          text: botText,
          user: { id: "bot", name: "ChatBot" },
          createdAt: botMsg.createdAt
        });
      } catch (err) {
        io.to(roomId).emit("message", {
          id: "bot-error",
          text: "Bot error",
          user: { id: "bot", name: "ChatBot" },
          createdAt: new Date()
        });
      }
    }
  });

  socket.on("disconnect", () => {
    // Presence logic via Redis can go here
  });
});

// --- Room management (simple stub) ---
app.get("/api/rooms", async (req, res) => {
  const rooms = await prisma.room.findMany({ select: { id: true, name: true, isGroup: true } });
  res.json(rooms);
});

// --- Health/Default route ---
app.get("/", (req, res) => res.send("Chat API running"));

const PORT = Number(process.env.PORT) || 4000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));