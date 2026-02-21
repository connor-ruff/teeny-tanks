# Agent Config Architect Memory

## Agent Ecosystem

| Agent | File | Primary Purpose |
|-------|------|-----------------|
| ui-agent | `.claude/agents/ui-agent.md` | Client-side UI, styling, game visuals |
| web-dev-expert | `.claude/agents/web-dev-expert.md` | General web dev, build tooling |
| agent-config-architect | `.claude/agents/agent-config-architect.md` | Agent prompt design and maintenance |

## Established Conventions

- Agent memory directories: `.claude/agent-memory/<agent-name>/`
- ui-agent memory path: `.claude/agent-memory/ui/` (not `ui-agent/`)
- Model field: `opus` for agents doing creative or complex reasoning work
- `whenToUse` examples must show the Task tool invocation pattern, not direct responses

## Key Design Decisions

### ui-agent aesthetic (as of 2026-02-21)
The ui-agent was migrated from a **Tron/neon/glow futuristic** aesthetic to a **pencil-box / hand-drawn / early-web** aesthetic. The new aesthetic is:
- Muted, warm, desaturated colors (colored pencils, construction paper, notebook paper)
- Chunky imperfect outlines — felt-tip marker / pencil quality
- No glow, no neon, no gradients (except subtle warm paper-texture)
- Fonts: hand-lettered or informal (Fredoka One, Chewy, Patrick Hand) — NOT Exo 2
- UI panels look like index cards or sticky notes, not holographic panels
- Backgrounds are off-white/cream/paper, not dark
- Animations: bouncy/rubbery ok; pulsing/electric/emissive not ok
- The "What to Actively Purge" section in the prompt lists specific CSS properties to remove from legacy code

See `.claude/agents/ui-agent.md` for the full prompt.
