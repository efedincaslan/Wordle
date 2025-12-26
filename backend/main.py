from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import datetime as dt

from words import load_answers, load_allowed_guesses, daily_answer


app = FastAPI(title="Efe's Daily Word API")

# Allow your frontend (Netlify/local) to call this API
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)



ANSWERS = load_answers()
ALLOWED = load_allowed_guesses()

# Also allow answers as guesses even if not included
ALLOWED |= set(ANSWERS)


class GuessIn(BaseModel):
    guess: str = Field(..., min_length=5, max_length=5, description="5-letter guess")


class GuessOut(BaseModel):
    result: list[str]       # ["correct","present","absent",...]
    is_win: bool
    row_message: str


def score_guess(guess: str, target: str) -> list[str]:
    """
    Wordle scoring with duplicate-letter handling:
    1) Mark greens, decrement counts
    2) Mark yellows if remaining counts > 0 else gray
    """
    guess = guess.lower()
    target = target.lower()

    res = ["absent"] * 5
    counts = {}

    for ch in target:
        counts[ch] = counts.get(ch, 0) + 1

    # greens
    for i in range(5):
        if guess[i] == target[i]:
            res[i] = "correct"
            counts[guess[i]] -= 1

    # yellows
    for i in range(5):
        if res[i] == "correct":
            continue
        ch = guess[i]
        if counts.get(ch, 0) > 0:
            res[i] = "present"
            counts[ch] -= 1

    return res


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/guess", response_model=GuessOut)
def guess(payload: GuessIn):
    g = payload.guess.strip().lower()

    if len(g) != 5 or (not g.isalpha()):
        raise HTTPException(status_code=400, detail="Guess must be exactly 5 letters A–Z.")

    # Allow any 5-letter alphabetical guess (relaxed mode)
    pass


    target = daily_answer(ANSWERS, dt.date.today())
    result = score_guess(g, target)
    is_win = (g == target)

    return GuessOut(
        result=result,
        is_win=is_win,
        row_message="Nice! You got it 🎉" if is_win else "Submitted."
    )
