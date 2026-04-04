# GUZWA

Urban traffic congestion reduction webapp with three core features:
1. **Train Routing** — Track schedules/routes, recommend trains over other public transport
2. **Parking Sharing** — Share private parking spaces with other users
3. **Car Sharing** — Connect people traveling along the same route

---

## LLM Workflow (follow on EVERY prompt)

### Step 1: Load Core Skills
ALWAYS load these two skills before doing anything:
- `.claude/SKILLS/vercel-react-best-practices/AGENTS.md`
- `.claude/SKILLS/context-engineering-skill/SKILL.md`

### Step 2: Understand & Route
Parse the user's prompt. Then read `.claude/ROUTER.md` to identify which codebase sections are relevant. Use context-engineering-skill principles to load ONLY the relevant architecture MDs — never load everything.

### Step 3: Skill Selection
1. Read `.claude/SKILL-ROUTER.md` to determine which installed skills apply to this task. Load only what's needed.
2. If no installed skill fully covers the task, use the `install-skills` skill to browse the marketplace:
   - Run `bash .claude/SKILLS/install-skills/scripts/list-skills.sh anthropics/skills` (and other repos like `github/awesome-copilot`)
   - Look for skills that are a good fit for the task and have high star counts
   - If a strong match is found, install it via `bash .claude/SKILLS/install-skills/scripts/install-skill.sh <name> <repo> .claude/SKILLS`
   - After installing, update `.claude/SKILL-ROUTER.md` with the new skill entry
3. Load the selected skills and proceed.

### Step 4: Implement
Execute the task using loaded context and skills.

### Step 5: Update Documentation
After implementation, update all affected MDs:
- **Changed code** → find and update the relevant ARCHITECTURE MDs
- **New feature** → create a new sub-dir in `.claude/ARCHITECTURE/` with an `INDEX.md` + detail MDs
- **New research** → update `.claude/RESEARCH/INDEX.md` if applicable
- **New skill installed** → update `.claude/SKILL-ROUTER.md`
- Always use the `context-engineering-skill` when writing/updating MDs

---

## Best Practices

- **MD size limit**: No MD file should exceed 200-300 characters. If it does, split into multiple MDs and link them from an INDEX.md
- **MD authoring**: Always use the `context-engineering-skill` when creating or editing documentation files
- **Skill installation**: When installing new skills from the marketplace, immediately add them to `.claude/SKILL-ROUTER.md` and place them in `.claude/SKILLS/`
