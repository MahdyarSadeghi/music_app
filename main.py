from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os
import shutil
from pathlib import Path

app = FastAPI(title="Music App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

AUDIO_DIR = Path("static/audio")
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")


def get_db():
    conn = sqlite3.connect("music.db")
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            filename TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


init_db()


@app.get("/", response_class=HTMLResponse)
def index():
    with open("templates/index.html", encoding="utf-8") as f:
        return f.read()


@app.get("/songs")
def list_songs():
    conn = get_db()
    songs = conn.execute("SELECT * FROM songs ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(s) for s in songs]


@app.post("/songs")
async def upload_song(
    title: str = Form(...),
    artist: str = Form(...),
    file: UploadFile = File(...),
):
    if not file.filename.endswith(".mp3"):
        raise HTTPException(status_code=400, detail="فقط فایل MP3 قابل قبول است")

    safe_name = f"{title}_{artist}".replace(" ", "_").replace("/", "_")
    filename = f"{safe_name}.mp3"
    dest = AUDIO_DIR / filename

    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    conn = get_db()
    conn.execute(
        "INSERT INTO songs (title, artist, filename) VALUES (?, ?, ?)",
        (title, artist, filename),
    )
    conn.commit()
    conn.close()

    return {"message": "آهنگ با موفقیت آپلود شد", "filename": filename}


@app.delete("/songs/{song_id}")
def delete_song(song_id: int):
    conn = get_db()
    song = conn.execute("SELECT * FROM songs WHERE id = ?", (song_id,)).fetchone()
    if not song:
        conn.close()
        raise HTTPException(status_code=404, detail="آهنگ پیدا نشد")

    file_path = AUDIO_DIR / song["filename"]
    if file_path.exists():
        file_path.unlink()

    conn.execute("DELETE FROM songs WHERE id = ?", (song_id,))
    conn.commit()
    conn.close()
    return {"message": "آهنگ حذف شد"}


@app.get("/audio/{filename}")
def stream_audio(filename: str):
    file_path = AUDIO_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="فایل صوتی پیدا نشد")
    return FileResponse(file_path, media_type="audio/mpeg")
