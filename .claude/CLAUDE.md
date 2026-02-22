# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

teeny-tanks — a web-based multi-player lobby-style game where players control teeny tanks and try to capture their opposing teams flag

## Gameplay Specs

- **Teams**: 2 teams (Red vs Blue), 1–5 players per team
- **Objective**: Capture the Flag — drive over the enemy flag to pick it up, return it to your team's flag spawn to score 1 point
- **End-game**: First team to reach the target score wins (configurable; typically 3 or 5 points)
- **Map orientation**: VERTICAL — Red and Blue flags are at the north (top) and south (bottom) of the map, not east/west
- **On score**: Map resets immediately — all tanks and flags return to their starting positions
- **Combat**: 1 bullet destroys any tank; friendly fire is enabled (you can destroy yourself or teammates)
- **Bullets**: Bounce off all 4 map edges; expire after a time limit OR after destroying a tank
- **Respawn**: Destroyed tanks respawn near their home base after a brief cooldown
