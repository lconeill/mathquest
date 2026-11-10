# Math Quest

A self-paced math app for young children (Kindergarten → Grade 1 today, built to grow to Grade 5).
It's an installable, offline-first PWA for Android.

## How it teaches
- **Concrete → Pictorial → Abstract**: each skill starts with pictures to count (ducks, apples), moves to dots and ten-frames, then to numerals. Hints step back down that ladder.
- **Mastery-based skill graph** (`src/curriculum/skills.ts`): a skill unlocks once its prerequisites are mastered (mastery ≥ 0.85 over ≥ 8 attempts).
- **Adaptive difficulty** within a skill: up after 3 first-try answers in a row, down after 2 misses.
- **Spaced review** of mastered skills (1 → 3 → 7 → 21 → 60 days).
- **Sessions** (~12 problems): ~70% current skills, ~20% review, ~10% "stretch" preview of the next skill.
- **Everything is spoken aloud** (on-device text-to-speech). Wrong answers get gentle, escalating hints, never a fail screen.
- **Rewards**: stars, a sticker book and Pip the mascot, who grows as stars are earned. A soft break reminder appears after a daily time limit.
- **Grown-ups area** (press and hold, then a multiplication question): per-skill progress, tricky skills, minutes per day, unlock/reset skills, settings, backup/restore.

## Develop
```
npm install
npm run art     # copy OpenMoji SVGs listed in src/art/art-list.json → public/art/
npm run dev
npm test
npm run build
```
Pushing to `main` deploys to GitHub Pages (`.github/workflows/deploy.yml`).

## Adding a grade
Add `Skill` entries to `src/curriculum/skills.ts` with a generator in `src/generators/`. If a new kind of interaction is needed, also add a `Problem` variant and an activity in `src/activities/`. The engine, scheduler and map pick up new skills automatically. The generator tests check every skill's answers.

## Testing hook
Set `localStorage['mq-debug'] = '1'` to expose the current problem as `window.__mq` for automated play-throughs.

## Credits
Illustrations: [OpenMoji](https://openmoji.org), CC BY-SA 4.0. Font: Nunito (OFL). The mascot, manipulatives and sound effects are original to this app.
