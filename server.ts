import express, { Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: "10mb" }));

const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
const DEFAULT_SYSTEM_INSTRUCTION =
  "You are MITU, a warm, intelligent, and helpful Android voice AI assistant companion. Speak concisely, friendly, and naturally. You can speak English, Hindi, and Hinglish based on what the user speaks.";

/** OpenAI-compatible providers and their default base URLs (must match src/types ProviderConfig). */
const OPENAI_COMPATIBLE: Record<string, { baseUrl: string; model: string }> = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  groq: { baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", model: "meta-llama/llama-3.2-3b-instruct:free" },
  ollama: { baseUrl: "http://localhost:11434/v1", model: "llama3.1" },
};
const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";

/** An upstream (provider) failure that carries the provider's HTTP status to the client. */
class UpstreamError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
  }
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function trimSlash(url: string) {
  return url.replace(/\/+$/, "");
}

// Server-side Gemini client helper. The server key is only ever used for Gemini requests
// that arrive without their own key.
function getGeminiClient(customApiKey?: string) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY or provide one.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  systemInstruction?: string;
  model?: string;
  apiKey?: string;
  temperature?: number;
  providerType?: string;
  baseUrl?: string;
}

async function chatWithGemini(req0: ChatRequest, model: string) {
  const ai = getGeminiClient(req0.apiKey);

  // Format contents for Gemini
  const contents = (req0.messages || []).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: req0.systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
      temperature: req0.temperature !== undefined ? req0.temperature : 0.7,
    },
  });

  return response.text || "";
}

async function chatWithOpenAiCompatible(req0: ChatRequest, providerType: string, model: string) {
  const fallback = OPENAI_COMPATIBLE[providerType];
  const baseUrl = trimSlash(hasText(req0.baseUrl) ? req0.baseUrl : fallback.baseUrl);
  const system = hasText(req0.systemInstruction) ? [{ role: "system", content: req0.systemInstruction }] : [];
  const messages = [
    ...system,
    ...(req0.messages || []).map((m) => ({ role: m.role, content: m.content })),
  ];

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Ollama runs without auth; every other compatible provider needs the bearer token.
  if (hasText(req0.apiKey)) headers.Authorization = `Bearer ${req0.apiKey}`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature: req0.temperature !== undefined ? req0.temperature : 0.7,
    }),
  });

  if (!response.ok) {
    throw new UpstreamError(
      `${providerType} error (HTTP ${response.status}): ${(await response.text()).slice(0, 400)}`,
      response.status
    );
  }

  const data: any = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!hasText(text)) {
    throw new UpstreamError(`${providerType} returned no message content.`);
  }
  return text as string;
}

async function chatWithAnthropic(req0: ChatRequest, model: string) {
  if (!hasText(req0.apiKey)) {
    throw new Error("Anthropic requires an API key (set it in Settings → Providers).");
  }
  const baseUrl = trimSlash(hasText(req0.baseUrl) ? req0.baseUrl : ANTHROPIC_BASE_URL);

  const response = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": req0.apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      // max_tokens is mandatory on the Messages API.
      max_tokens: 1024,
      system: hasText(req0.systemInstruction) ? req0.systemInstruction : DEFAULT_SYSTEM_INSTRUCTION,
      temperature: req0.temperature !== undefined ? req0.temperature : 0.7,
      messages: (req0.messages || [])
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    throw new UpstreamError(
      `anthropic error (HTTP ${response.status}): ${(await response.text()).slice(0, 400)}`,
      response.status
    );
  }

  const data: any = await response.json();
  const text = Array.isArray(data?.content) ? data.content.map((c: any) => c?.text || "").join("") : "";
  if (!hasText(text)) {
    throw new UpstreamError("anthropic returned no text content.");
  }
  return text as string;
}

// 1. Text & Multimodal Chat Endpoint (routes to whichever provider Settings selected)
app.post("/api/chat", async (req: Request, res: Response) => {
  const {
    messages,
    systemInstruction,
    model,
    apiKey,
    temperature,
    providerType = "gemini",
    baseUrl,
  } = req.body as ChatRequest;

  const type = String(providerType || "gemini").toLowerCase();
  const defaultModel =
    type === "gemini"
      ? DEFAULT_GEMINI_MODEL
      : type === "anthropic"
        ? "claude-3-5-haiku-latest"
        : OPENAI_COMPATIBLE[type]?.model;

  if (!defaultModel) {
    return res.status(400).json({ success: false, error: `Unsupported provider: ${providerType}` });
  }

  const chosenModel = hasText(model) ? model : defaultModel;

  try {
    let reply: string;
    const payload: ChatRequest = { messages, systemInstruction, apiKey, temperature, baseUrl };
    if (type === "gemini") {
      reply = await chatWithGemini(payload, chosenModel);
    } else if (type === "anthropic") {
      reply = await chatWithAnthropic(payload, chosenModel);
    } else {
      reply = await chatWithOpenAiCompatible(payload, type, chosenModel);
    }

    return res.json({
      success: true,
      text: reply,
      model: chosenModel,
      provider: type,
    });
  } catch (error: any) {
    console.error("Chat generation error:", error?.message || error);
    const statusCode = error?.status || error?.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: error?.message || "Failed to generate AI response",
    });
  }
});

