Robot Escape - Project 3b
Nick Thai (Level 1: Abandoned Factory) and Delano Meindl (Level 2: Mystical Mountains)

(Fill in before submitting: controls, camera behavior, who made which level + unique mechanic,
how to select a level, and bonus elements.)

------------------------------------------------------------
Folder layout
------------------------------------------------------------
index.html, phaser.min.js     run the game from a local server (e.g. VS Code Live Server)
js/
  main.js                     Phaser config + scene list
  Player.js                   shared robot movement (both levels use it)
  scenes/                     Title.js, Level1.js (Nick), Level2.js (Delano)
assets/
  sprites/robot/              robot images
  tilemaps/                   the levels. Edit the .tmx in Tiled, then
                              File > Export As > JSON with the same name - Phaser loads the .json
    level1_factory.tmx        Nick's level
    level2_mountains.tmx/.json   Delano's level
    movement_test.json        simple test map for tuning movement (not a level)
  tilesets/                   tile images; level tilesets also have a Tiled .tsx
    mountains/  custom/  placeholder/  industrial/
  backgrounds/mountains/      parallax background layers for level 2
  decorations/mountains/      trees, house, torches, clouds... (+ mountain_decorations.tsx)
  audio/                      sound effects
docs/                         level previews
