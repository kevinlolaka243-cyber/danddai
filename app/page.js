"use client";

import { useEffect, useState } from "react";
import MainGame from "./components/MainGame";
export default function Home() {
  const [intro, setIntro] = useState("");
  const [kingdom, setKingdom] = useState(null);
  const [player, setPlayer] = useState(null);
  const [startLocation, setStartLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false); // <-- toggle intro vs game

  useEffect(() => {
    async function fetchWorldData() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/openai", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        const data = await res.json();
        setIntro(data?.intro || "");
        setKingdom(data?.world || null);
        setPlayer(data?.player || null);
        setStartLocation(data?.startLocation || null);
      } catch (err) {
        console.error("Failed to fetch world data:", err);
        setError("Something went wrong while loading the world.");
      } finally {
        setLoading(false);
      }
    }

    fetchWorldData();
  }, []);

  if (loading) return <p>Loading world…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  // If adventure started → show MainGame
  if (started) {
    return <MainGame kingdom={kingdom} player={player} />;
  }

  // Otherwise show intro
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      {intro && (
        <section style={{ marginBottom: 24 }}>
          <h1 style={{ margin: "0 0 8px" }}>Prologue</h1>
          <p>{intro}</p>
        </section>
      )}

      {player && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 8px" }}>Your Guide</h2>
          <p><strong>Name:</strong> {player.character?.name}</p>
          <p><strong>Role:</strong> {player.character?.role}</p>
          <p><strong>Town:</strong> {player.town}</p>
          <p><strong>Duchy:</strong> {player.duchy}</p>
          <p><strong>About:</strong> {player.character?.description}</p>
        </section>
      )}

      {kingdom && (
        <section style={{ marginBottom: 24 }}>
          <h2>{kingdom.name}</h2>
          <p>{kingdom.description}</p>
        </section>
      )}

      <button onClick={() => setStarted(true)}>Start Adventure</button>
    </main>
  );
}


