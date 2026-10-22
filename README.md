# Claude skills

Skills for [Claude Code](https://claude.com/claude-code).

## Install

Copy a skill's folder into `~/.claude/skills/` to use it in every project, or into a project's `.claude/skills/` to use it in that project only.

```bash
git clone https://github.com/SimTimms/claude-skills.git
cp -R claude-skills/test-timeline ~/.claude/skills/
```

## Skills

### test-timeline

Shows what a code change actually does, as a plain-English timeline: the user clicks, the app asks the server, sign-in is checked, the database is read. Beside each step it shows the result of the test that covers it, taken from a real test run, and it marks steps with no test or a test that can't fail.

You get the timeline in the terminal and as a compact one-screen page. Ask Claude for "a test timeline for this branch", or type `/test-timeline`.

Needs Node.js, and tests run with Jest or Vitest (other runners work if their results are converted; see the skill).
