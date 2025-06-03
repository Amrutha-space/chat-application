import React, { useState, useEffect, useRef } from "react";
import io, { Socket } from "socket.io-client";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Message = {
  id: string;
  text: string;
  user: { id: string; name: string };
  createdAt: string;
};

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [roomId, setRoomId] = useState<string>("chatbot");
  const socketRef = useRef<Socket | null>(null);

  // Login/Register
  async function handleAuth(email: string, password: string, name?: string) {
    const url = name ? "/api/register" : "/api/login";
    const data = name ? { email, password, name } : { email, password };
    const res = await axios.post(API_URL + url, data);
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem("token", res.data.token);
  }

  useEffect(() => {
    if (!token) {
      const saved = localStorage.getItem("token");
      if (saved) setToken(saved);
      return;
    }
    // Connect socket
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;
    socket.emit("joinRoom", roomId);
    socket.on("message", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => { socket.disconnect(); };
  }, [token, roomId]);

  const sendMessage = (e: any) => {
    e.preventDefault();
    if (!input) return;
    socketRef.current?.emit("message", { roomId, text: input });
    setInput("");
  };

  // Minimal login/register UI
  if (!token) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [mode, setMode] = useState<"login" | "register">("login");
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow w-full max-w-sm">
          <h2 className="text-xl font-bold mb-4">{mode === "login" ? "Login" : "Register"}</h2>
          {mode === "register" && (
            <input
              className="border p-2 mb-2 w-full rounded"
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          )}
          <input
            className="border p-2 mb-2 w-full rounded"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            className="border p-2 mb-2 w-full rounded"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button
            className="bg-blue-500 text-white p-2 rounded w-full"
            onClick={() => handleAuth(email, password, mode === "register" ? name : undefined)}
          >
            {mode === "login" ? "Login" : "Register"}
          </button>
          <div className="text-right mt-2 text-blue-500 cursor-pointer text-sm" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Create account" : "Back to login"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <div className="w-1/4 bg-gray-200 p-4">
        <div className="mb-4 font-bold">Rooms</div>
        <div
          className={`p-2 rounded cursor-pointer ${roomId === "chatbot" ? "bg-blue-300" : ""}`}
          onClick={() => setRoomId("chatbot")}
        >
          🤖 ChatBot
        </div>
        {/* Add more rooms here */}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`mb-2 flex ${msg.user.id === user?.id ? "justify-end" : "justify-start"}`}>
              <div className={`p-2 rounded shadow ${msg.user.id === "bot" ? "bg-green-100" : msg.user.id === user?.id ? "bg-blue-200" : "bg-white"}`}>
                <span className="font-bold">{msg.user.name}: </span>
                {msg.text}
                <div className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
        </div>
        <form className="flex p-4 bg-white" onSubmit={sendMessage}>
          <input
            className="flex-1 border p-2 rounded mr-2"
            placeholder="Type your message..."
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button className="bg-blue-500 text-white px-4 py-2 rounded" type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}