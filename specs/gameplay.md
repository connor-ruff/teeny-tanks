# gameplay.md

This file describes the general game play for teeny-tanks

## Team Dynamics

There are always two teams competing against each other.
Each team is comprised of 1 to 5 players. 

## Objectives and End-Game Conditions

The game is capture the flag.
The objective is to grab the other teams flag (simply by driving your tank over it), and return it to your own "home base" which is simply the spawn-point of your own team's flag
When you successfully return the opposing team's flag, your team is awarded 1 point.
The end-game condition is simply a race to a certain number of points (typically 3 or 5, but this is configurable)

## Combat and Respawn Physics

Each tank is able to shoot bullets.
If a bullet strikes your tank, your tank is destroyed, and after a brief cool-down, you respawn in the genereal vicinity of your home base.
It only takes 1 single bullet to destroy your tank, and a bullet is deadly to any tank regardless of who fired it (i.e. you can destroy yourself or your teammates with your own bullet).

Bullets will "bounce" off of the map edges, dissapearing after a certain amount of time has passed (i.e. the bullets can "expire") or after they have destroyed a tank

## Other Notes on Game Stages

When a point is scored by a team, the map is immediately reset, and all tanks and flags return to their starting positions.

## Other Notes on Game Physics

The game map should always be oriented VERTICALLY, meaning that the team flags are at the north and south end of the maps, rather than east and west. 

