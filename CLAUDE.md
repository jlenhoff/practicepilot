# CLAUDE.md: practicepilot

## What this repo is
- This is a PUBLIC repo. Its main job is to be the public image host for the HHT Social Content Engine (see below). It also holds the static Practice Pilot pages deployed to Vercel.
- Being public is deliberate. Do not make it private (see "Live dependencies" for why and what would have to happen first).
- This is NOT Practice Arc. Practice Arc (formerly PracticeCompass) lives in `jlenhoff/practice-compass-v2`, which is private and stays private. Never copy Practice Arc code, config or docs into this repo.

## Never put secrets or anything sensitive here
- Anyone on the internet can read every file and every past commit in this repo. Deleting a file later does not remove it from history.
- Never commit API keys, tokens, passwords, `.env` files, service account files, database URLs, Script Properties values, or real Google Drive, Sheet or form IDs. Use placeholders such as `REPLACE_WITH_...`.
- The engine's GitHub token (used to write into `generated-images/`) lives only in the engine's Script Properties. It never goes in this repo.
- Never commit PHI, client names, client emails, intake answers, or any other client or staff personal data.
- If you find anything sensitive here, stop and tell Joe. Treat it as already leaked: the key must be rotated, not just deleted.

## Live dependencies: do not move, rename or delete
- `generated-images/` and `flyers/` are live dependencies of the Social Content Engine, the Apps Script project in the `houston-heights-therapy/hht-apps-script` repo (`projects/social-content-engine`).
- The engine reads images from both folders through raw.githubusercontent.com URLs on `main`, and writes new post images into `generated-images/`.
- Never move, rename or delete either folder or the files in them. Doing so breaks scheduled social posts with no warning here.
- The engine's code lives only in hht-apps-script. Do not add copies of it to this repo.
- This repo must stay public, and must not be renamed or transferred (including to the houston-heights-therapy org) without first updating the engine's image URLs in hht-apps-script and redeploying it. Instagram fetches these images from public raw.githubusercontent.com URLs.
