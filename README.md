# Iron Front — WWII Browser FPS Prototype

A desktop-first browser FPS prototype with a stylized WWII village, mouse-look, WASD movement, shooting, bots, multiplayer position sync, account registration/login, and XP/kills persistence.

## Deploy to Render
1. Open Render Dashboard and choose **New + → Blueprint**.
2. Connect this GitHub repository: https://github.com/ykntr1/iron-front-ww2
3. Render detects `render.yaml`. Review and apply.
4. Wait for the deploy to finish, then open the `onrender.com` URL.

## Play
Register an account or deploy as guest. WASD to move, mouse to aim, click to fire, R to reload, Esc to release mouse.

## Notes
This is an early playable prototype, not a production game. It loads Three.js from a CDN and needs internet access. Free web services may sleep when idle. SQLite data on Render's ephemeral filesystem can be lost during redeploy/restart; use a persistent disk or managed database before relying on saved accounts/progression. Multiplayer state and bot logic are prototype-grade and require hardening before public competitive use.
