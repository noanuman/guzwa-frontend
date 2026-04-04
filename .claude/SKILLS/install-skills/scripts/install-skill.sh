#!/bin/bash
# install-skill.sh - Install an Agent Skill from a GitHub repository
#
# Usage: ./install-skill.sh <skill-name> [source-repo] [install-path]
#
# Examples:
#   ./install-skill.sh webapp-testing
#   ./install-skill.sh pdf anthropics/skills
#   ./install-skill.sh github-issues github/awesome-copilot .claude/SKILLS

set -e

SKILL_NAME="$1"
SOURCE_REPO="${2:-anthropics/skills}"
INSTALL_PATH="${3:-.claude/SKILLS}"

if [ -z "$SKILL_NAME" ]; then
    echo "Usage: $0 <skill-name> [source-repo] [install-path]"
    echo ""
    echo "Arguments:"
    echo "  skill-name    Name of the skill to install (required)"
    echo "  source-repo   GitHub repo in owner/repo format (default: anthropics/skills)"
    echo "  install-path  Where to install (default: .claude/SKILLS)"
    echo ""
    echo "Examples:"
    echo "  $0 webapp-testing"
    echo "  $0 pdf anthropics/skills"
    echo "  $0 github-issues github/awesome-copilot .claude/SKILLS"
    exit 1
fi

TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Convert INSTALL_PATH to absolute path before changing directories
if [[ "$INSTALL_PATH" != /* ]]; then
    INSTALL_PATH="$(pwd)/$INSTALL_PATH"
fi

echo "Installing skill: $SKILL_NAME"
echo "From repository: $SOURCE_REPO"
echo "To location: $INSTALL_PATH/$SKILL_NAME"
echo ""

# Create destination directory
mkdir -p "$INSTALL_PATH/$SKILL_NAME"

# Clone with sparse checkout
echo "Fetching skill from GitHub..."
git clone --depth 1 --filter=blob:none --sparse \
    "https://github.com/$SOURCE_REPO.git" "$TEMP_DIR/repo" 2>/dev/null

cd "$TEMP_DIR/repo"

# Try different skill locations
SKILL_PATH=""
for path in "skills/$SKILL_NAME" ".github/skills/$SKILL_NAME" ".claude/skills/$SKILL_NAME"; do
    git sparse-checkout set "$path" 2>/dev/null || true
    if [ -d "$path" ] && [ -f "$path/SKILL.md" ]; then
        SKILL_PATH="$path"
        break
    fi
done

if [ -z "$SKILL_PATH" ]; then
    echo "Error: Skill '$SKILL_NAME' not found in $SOURCE_REPO"
    echo "Searched in: skills/, .github/skills/, .claude/skills/"
    exit 1
fi

# Copy skill files
echo "Copying skill files..."
cp -r "$SKILL_PATH"/* "$INSTALL_PATH/$SKILL_NAME/"

echo ""
echo "✓ Successfully installed $SKILL_NAME"
echo "  Location: $INSTALL_PATH/$SKILL_NAME"
echo ""

# Show skill description
if [ -f "$INSTALL_PATH/$SKILL_NAME/SKILL.md" ]; then
    DESC=$(grep -A1 "^description:" "$INSTALL_PATH/$SKILL_NAME/SKILL.md" | head -2 | tail -1 | sed "s/^description: *['\"]*//" | sed "s/['\"]$//")
    if [ -n "$DESC" ]; then
        echo "Description: $DESC"
    fi
fi
