import { OpenAI } from "openai";
import { NextResponse, NextRequest } from "next/server";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  ...(process.env.OPENAI_BASE_URL && { baseURL: process.env.OPENAI_BASE_URL }),
});

interface RequestBody {
  audio: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (process.env.WEBUI_TRANSCRIPTIONS_URL && process.env.WEBUI_API_KEY) {
      const req = await request.json();
      
      const audioBuffer = Buffer.from(req.audio, 'base64');
      
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: 'input.mp3',
        contentType: 'audio/mpeg'
      });

      const response = await axios.post(process.env.WEBUI_TRANSCRIPTIONS_URL, formData, {
        headers: {
          'Authorization': `Bearer ${process.env.WEBUI_API_KEY}`,
          'accept': 'application/json',
          ...formData.getHeaders()
        }
      });
      return NextResponse.json(response.data);
      
    } else {
      const req = await request.json();
      const base64Audio = req.audio;
      const audio = Buffer.from(base64Audio, "base64");

      const outputPath = "/tmp/input.mp3";
      fs.writeFileSync(outputPath, audio);

      try {
        const response = await openai.audio.transcriptions.create({
          file: fs.createReadStream(outputPath),
          model: "whisper-1",
        });

        return NextResponse.json({ result: response.text }, { status: 200 });
      } finally {
        fs.unlinkSync(outputPath);
      }
    }
  } catch (error: any) {
    console.error("Error processing audio:", error.response ? error.response.data : error.message);
    return NextResponse.json(
      { error: "An error occurred during transcription", details: error.message },
      { status: 500 }
    );
  }
}
