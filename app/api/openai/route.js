import { startNewGame } from "./worldGeneration";
import { handlePlayerTurn } from "./worldGeneration";

// ---------- GET ----------
export async function GET() {
  try {
    const gameData = await startNewGame();

    if (gameData && gameData.world?.name) {
      return new Response(JSON.stringify(gameData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(
        JSON.stringify({ error: "World generation failed" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ---------- POST ----------
export async function POST(request) {
  try {
    const body = await request.json(); // { message, kingdom, player, history }
    const reply = await handlePlayerTurn(body);

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("POST /api error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
