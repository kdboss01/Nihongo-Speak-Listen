# Nihongo: Speak & Listen

A local practice tool for spoken and listening Japanese. No hiragana, katakana, or kanji shown anywhere, just English, romaji, and audio. Progress saves to a markdown file you can open directly in Obsidian.

## Setup

1. Install [Node.js](https://nodejs.org) 18 or newer, if you don't have it already.
2. Open a terminal in this folder and run:
   ```
   npm install
   npm start
   ```
3. Open http://localhost:3000 in Chrome (Chrome has the best support for the speech recognition "Say it" uses).

## How it works

- **Listen** plays the phrase through your browser's built-in Japanese voice.
- **Say it** turns on your mic, listens for your attempt, and tells you whether it matched. Needs mic permission and Chrome (desktop or Android); Firefox and Safari don't support speech input the same way yet.
- The star button marks a phrase mastered, separate from the speaking check, since the matching is approximate and you should be the judge of when something's actually stuck.
- Progress (mastered, attempts, correct, last practiced) saves to `data/progress.md` every time it changes.

## Using it with Obsidian

By default, progress saves inside this project at `data/progress.md`. To have it save straight into your vault instead, set `PROGRESS_PATH` when you start the server:

**Mac/Linux:**
```
PROGRESS_PATH="/full/path/to/your/vault/Japanese Progress.md" npm start
```

**Windows (PowerShell):**
```
$env:PROGRESS_PATH="C:\full\path\to\your\vault\Japanese Progress.md"; npm start
```

The file is plain markdown with a checkbox per phrase, readable and editable in Obsidian. Checking or unchecking a box there toggles "mastered" the next time the app reads the file. The small `<!-- ... -->` comment on each line holds the attempt data the app needs to keep counting correctly; Obsidian hides it in preview, and you don't need to touch it.

One caveat: avoid editing the file while the server is running. The app rewrites the whole file on every save, so a manual edit made while it's live could get overwritten on the next practice event.

## Adding more phrases

Edit `data/phrases.js` and add entries in the same shape:
```js
{ id: "unique-id", en: "English meaning", romaji: "Romaji spelling", jp: "Japanese script for pronunciation", cat: "Category name" }
```
The `jp` field only feeds the audio, it's never shown on screen. New categories show up in the filter automatically, no other changes needed.

## Changing the port

If 3000 is already taken: `PORT=3001 npm start` (or `$env:PORT=3001; npm start` on PowerShell).
