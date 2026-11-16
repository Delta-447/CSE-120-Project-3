Robot Escape - Project 3b
Nick Thai (Level 1: Abandoned Factory) and Delano Meindl (Level 2: Mystical Mountains)

------------------------------------------------------------
How to play
------------------------------------------------------------
Run the game from a local server (e.g. VS Code Live Server) and open index.html.

Choosing a level: on the title screen press 1 or 2, or click a level name.

Goal: collect at least 5 energy crystals (100 points each), then reach the exit.
The exit stays locked until you have 5 crystals.

Controls
  A / D or Left / Right    move
  W / Up / Space           jump (hold longer to jump higher)
  R                        respawn at last checkpoint
  Esc                      back to the title screen
  G                        show/hide hitboxes (debug)

Health: 3 hearts. Hazards cost a heart and knock you back; falling off the level
costs a heart and respawns you at the last checkpoint. At 0 hearts you respawn
with full health. Reaching a checkpoint refills your hearts.

------------------------------------------------------------
Camera
------------------------------------------------------------
Horizontally scrolling camera that smoothly follows the robot with a dead zone,
clamped to the level edges (it stops at the start and at the exit area and
scrolls back if the player backtracks). Level 2 has 5 parallax background
layers that scroll at different speeds.

------------------------------------------------------------
Levels
------------------------------------------------------------
Level 1 - Abandoned Factory (Nick Thai)
  Industrial tileset; warning-sign hazards; 5 energy crystals; exit door.
  Unique mechanic: (Nick - fill in)

Level 2 - Mystical Mountains (Delano Meindl)
  Three sections: The Cliffs, Drifting Stones, The Ascent.
  Unique mechanic: moving platforms and step-activated elevators. Some platforms
  ride back and forth or up and down on a loop; elevators wait until you stand
  on them, carry you up, pause, and return.
  Also: hanging spiky rocks and floor spikes, 2 checkpoints, 9 crystals (5 needed),
  house exit at the top of the final cliff.

------------------------------------------------------------
Assets
------------------------------------------------------------
Robot: Kenney Robot Pack
Level 1 tiles: Kenney Pixel Platformer Industrial Expansion
Level 2 tiles, backgrounds, decorations: "Pixel Art Tiles and Backgrounds - Mountains"
Custom tiles (4): energy crystal, hanging spikes, floor spikes, checkpoint flag
Sound effects: custom, generated for this project (jump, land, collect, hurt,
checkpoint, locked exit, level complete)
Particles: custom (crystal sparkle, landing dust, hurt sparks, level-complete burst)

------------------------------------------------------------
Bonus elements
------------------------------------------------------------
- Parallax scrolling backgrounds (Level 2)
- Health system with knockback and invulnerability frames
- Checkpoints
- Moving platforms and triggered elevators
- Level complete screen with score, crystals found and time
- Jump feel: variable jump height, coyote time, jump buffering

------------------------------------------------------------
Folder layout
------------------------------------------------------------
index.html, phaser.min.js
js/
  main.js                     Phaser config + scene list
  Player.js                   robot movement, shared by both levels
  BaseLevel.js                shared level logic: loads the Tiled map, crystals,
                              hazards, health, checkpoints, moving platforms, exit, HUD
  scenes/                     Title.js, Level1.js, Level2.js, LevelComplete.js
assets/
  sprites/robot/              robot images
  tilemaps/                   levels. Edit the .tmx in Tiled, then
                              File > Export As > JSON with the same name (Phaser loads the .json)
    level1_factory.tmx/.json  Nick's level
    level2_mountains.tmx/.json Delano's level
    movement_test.json        old movement test map (not used by the game)
  tilesets/                   tile images; level tilesets also have a Tiled .tsx
  backgrounds/mountains/      parallax layers for level 2
  decorations/mountains/      trees, house, torches, clouds (+ mountain_decorations.tsx)
  audio/                      sound effects
docs/                         level previews

How the game reads a Tiled map (both levels):
  Tile layer named Ground/Platform (or property collides=true)  -> solid
  Tile layer named Hazards/Spikes (or property hazard=true)     -> hurts the player
  Object named "spawn"                                          -> start position
  Objects in a layer with "Crystal" in its name (or type crystal) -> crystals
  Objects in a layer with "Exit" in its name (or type exit)     -> exit
  Objects of type checkpoint / movingPlatform                   -> checkpoints / platforms
  Other tile objects                                            -> decorations
