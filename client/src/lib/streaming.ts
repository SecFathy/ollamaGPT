import { LlamaRequestOptions, LlamaStreamResponse } from "./types";

const LLAMA_API_URL = "http://13.40.186.0:11434/api/generate";

export async function generateCompletion(
  options: LlamaRequestOptions,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const response = await fetch("/api/llama/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      // Use default error message if we can't parse the response
    }
    throw new Error(errorMessage);
  }

  // If not streaming, return the complete response
  if (!options.stream) {
    const data = await response.json();
    return data.response || "";
  }

  // Handle streaming response
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body not available for streaming");
  }

  const decoder = new TextDecoder("utf-8");
  let completeResponse = "";
  let buffer = ""; // Buffer to handle partial JSON objects

  // Immediately show an initial empty response to improve perceived responsiveness
  if (onChunk) {
    onChunk("");
  }

  // Function to process chunks as they arrive
  const processChunk = async () => {
    try {
      const { done, value } = await reader.read();
      
      if (done) {
        return true; // Signal completion
      }

      // Decode the chunk
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      // Process any complete JSON objects in the buffer
      const lines = buffer.split("\n");
      
      // The last line might be incomplete, so we keep it in the buffer
      buffer = lines.pop() || "";
      
      for (const line of lines) {
        if (line.trim() === "") continue;
        
        try {
          const parsedChunk = JSON.parse(line) as LlamaStreamResponse;
          
          if (parsedChunk.response) {
            completeResponse += parsedChunk.response;
            // Immediately update the UI with the new text in a non-blocking way
            if (onChunk) {
              // Use setTimeout with 0ms to prevent UI blocking
              setTimeout(() => onChunk(parsedChunk.response), 0);
            }
          }
          
          if (parsedChunk.done) {
            return true; // Signal completion
          }
        } catch (jsonError) {
          console.warn("Failed to parse JSON line:", line, jsonError);
          // Continue with other lines even if one fails
        }
      }
      
      return false; // Signal to continue reading
    } catch (error) {
      console.error("Error processing streaming response:", error);
      return true; // Signal completion on error
    }
  };

  // Process chunks in a loop for more responsive streaming
  while (true) {
    const isDone = await processChunk();
    if (isDone) break;
  }

  // Process any remaining data in the buffer
  if (buffer.trim() !== "") {
    try {
      const parsedChunk = JSON.parse(buffer) as LlamaStreamResponse;
      if (parsedChunk.response) {
        completeResponse += parsedChunk.response;
        onChunk?.(parsedChunk.response);
      }
    } catch (error) {
      console.warn("Failed to parse final buffer:", buffer);
    }
  }

  return completeResponse;
}

export async function cancelGeneration(): Promise<void> {
  try {
    await fetch("/api/llama/cancel", {
      method: "POST",
    });
  } catch (error) {
    console.error("Error cancelling generation:", error);
  }
}
