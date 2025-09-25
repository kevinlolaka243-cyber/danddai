import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------- helpers ----------
function clean(s) {
  return (s || "").trim();
}

async function ask(system, user, maxTokens = 800, temperature = 0.7) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: maxTokens,
    temperature,
  });
  const text = res?.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Empty model reply");
  return text;
}

// ---------- parsers ----------
function parseKingdom(text) {
  const name = clean(text.match(/Kingdom Name:\s*(.+)/i)?.[1]);
  const description = clean(text.match(/Kingdom Description:\s*([\s\S]*)/i)?.[1]);
  if (!name || !description) throw new Error("Failed to parse kingdom");
  return { name, description };
}

function parseDuchies(text) {
  const out = [];
  const rgx =
    /Duchy Name:\s*(.+)\s*[\r\n]+Duchy Description:\s*([\s\S]*?)(?=\nDuchy Name:|$)/gi;
  let m;
  while ((m = rgx.exec(text))) out.push({ name: clean(m[1]), description: clean(m[2]) });
  return out;
}

function parseTowns(text) {
  const out = [];
  const rgx =
    /Town Name:\s*(.+)\s*[\r\n]+Town Description:\s*([\s\S]*?)(?=\nTown Name:|$)/gi;
  let m;
  while ((m = rgx.exec(text))) out.push({ name: clean(m[1]), description: clean(m[2]) });
  return out;
}

function parseCharacters(text) {
  const out = [];
  const rgx =
    /Character Name:\s*(.+)\s*[\r\n]+Character Role:\s*(.+)\s*[\r\n]+Character Description:\s*([\s\S]*?)(?=\nCharacter Name:|$)/gi;
  let m;
  while ((m = rgx.exec(text))) {
    out.push({
      name: clean(m[1]),
      role: clean(m[2]),
      description: clean(m[3]),
    });
  }
  return out;
}

// ---------- generators ----------
export async function generateKingdom(
  country = "France",
  duchyCount = 3,
  townsPerDuchy = 3,
  charactersPerTown = 3
) {
  const system = `Your job is to create interesting fantasy worlds for players.
Instructions:
- Only plain text, no markdown.
- Simple, clear language.
- Each description 3–5 sentences maximum.
- Vary sentence structures.
- Avoid clichés; use concrete details.`;

  const user = `Generate a unique medieval fantasy kingdom situated in ${country}.
Output exactly:
Kingdom Name: <KINGDOM NAME>
Kingdom Description: <KINGDOM DESCRIPTION>`;

  const kingdom = { name: "", description: "", duchies: [] };

  try {
    const text = await ask(system, user, 600);
    const { name, description } = parseKingdom(text);
    kingdom.name = name;
    kingdom.description = description;

    kingdom.duchies = await generateDuchies(
      name,
      duchyCount,
      townsPerDuchy,
      charactersPerTown
    );
  } catch (err) {
    console.error("generateKingdom error:", err);
  }

  return kingdom;
}

export async function generateDuchies(
  kingdomName,
  count = 3,
  townsPerDuchy = 3,
  charactersPerTown = 3
) {
  const system = `You generate plain-text lists of subdivisions for a fantasy realm.
Rules:
- Plain text only.
- Each description 2–4 sentences.
- Avoid clichés; make each duchy distinct.`;

  const user = `Create exactly ${count} distinct duchies for the kingdom "${kingdomName}".
For each duchy, output exactly:
Duchy Name: <NAME>
Duchy Description: <DESCRIPTION>

(no extra text before or after, and repeat for all duchies)`;

  try {
    const text = await ask(system, user, 1000);
    const base = parseDuchies(text);

    const duchies = [];
    for (const d of base) {
      // pass duchy description as context to towns
      const towns = await generateTowns(
        d.name,
        d.description,
        townsPerDuchy,
        charactersPerTown
      );
      duchies.push({ ...d, towns });
    }
    return duchies;
  } catch (err) {
    console.error("generateDuchies error:", err);
    return [];
  }
}

export async function generateTowns(
  duchyName,
  duchyDescription,
  count = 3,
  charactersPerTown = 3
) {
  const system = `You output plain-text settlements for a fantasy region.
Rules:
- Plain text only (no markdown).
- Each description 2–3 sentences, concrete and distinct.
- Use the provided duchy context to keep towns coherent.`;

  const user = `Duchy Context:
Name: ${duchyName}
Description: ${duchyDescription}

Inside this duchy, create exactly ${count} towns.
For each town, output exactly:
Town Name: <NAME>
Town Description: <DESCRIPTION>

(no extra text before or after, and repeat for all towns)`;

  try {
    const text = await ask(system, user, 1000);
    const base = parseTowns(text);

    const towns = [];
    for (const t of base) {
      // pass town description as context to characters
      const characters = await generateCharacters(
        duchyName,
        t.name,
        t.description,
        charactersPerTown
      );
      towns.push({ ...t, characters });
    }
    return towns;
  } catch (err) {
    console.error("generateTowns error:", err);
    return [];
  }
}

