"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [story, setStory] = useState("");

  useEffect(() => {
    async function fetchData() {
      const response = await fetch("/api/openai");
      const text = await response.text();
      setStory(text);
    }
    fetchData();
  }, []);

  return (
    <div>
      <p>{story}</p>
    </div>
  );
}