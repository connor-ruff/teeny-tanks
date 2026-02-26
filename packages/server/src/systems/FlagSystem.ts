import {
  GameState,
  Team,
  FLAG_PICKUP_DISTANCE,
  CAPTURE_ZONE_RADIUS,
  CAPTURE_ZONES,
} from '@teeny-tanks/shared';
import { resetFlag } from '../entities/Flag.js';
import { resetTankToSpawn } from '../entities/Tank.js';

export interface FlagEvents {
  captures: Array<{ team: Team; playerId: string }>;
  returns?: Array<{ team: Team; playerId: string }>;
}

export function updateFlags(state: GameState): FlagEvents {
  const events: FlagEvents = { captures: [] };

  for (const [flagTeam, flag] of Object.entries(state.flags) as Array<[Team, typeof state.flags[Team]]>) {
    // If flag is being carried, move it with the carrier
    if (flag.carrierId) {
      const carrier = state.tanks[flag.carrierId];
      if (carrier && carrier.alive) {
        flag.x = carrier.x;
        flag.y = carrier.y;

        // Check if carrier reached their own capture zone (bringing enemy flag home)
        const captureZone = CAPTURE_ZONES[carrier.team];
        const dx = carrier.x - captureZone.x;
        const dy = carrier.y - captureZone.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CAPTURE_ZONE_RADIUS) {
          // Score! Award the point and immediately reset the map
          state.scores[carrier.team] += 1;
          events.captures.push({ team: carrier.team, playerId: carrier.id });

          // Reset all tanks to spawn positions (full map reset per spec).
          // Assign per-team slot indices so tanks spread out around the flag.
          const resetSlots: Record<string, number> = { red: 0, blue: 0 };
          for (const tank of Object.values(state.tanks)) {
            const slot = resetSlots[tank.team]++;
            resetTankToSpawn(tank, slot);
          }

          // Reset both flags to their bases
          for (const f of Object.values(state.flags)) {
            resetFlag(f);
          }

          // Flags and tanks are reset; no further processing this tick
          return events;
        }
      } else {
        // Carrier is dead or disconnected — drop the flag
        flag.carrierId = null;
      }
      continue;
    }

    // Flag is on the ground — check if any enemy tank can pick it up
    for (const tank of Object.values(state.tanks)) {
      if (!tank.alive || tank.team === flagTeam || tank.hasFlag) continue;

      const dx = tank.x - flag.x;
      const dy = tank.y - flag.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < FLAG_PICKUP_DISTANCE) {
        flag.carrierId = tank.id;
        flag.atBase = false;
        tank.hasFlag = true;
        break;
      }
    }

    // Flag return: if the flag is dropped away from home, a friendly tank
    // can drive over it to send it back to base (standard CTF return mechanic).
    if (!flag.carrierId && !flag.atBase) {
      for (const tank of Object.values(state.tanks)) {
        if (!tank.alive || tank.team !== flagTeam) continue;

        const dx = tank.x - flag.x;
        const dy = tank.y - flag.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < FLAG_PICKUP_DISTANCE) {
          resetFlag(flag);
          events.returns = events.returns || [];
          events.returns.push({ team: flagTeam, playerId: tank.id });
          break;
        }
      }
    }
  }

  return events;
}
