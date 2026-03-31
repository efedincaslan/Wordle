Efe’s Daily Word

A full-stack Wordle-style daily word game built with FastAPI (Python) and a vanilla JavaScript frontend.
The application generates a deterministic “word of the day” so every player receives the same puzzle on the same date without requiring a database.

The backend API is deployed on Render, and the frontend is hosted on Netlify.

Live Demo

Frontend:
https://efeswordoftheday.netlify.app

Backend API:
https://wordle-nbni.onrender.com

Project Overview

This project replicates the mechanics of Wordle while implementing a modern API-driven architecture.

Key characteristics:

Backend game logic handled through a FastAPI REST API
Deterministic daily word generation using SHA-256 hashing
Frontend game interface written in pure JavaScript
Persistent player statistics stored using localStorage
Cross-origin requests enabled via CORS middleware
Fully deployed using Render (backend) + Netlify (frontend)
Architecture
Frontend (Netlify)
│
│  Fetch API
▼
FastAPI Backend (Render)
│
├── Word validation
├── Guess scoring
├── Daily word generation
└── Game response

Workflow:

User enters a guess in the browser
Frontend sends guess to /guess API endpoint
Backend compares guess with the daily target word
Backend returns result (correct, present, absent)
Frontend animates tile colors and updates keyboard state
Backend (FastAPI)

The backend provides the game logic and scoring system.

Key responsibilities:

Deterministic daily word selection
Validating guesses
Scoring guesses with duplicate letter handling
Returning game results to the client

Example API response:

{
  "result": ["correct", "absent", "present", "absent", "correct"],
  "is_win": false,
  "row_message": "Submitted."
}
Daily Word Generation

The daily word is selected using a SHA-256 hash of the current date, ensuring:

Same word for all players
No database required
Deterministic rotation through the answer list
digest = hashlib.sha256(today.isoformat().encode("utf-8")).hexdigest()
idx = int(digest, 16) % len(answers)
Guess Scoring Algorithm

The scoring algorithm replicates Wordle's duplicate-letter rules:

First pass marks correct letters (green)
Second pass marks present letters (yellow) if remaining counts exist
Remaining letters are marked absent (gray)

This ensures correct handling of repeated characters.

Frontend

The frontend is implemented with HTML, CSS, and vanilla JavaScript.

Features include:

Interactive 6×5 game grid
On-screen keyboard
Animated tile reveals
Local statistics tracking
Emoji share results
Win/Loss modal summary

Game results can be copied and shared:

Efe’s Daily Word 2026-03-31 — 4/6

⬛⬛🟨⬛⬛
⬛🟩⬛🟨⬛
⬛🟩🟩⬛⬛
🟩🟩🟩🟩🟩

The frontend communicates with the backend using the Fetch API.

Game State Management

Game progress is tracked locally in the browser.

Stored statistics include:

Games played
Win percentage
Current streak
Maximum streak

This is implemented using localStorage.

Tech Stack

Backend

Python
FastAPI
Pydantic
Uvicorn

Frontend

HTML5
CSS3
Vanilla JavaScript

Deployment

Render (API hosting)
Netlify (frontend hosting)
UI Design

The UI is styled using custom CSS and includes:

Animated tile state transitions
On-screen keyboard feedback
Win/loss modal results
Responsive layout for smaller screens

Styling and animations are implemented using modern CSS variables and animations.

How to Run Locally
Clone the repository
git clone https://github.com/yourusername/efes-daily-word.git
cd efes-daily-word
Start the backend
pip install fastapi uvicorn
uvicorn main:app --reload

API runs at

http://127.0.0.1:8000
Run the frontend

Open index.html using a local server such as:

Live Server (VSCode)
Key Engineering Concepts Demonstrated

This project demonstrates:

REST API development
Backend-frontend separation
Deterministic hashing for state generation
Word-scoring algorithms
asynchronous frontend API requests
browser storage for persistent stats
full deployment pipeline (Render + Netlify)
Future Improvements

Possible enhancements include:

Multiplayer leaderboard
Daily statistics database
User authentication
Mobile PWA support
Difficulty levels
Word history archive
