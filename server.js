// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = process.env.PORT ? parseInt(process.env.PORT) : 3e3;
app.use(express.json({ limit: "10mb" }));
var DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
var DEFAULT_SYSTEM_INSTRUCTION = "You are MITU, a warm, intelligent, and helpful Android voice AI assistant companion. Speak concisely, friendly, and naturally. You can speak English, Hindi, and Hinglish based on what the user speaks.";
var OPENAI_COMPATIBLE = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  groq: { baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", model: "meta-llama/llama-3.2-3b-instruct:free" },
  ollama: { baseUrl: "http://localhost:11434/v1", model: "llama3.1" }
};
var ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
var ANTHROPIC_VERSION = "2023-06-01";
var UpstreamError = class extends Error {
  constructor(message, status) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
  }
};
function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function trimSlash(url) {
  return url.replace(/\/+$/, "");
}
function getGeminiClient(customApiKey) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY or provide one.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
async function chatWithGemini(req0, model) {
  const ai = getGeminiClient(req0.apiKey);
  const contents = (req0.messages || []).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));
  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: req0.systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
      temperature: req0.temperature !== void 0 ? req0.temperature : 0.7
    }
  });
  return response.text || "";
}
async function chatWithOpenAiCompatible(req0, providerType, model) {
  const fallback = OPENAI_COMPATIBLE[providerType];
  const baseUrl = trimSlash(hasText(req0.baseUrl) ? req0.baseUrl : fallback.baseUrl);
  const system = hasText(req0.systemInstruction) ? [{ role: "system", content: req0.systemInstruction }] : [];
  const messages = [
    ...system,
    ...(req0.messages || []).map((m) => ({ role: m.role, content: m.content }))
  ];
  const headers = { "Content-Type": "application/json" };
  if (hasText(req0.apiKey)) headers.Authorization = `Bearer ${req0.apiKey}`;
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature: req0.temperature !== void 0 ? req0.temperature : 0.7
    })
  });
  if (!response.ok) {
    throw new UpstreamError(
      `${providerType} error (HTTP ${response.status}): ${(await response.text()).slice(0, 400)}`,
      response.status
    );
  }
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!hasText(text)) {
    throw new UpstreamError(`${providerType} returned no message content.`);
  }
  return text;
}
async function chatWithAnthropic(req0, model) {
  if (!hasText(req0.apiKey)) {
    throw new Error("Anthropic requires an API key (set it in Settings \u2192 Providers).");
  }
  const baseUrl = trimSlash(hasText(req0.baseUrl) ? req0.baseUrl : ANTHROPIC_BASE_URL);
  const response = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": req0.apiKey,
      "anthropic-version": ANTHROPIC_VERSION
    },
    body: JSON.stringify({
      model,
      // max_tokens is mandatory on the Messages API.
      max_tokens: 1024,
      system: hasText(req0.systemInstruction) ? req0.systemInstruction : DEFAULT_SYSTEM_INSTRUCTION,
      temperature: req0.temperature !== void 0 ? req0.temperature : 0.7,
      messages: (req0.messages || []).filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content }))
    })
  });
  if (!response.ok) {
    throw new UpstreamError(
      `anthropic error (HTTP ${response.status}): ${(await response.text()).slice(0, 400)}`,
      response.status
    );
  }
  const data = await response.json();
  const text = Array.isArray(data?.content) ? data.content.map((c) => c?.text || "").join("") : "";
  if (!hasText(text)) {
    throw new UpstreamError("anthropic returned no text content.");
  }
  return text;
}
app.post("/api/chat", async (req, res) => {
  const {
    messages,
    systemInstruction,
    model,
    apiKey,
    temperature,
    providerType = "gemini",
    baseUrl
  } = req.body;
  const type = String(providerType || "gemini").toLowerCase();
  const defaultModel = type === "gemini" ? DEFAULT_GEMINI_MODEL : type === "anthropic" ? "claude-3-5-haiku-latest" : OPENAI_COMPATIBLE[type]?.model;
  if (!defaultModel) {
    return res.status(400).json({ success: false, error: `Unsupported provider: ${providerType}` });
  }
  const chosenModel = hasText(model) ? model : defaultModel;
  try {
    let reply;
    const payload = { messages, systemInstruction, apiKey, temperature, baseUrl };
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
      provider: type
    });
  } catch (error) {
    console.error("Chat generation error:", error?.message || error);
    const statusCode = error?.status || error?.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: error?.message || "Failed to generate AI response"
    });
  }
});
function pcmToWav(pcm, sampleRate, channels = 1, bitsPerSample = 16) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28);
  header.writeUInt16LE(channels * bitsPerSample / 8, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
app.post("/api/tts", async (req, res) => {
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
          parts: [{ text }]
        }
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice }
          }
        }
      }
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: "No audio data returned by model" });
    }
    const raw = Buffer.from(base64Audio, "base64");
    const alreadyWav = raw.length > 44 && raw.subarray(0, 4).toString() === "RIFF";
    const sampleRate = 24e3;
    const wav = alreadyWav ? raw : pcmToWav(raw, sampleRate);
    return res.json({
      success: true,
      audioBase64: wav.toString("base64"),
      mimeType: "audio/wav",
      engine: "gemini-tts",
      voice: chosenVoice,
      sampleRate
    });
  } catch (err) {
    console.error("TTS generation error:", err?.message || err);
    return res.status(500).json({
      success: false,
      error: err.message || "TTS generation failed"
    });
  }
});
app.post("/api/test-key", async (req, res) => {
  const { provider, apiKey, model, baseUrl } = req.body;
  try {
    if (provider === "gemini") {
      const ai = getGeminiClient(apiKey);
      const testModel = model || DEFAULT_GEMINI_MODEL;
      const resp = await ai.models.generateContent({
        model: testModel,
        contents: "Respond with the single word: OK"
      });
      return res.json({
        valid: true,
        provider: "gemini",
        sampleResponse: resp.text?.trim() || "OK"
      });
    } else if (OPENAI_COMPATIBLE[provider]) {
      const fallback = OPENAI_COMPATIBLE[provider];
      const targetUrl = trimSlash(hasText(baseUrl) ? baseUrl : fallback.baseUrl);
      const targetModel = hasText(model) ? model : fallback.model;
      const response = await fetch(`${targetUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...hasText(apiKey) ? { Authorization: `Bearer ${apiKey}` } : {}
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 5
        })
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
          error: errorText
        });
      }
    } else if (provider === "anthropic") {
      const targetUrl = `${trimSlash(hasText(baseUrl) ? baseUrl : ANTHROPIC_BASE_URL)}/messages`;
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION
        },
        body: JSON.stringify({
          model: model || "claude-3-5-haiku-latest",
          max_tokens: 5,
          messages: [{ role: "user", content: "Hi" }]
        })
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
  } catch (error) {
    return res.status(500).json({
      valid: false,
      error: error.message || "Connection failed"
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: "0.0.0.0", port: PORT, allowedHosts: true },
      appType: "spa"
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
