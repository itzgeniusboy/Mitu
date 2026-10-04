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
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, systemInstruction, model, apiKey, temperature } = req.body;
    const ai = getGeminiClient(apiKey);
    const chosenModel = model || "gemini-3.8-flash";
    const contents = (messages || []).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));
    const response = await ai.models.generateContent({
      model: chosenModel,
      contents,
      config: {
        systemInstruction: systemInstruction || "You are MITU, a warm, intelligent, and helpful Android voice AI assistant companion. Speak concisely, friendly, and naturally. You can speak English, Hindi, and Hinglish based on what the user speaks.",
        temperature: temperature !== void 0 ? temperature : 0.7
      }
    });
    const reply = response.text || "";
    return res.json({
      success: true,
      text: reply,
      model: chosenModel
    });
  } catch (error) {
    console.error("Chat generation error:", error);
    const statusCode = error.status || error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to generate AI response"
    });
  }
});
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
    if (base64Audio) {
      return res.json({
        success: true,
        audioBase64: base64Audio,
        mimeType: "audio/wav"
      });
    } else {
      return res.status(500).json({ error: "No audio data returned by model" });
    }
  } catch (err) {
    console.error("TTS generation error:", err);
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
      const testModel = model || "gemini-3.8-flash";
      const resp = await ai.models.generateContent({
        model: testModel,
        contents: "Respond with the single word: OK"
      });
      return res.json({
        valid: true,
        provider: "gemini",
        sampleResponse: resp.text?.trim() || "OK"
      });
    } else if (provider === "openai" || provider === "groq" || provider === "openrouter") {
      const targetUrl = baseUrl || (provider === "groq" ? "https://api.groq.com/openai/v1" : provider === "openrouter" ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1");
      const targetModel = model || (provider === "groq" ? "llama-3.3-70b-versatile" : "meta-llama/llama-3.2-3b-instruct:free");
      const response = await fetch(`${targetUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 5
        })
      });
      if (response.ok) {
        return res.json({ valid: true, provider, status: response.status });
      } else {
        const errorText = await response.text();
        return res.status(response.status).json({
          valid: false,
          provider,
          status: response.status,
          error: errorText
        });
      }
    } else if (provider === "anthropic") {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
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
      server: { middlewareMode: true, host: "0.0.0.0", port: PORT },
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
