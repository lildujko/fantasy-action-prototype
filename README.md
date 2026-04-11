# Random MMO RPG Game

This project is a simple 3D action game prototype inspired by fantasy RPGs. It is built with [Three.js](https://threejs.org/) and demonstrates basic mechanics such as third‑person movement, melee combat, enemy AI and a health system.

## Features

* **Third‑person movement** – Rotate left/right and move forward/back using A/D and W/S keys. Hold **Shift** to sprint.
* **Sword attack** – Press **Space** to perform a melee attack. Enemies hit by the sword will take damage. A short cooldown prevents spamming.
* **Enemy AI** – Enemies wander outside the player’s starting area, then chase and attempt to damage the player when nearby.
* **Health and respawn** – The health bar at the top of the screen shows the player’s current health. Taking damage reduces the bar. When health reaches zero, the player respawns at the origin with full health.
* **Kill counter** – The UI keeps track of how many enemies have been slain.

## Running the game

Simply open `index.html` in a modern web browser. The page loads Three.js from a CDN, so you must be online for the library to download. Controls are displayed in the top‑left corner.

You can host the game on GitHub Pages or any static web server. If you encounter blank screens while testing offline, ensure the CDN link for Three.js is reachable or download the library locally and adjust the script tag in `index.html`.

## Acknowledgements

The game uses [Three.js](https://threejs.org/) for rendering. Feel free to extend the game with more enemies, bosses, abilities, animations and improved models.
