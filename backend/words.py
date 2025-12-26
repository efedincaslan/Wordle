from __future__ import annotations

from pathlib import Path
from typing import Set, List
import datetime as dt
import hashlib


DATA_DIR = Path(__file__).resolve().parent / "data"
ANSWERS_PATH = DATA_DIR / "answers.txt"
GUESSES_PATH = DATA_DIR / "allowed_guesses.txt"


def _load_word_file(path: Path) -> List[str]:
    if not path.exists():
        raise FileNotFoundError(f"Missing word list file: {path}")
    words: List[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        w = line.strip().lower()
        if len(w) == 5 and w.isalpha():
            words.append(w)
    if not words:
        raise ValueError(f"No valid 5-letter words found in {path}")
    return words


def load_answers() -> List[str]:
    return _load_word_file(ANSWERS_PATH)


def load_allowed_guesses() -> Set[str]:
    # Allowed guesses often includes answers + extra words
    return set(_load_word_file(GUESSES_PATH))


def daily_answer(answers: List[str], today: dt.date | None = None) -> str:
    """
    Deterministic "word of the day" without a database.
    Same for everyone on the same date.
    """
    if today is None:
        today = dt.date.today()
    key = today.isoformat().encode("utf-8")
    digest = hashlib.sha256(key).hexdigest()
    idx = int(digest, 16) % len(answers)
    return answers[idx]
