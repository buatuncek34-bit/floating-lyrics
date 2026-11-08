const express = require("express");
const multer = require("multer");
const OpenAI = require("openai");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({
  dest: path.join(__dirname, "uploads"),
  limits: { fileSize: 25 * 1024 * 1024 }
});
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(",").map(x => x.trim())
    : true
}));

app.get("/", (_req, res) => res.send("Floating Lyrics API is running."));

app.post("/transcribe", upload.single("music"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "File musik tidak ditemukan." });

  const filePath = req.file.path;
  try {
    const result = await client.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"]
    });

    res.json({
      text: result.text || "",
      segments: (result.segments || []).map(s => ({
        start: s.start,
        end: s.end,
        text: s.text
      }))
    });
  } catch (error) {
    console.error("Transcription error:", error.message);
    res.status(500).json({
      error: "Transkripsi gagal. Periksa API key, billing, format audio, dan batas ukuran file."
    });
  } finally {
    fs.promises.unlink(filePath).catch(() => {});
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));