/**
 * Gemini TTS hands back headerless 16-bit PCM. A raw PCM stream served as `audio/wav` cannot be
 * decoded by the browser (it silently falls back to Web Speech), so wrap it in a RIFF/WAVE header.
 */
function pcmToWav(pcm: Buffer, sampleRate: number, channels = 1, bitsPerSample = 16): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM fmt chunk size
  header.writeUInt16LE(1, 20); // audio format 1 = PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE((sampleRate * channels * bitsPerSample) / 8, 28);
  header.writeUInt16LE((channels * bitsPerSample) / 8, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

// 2. Real-time TTS Endpoint using gemini-3.8-flash-lite-tts
app.post("/api/tts", async (req: Request, res: Response) => {
  try {
    const { text, voice, apiKey } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }
    const ai = getGeminiClient(apiKey);
    const chosenVoice = voice || "Zephyr";

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-lite-tts",
      contents: [
        {
          role: "user",
          parts: [{ text }],
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: "No audio data returned by model" });
    }

    const raw = Buffer.from(base64Audio, "base64");
    const alreadyWav = raw.length > 44 && raw.subarray(0, 4).toString() === "RIFF";
    const sampleRate = 24000;
    const wav = alreadyWav ? raw : pcmToWav(raw, sampleRate);

    return res.json({
      success: true,
      audioBase64: wav.toString("base64"),
      mimeType: "audio/wav",
      engine: "gemini-tts",
      voice: chosenVoice,
      sampleRate,
    });
  } catch (err: any) {
    console.error("TTS generation error:", err?.message || err);
    return res.status(500).json({
      success: false,
      error: err.message || "TTS generation failed",
    });
  }
});

// 3. API Key & Provider Verification Endpoint
app.post("/api/test-key", async (req: Request, res: Response) => {
  const { provider, apiKey, model, baseUrl } = req.body;

  try {
    if (provider === "gemini") {
      const ai = getGeminiClient(apiKey);
      const testModel = model || DEFAULT_GEMINI_MODEL;
      const resp = await ai.models.generateContent({
        model: testModel,
        contents: "Respond with the single word: OK",
      });
      return res.json({
        valid: true,
        provider: "gemini",
        sampleResponse: resp.text?.trim() || "OK",
      });
    } else if (OPENAI_COMPATIBLE[provider]) {
      // Test the endpoint the user actually configured (a Groq URL would wrongly fail OpenRouter).
      const fallback = OPENAI_COMPATIBLE[provider];
      const targetUrl = trimSlash(hasText(baseUrl) ? baseUrl : fallback.baseUrl);
      const targetModel = hasText(model) ? model : fallback.model;

      const response = await fetch(`${targetUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(hasText(apiKey) ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 5,
        }),
      });

      if (response.ok) {
        return res.json({ valid: true, provider, status: response.status, baseUrl: targetUrl });
      } else {
        const errorText = await response.text();
        return res.status(response.status).json({
          valid: false,
          provider,
          status: response.status,
          baseUrl: targetUrl,
          error: errorText,
        });
      }
    } else if (provider === "anthropic") {
      const targetUrl = `${trimSlash(hasText(baseUrl) ? baseUrl : ANTHROPIC_BASE_URL)}/messages`;
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: model || "claude-3-5-haiku-latest",
          max_tokens: 5,
          messages: [{ role: "user", content: "Hi" }],
        }),
      });

      if (response.ok) {
        return res.json({ valid: true, provider: "anthropic" });
      } else {
        const errorText = await response.text();
        return res.status(response.status).json({ valid: false, provider: "anthropic", error: errorText });
      }
    } else {
      return res.status(400).json({ valid: false, error: "Unsupported provider" });
    }
  } catch (error: any) {
    return res.status(500).json({
      valid: false,
      error: error.message || "Connection failed",
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: "0.0.0.0", port: PORT, allowedHosts: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MITU Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
