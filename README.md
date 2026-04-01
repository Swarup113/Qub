# Qub – Word Battle Game

A strategic two‑player word game where players compete on a 10×10 grid. Form valid English words by placing letters on the board, earn points for the longest word, and outsmart your opponent. The game features a 15‑second turn timer, dynamic scoring, and a sleek dark‑mode interface.

## Live Demo
**https://swarup113.github.io/Qub/**

## Features

- **Two‑Player Battle** – Play against a friend on the same device.
- **10×10 Grid** – Strategically place letters to form words horizontally or vertically.
- **Real‑time Timer** – 15 seconds per turn; miss it and lose 1 point!
- **Word Validation** – Uses a dictionary API to verify words (plus a built‑in list of valid 2‑letter words).
- **Unique Word Rule** – Repeating a word gives 0 points, encouraging creative vocabulary.
- **Dynamic Scoring** – Points equal the length of the longest valid word formed in your turn.
- **Player‑specific Styling** – Player 1 (cyan) and Player 2 (coral) have distinct colors for timer, keyboard hover, and score notifications.
- **Finish Game Modal** – View final scores and winner, with options to resume, start a new game, or quit.
- **Responsive Design** – Works on desktop, tablet, and mobile devices.

## How to Play

1. **Start the Game** – Enter player names (optional; defaults to "Player 1" / "Player 2") and click **Start Battle**.
2. **Take Turns** – The current player selects an empty cell and chooses a letter from the QWERTY keyboard.
3. **Form Words** – After placing a letter, the game checks for the longest valid word in the row and column containing the new letter.
4. **Scoring** – You earn points equal to the length of your best word. If you repeat a word, you score 0.
5. **Timer** – You have 15 seconds per turn. If time runs out, you lose 1 point and the turn passes.
6. **Game End** – The game ends when all cells are filled or a player manually finishes. The player with the highest score wins.

## Rules

- **Word Length** – Only words with at least 2 letters count.
- **2‑Letter Words** – Must be standard English words (e.g., "am", "in", "ok"). No abbreviations or slang.
- **Word Validation** – Longer words (≥3 letters) are validated using a public dictionary API. The game caches results to avoid repeated requests.
- **Unique Words** – Repeating a word (case‑insensitive) during the game yields 0 points for that turn.
- **Turn Order** – Players alternate turns. If you form a valid word, you keep your turn; otherwise, the turn passes to the opponent.
- **Timeout Penalty** – If the timer reaches 0, you lose 1 point and the turn passes immediately.

## Scoring System

- **Points per Turn** = Length of the longest valid word you create in that turn.
- **Bonus** – None. Points are purely based on word length.
- **Penalties** – Timeout: –1 point. Repeated word: 0 points for that turn.
- **Game Winner** – The player with the higher score when all cells are filled or when the game is finished manually wins. In case of a tie, the game declares a tie.

## Technologies Used

- **HTML5** – Structure and layout.
- **CSS3** – Custom properties, animations, responsive design, and modern styling.
- **JavaScript (ES6+)** – Game logic, API calls, timer, and DOM manipulation.
- **Dictionary API** – [Free Dictionary API](https://dictionaryapi.dev/) for word validation.
- **Google Fonts** – Space Grotesk and JetBrains Mono.

## License
- MIT License
