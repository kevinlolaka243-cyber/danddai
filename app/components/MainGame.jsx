"use client";

import { useState } from "react";

export default function MainGame({ kingdom, player }) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSend() {
    if (!input.trim()) return;
    const playerMessage = input.trim();

    // Add player message
    setHistory(prev => [...prev, { role: "player", content: playerMessage }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: playerMessage,
          kingdom,
          player,
          history, // send previous convo as context
        }),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      setHistory(prev => [...prev, { role: "llm", content: data.reply }]);
    } catch (err) {
      console.error("Send failed:", err);
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <div style={{ minHeight: 300, border: "1px solid #ccc", padding: 8, marginBottom: 12 }}>
        {history.map((msg, i) => (
          <p key={i} style={{ color: msg.role === "player" ? "blue" : "green" }}>
            <strong>{msg.role === "player" ? "You" : "Narrator"}:</strong> {msg.content}
          </p>
        ))}
        {loading && <p>…thinking</p>}
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !loading && handleSend()}
          style={{ flex: 1, padding: 8 }}
          placeholder="Type your action..."
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
}

