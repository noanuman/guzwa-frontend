---
name: install-skills
description: 'Automatically install and manage Agent Skills from GitHub repositories. Use when asked to "install a skill", "add a skill", "find skills", "browse skills", "get skills from GitHub", or when the user needs a specific capability that might exist as a community skill. Supports anthropics/skills, github/awesome-copilot, and custom GitHub repositories.'
---

# Install Skills

A meta-skill for discovering, browsing, and installing Agent Skills from online repositories. This skill helps you find and install community-created skills to enhance your capabilities.

## skills.sh CLI Integration

If the user has the [skills.sh](https://skills.sh/) CLI installed (via `npx add-skill`), these scripts will automatically detect it and use the skills.sh CLI instead of the manual installation process. This provides:

- **Better cross-agent compatibility**: Automatic detection and installation for Claude Code, OpenCode, Cursor, and other agents
- **Auto-detection of agents**: The CLI knows where to install skills for each installed agent
- **Access to skills registry**: Browse and install from the community skills marketplace

To use the skills.sh CLI directly:
```bash
# List skills from a repository
npx add-skill anthropics/skills --list

# Install a specific skill
npx add-skill anthropics/skills --skill release-notes

# Install to global/personal directory
npx add-skill anthropics/skills -g
```

## When to Use This Skill

- User asks to "install a skill", "add a skill", or "get a skill"
- User mentions needing capabilities that might exist as community skills
- User wants to browse available skills from known repositories
- User wants to install a skill from a specific GitHub repository
- User asks "what skills are available?"

## Supported Skill Sources

### Primary Repositories

| Repository | Description |
|------------|-------------|
| `anthropics/skills` | Official Anthropic skills collection |
| `github/awesome-copilot` | GitHub's community-curated skills in `skills/` directory |
| `microsoft/agent-skills` | Skills for Microsoft AI SDKs and Azure services in `.github/skills/` directory |

### Custom Repositories

Any GitHub repository with skills in one of these structures:
- `skills/<skill-name>/SKILL.md`
- `.github/skills/<skill-name>/SKILL.md`
- `.claude/skills/<skill-name>/SKILL.md`

## Installation Locations

For GUZWA, all skills install to `.claude/SKILLS/<skill-name>/`.

After installing any skill, ALWAYS update `.claude/SKILL-ROUTER.md` with a new row.

## Workflow: Browse Available Skills

### Step 1: List Skills from Known Repositories

```bash
bash .claude/SKILLS/install-skills/scripts/list-skills.sh
bash .claude/SKILLS/install-skills/scripts/list-skills.sh anthropics/skills
bash .claude/SKILLS/install-skills/scripts/list-skills.sh github/awesome-copilot
```

### Step 2: Display Skills to User

Present skills in a table format:

| Skill Name | Repository | Description |
|------------|------------|-------------|
| skill-name | source/repo | Brief description from SKILL.md |

## Workflow: Install a Skill

### Step 1: Identify the Skill Source

Parse the user's request to determine:
- Skill name
- Source repository (default to searching known repos)

### Step 2: Run the Install Script

```bash
bash .claude/SKILLS/install-skills/scripts/install-skill.sh <skill-name> <source-repo> .claude/SKILLS
```

### Step 3: Update SKILL-ROUTER.md

After successful installation, add a new row to `.claude/SKILL-ROUTER.md`.

## Example Commands

| User Says | Action |
|-----------|--------|
| "Install the webapp-testing skill" | `bash .claude/SKILLS/install-skills/scripts/install-skill.sh webapp-testing anthropics/skills .claude/SKILLS` |
| "What skills are available?" | `bash .claude/SKILLS/install-skills/scripts/list-skills.sh` for known repos |
| "Install pdf skill from anthropics/skills" | `bash .claude/SKILLS/install-skills/scripts/install-skill.sh pdf anthropics/skills .claude/SKILLS` |
