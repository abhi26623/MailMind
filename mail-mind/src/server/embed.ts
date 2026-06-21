import { env } from "@/env";

/**
 * Generate a 768-dimensional embedding for a given text using Google's Gemini API.
 * This completely removes the memory overhead of local ONNX models.
 */
export async function embedText(text: string): Promise<number[]> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured for embeddings.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      model: "models/text-embedding-004",
      content: {
        parts: [{ text }],
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini Embedding API Error:", errorText);
    throw new Error(`Failed to generate embedding: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const embedding = data?.embedding?.values;
  
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("Invalid embedding format returned from Gemini API");
  }

  return embedding;
}
