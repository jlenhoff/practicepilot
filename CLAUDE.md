# CLAUDE.md: practicepilot

## Live dependencies: do not move, rename or delete
- `generated-images/` and `flyers/` are live dependencies of the Social Content Engine, the Apps Script project in the `houston-heights-therapy/hht-apps-script` repo (`projects/social-content-engine`).
- The engine reads images from both folders through raw.githubusercontent.com URLs on `main`, and writes new post images into `generated-images/`.
- Never move, rename or delete either folder or the files in them. Doing so breaks scheduled social posts with no warning here.
- The engine's code lives only in hht-apps-script. Do not add copies of it to this repo.
