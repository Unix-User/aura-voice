import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  ...(process.env.OPENAI_BASE_URL && { baseURL: process.env.OPENAI_BASE_URL }),
});

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const model = process.env.WEBUI_MODEL || 'gpt-4o';

  if (process.env.WEBUI_BASE_URL && process.env.WEBUI_API_KEY) {
    try {
      const response = await fetch(`${process.env.WEBUI_BASE_URL}/ollama/api/generate`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WEBUI_API_KEY}`
        },
        body: JSON.stringify({
          model: model,
          prompt: messages[messages.length - 1].content,
          stream: false,
          raw: false,
          keep_alive: 0
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.text();
      try {
        const jsonData = JSON.parse(data);
        return NextResponse.json(jsonData.response);
      } catch (parseError) {
        return NextResponse.json({ response: data });
      }

    } catch (error) {
      return NextResponse.json({ error: "Failed to get response from WebUI" }, { status: 500 });
    }
  } else {
    // Fallback to OpenAI
    try {
      const response = await openai.chat.completions.create({
        model: model as string,
        stream: false,
        messages,
      });

      return NextResponse.json(response.choices[0].message.content);
    } catch (error) {
      return NextResponse.json({ error: "Failed to get response from OpenAI" }, { status: 500 });
    }
  }
}