export async function generateCharacters(
  duchyName,
  townName,
  townDescription,
  count = 3
) {
  const system = `You create grounded, game-friendly NPCs in plain text.
Rules:
- Plain text only, no markdown.
- Each description 1–3 sentences.
- Roles should be story-relevant (e.g., blacksmith, herbalist, captain of the guard).
- Use the provided town context to keep NPCs coherent with local economy, geography, and conflicts.`;

  const user = `Context:
Duchy: ${duchyName}
Town: ${townName}
Town Description: ${townDescription}

Create exactly ${count} distinct characters for this town.
For each, output exactly:
Character Name: <NAME>
Character Role: <ROLE>
Character Description: <DESCRIPTION>

(no extra text before or after, and repeat for all characters)`;

  try {
    const text = await ask(system, user, 1200);
    return parseCharacters(text);
  } catch (err) {
    console.error("generateCharacters error:", err);
    return [];
  }
}

export async function gameInitialization(worldData) {
  try {
    if (!worldData || !Array.isArray(worldData.duchies) || !worldData.duchies.length) {
      throw new Error("Invalid or empty world data.");
    }

    // Collect all characters with their location context
    const pool = [];
    for (const duchy of worldData.duchies || []) {
      for (const town of duchy.towns || []) {
        for (const character of town.characters || []) {
          pool.push({
            duchyName: duchy.name,
            duchyDescription: duchy.description,
            townName: town.name,
            townDescription: town.description,
            character, // { name, role, description }
          });
        }
      }
    }

    if (!pool.length) {
      throw new Error("No characters found in the world data.");
    }

    // Randomly select one character
    const selected = pool[Math.floor(Math.random() * pool.length)];

        // Build a short, immersive intro using the LLM
        const system = `You are the game narrator. 
    Respond in plain text only (no markdown).
    Use 3–5 concise sentences.
    Be vivid but not flowery.
    Introduce the selected character to the player and set the opening scene.`;

        const user = `World Context:
    Kingdom: ${worldData.name}
    Duchy: ${selected.duchyName}
    Duchy Summary: ${selected.duchyDescription}

    Town: ${selected.townName}
    Town Summary: ${selected.townDescription}

    Character:
    Name: ${selected.character.name}
    Role: ${selected.character.role}
    Description: ${selected.character.description}

    Task:
    Write a brief introduction directly addressing the player, presenting this character as their first contact, and inviting them to begin the adventure from ${selected.townName}. End with a subtle call to action.`;

    const intro = await ask(system, user, 300, 0.7);

    return {
      intro,
      selection: {
        duchy: selected.duchyName,
        town: selected.townName,
        character: selected.character,
      },
      startLocation: {
        duchy: selected.duchyName,
        town: selected.townName,
      },
    };
  } catch (err) {
    console.error("gameInitialization error:", err);
    return {
      intro:
        "Your adventure begins, but the guide seems delayed. Take a moment to gather your thoughts—someone will meet you at the town gates shortly.",
      selection: null,
      startLocation: null,
      error: String(err?.message || err),
    };
  }
}

// ---------- wrapper ----------
export async function startNewGame(
  country = "France",
  duchyCount = 3,
  townsPerDuchy = 3,
  charactersPerTown = 3
) {
  try {
    // Step 1: Generate the world
    const kingdom = await generateKingdom(
      country,
      duchyCount,
      townsPerDuchy,
      charactersPerTown
    );

    // Step 2: Select starting character + intro
    const init = await gameInitialization(kingdom);

    // Step 3: Return both in one object
    return {
      world: kingdom,
      player: init.selection, // selected character with context
      intro: init.intro,      // narrator message for start
      startLocation: init.startLocation,
    };
  } catch (err) {
    console.error("startNewGame error:", err);
    return {
      world: null,
      player: null,
      intro: "The world could not be created. Please try again.",
      startLocation: null,
      error: String(err?.message || err),
    };
  }
}

export async function handlePlayerTurn({ message, kingdom, player, history }) {
  if (!message || !message.trim()) {
    throw new Error("Message is required");
  }

  const systemPrompt = `You are the narrator of a medieval fantasy adventure.
Always address the player directly in the second person ("you").
Keep narration under 4 sentences.
Respond in plain text only.`;

  const userPrompt = `World:
Kingdom: ${kingdom?.name || "Unknown"}
Description: ${kingdom?.description || ""}

Player:
Name: ${player?.character?.name || "Unknown"}
Role: ${player?.character?.role || ""}
Description: ${player?.character?.description || ""}
Current Location: ${player?.town || ""}, ${player?.duchy || ""}

Conversation so far:
${(history || [])
  .map(h => `${h.role === "player" ? "Player" : "Narrator"}: ${h.content}`)
  .join("\n")}

Player says: ${message}`;

  return await ask(systemPrompt, userPrompt, 500, 0.7);
}




