import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text?.trim()) {
      return new Response(JSON.stringify({ error: "No text provided" }), { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not set" }), { status: 500 });
    }

    // Call Gemini TTS via REST API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Kore" }
              }
            }
          }
        })
      }
    );

    if (!response.ok) {
      const err = await response.json();
      console.error("[TTS_API_ERROR]", err);
      return new Response(JSON.stringify({ error: err.error?.message || "TTS failed" }), { status: response.status });
    }

    const data = await response.json();
    const audioBase64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const mimeType = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || "audio/wav";

    if (!audioBase64) {
      return new Response(JSON.stringify({ error: "No audio in response" }), { status: 500 });
    }

    // Convert base64 to binary and return as audio
    const audioBuffer = Buffer.from(audioBase64, "base64");
    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[TTS_ERROR]", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
