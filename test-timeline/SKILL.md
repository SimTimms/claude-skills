---
name: test-timeline
description: Show what a code change actually does as a plain-English timeline of user and system steps (the user clicks, the app asks the server, sign-in is checked, the database is read...), with the real result of the test that covers each step beside it, printed in the terminal and published as a compact one-screen artifact page. Use whenever the user asks for a test timeline, "what does this change do", "walk me through the code", "what do the tests actually check", "which steps are tested", a visual or bullet timeline of user events, or wants to understand a branch, fix or pull request without jargon — even if they don't name the skill.
---

# Test timeline

The user wants to *see* what runs when a change is used, and which of those steps the tests really cover. Passing tests alone don't tell them that. The output is a timeline of steps in plain English, each with the result of the tests that cover it, taken from a real test run.

Write every step for someone who doesn't want jargon: "Checks the teacher is signed in", not "requireUser resolves the principal". Code names belong only in the test column, because those are the real test titles.

## Steps

### 1. Find the change

Compare the branch with the branch it will merge into. Use the base the user names, or the project's instructions (CLAUDE.md, contributing docs), or else the repository's default branch: `git diff origin/<base>...HEAD`. Add `git diff HEAD` for uncommitted work. If the user names a ticket, pull request or function instead, start from that.

If the uncommitted work is only new tests, keep the steps as they are and show the new tests under the steps they cover.

### 2. Trace each journey the change touches

A journey is one thing a person does, followed end to end: for example "Preview the questions", "Add a question", "Set the homework". Usually there are 1 to 4. Include a journey the change deliberately leaves alone if a reader might expect it to change, and say so in its `note` ("not changed"). If its code is the same but its behaviour shifts in some case, say that in the note instead ("not changed when the app sends its list; without one, now random").

Trace the real code, not what it probably does:
- Start where the person acts. If the front end is in another repository, look for it next to this one (a sibling folder, or the project's docs say where it is) and find the button or page and the request it sends. If you can't find it, write the step from the request the server receives.
- Follow the request through every layer on the server: the route or resolver (sign-in checks there count as steps), the helper, each permission check, each validation, each database read or write, each piece of logic, then what comes back and what the person sees.
- For each check that can refuse, note the message the person would see.
- Mark the step or steps the change added or altered as new (`isNew`).

Each step has one actor:

| `who` | Shown as | Use for |
|---|---|---|
| `user`, `teacher`, `student`, `admin`, `customer` | person icon | a person doing something; pick the word the project uses |
| `app` | App (set `label`, e.g. "School app") | the front end |
| `server` | Server | checks and logic on the backend |
| `db` | Database | reads and writes |
| `external` | (set `label`, e.g. "Email", "Stripe") | another service |
| `job` | Scheduled job | alarms, cron, queues |

Keep each step to one short line ("Fetches every matching question"), with any failure folded in briefly ("gone → 'no longer available'"). About ten steps per journey is typical. Merge trivial steps rather than listing every line of code.

### 3. Match steps to tests

For each step, find the tests that exercise exactly that behaviour. Search every test file, not just the one beside the changed code, for the function names and the error messages, and read each candidate test to confirm it really checks this step. Don't rely on its name alone.

Refer to each test by its exact title. When the same title appears more than once (often in different `describe` blocks of one file), use its full name instead: the describe titles and the test title joined by spaces, as the test runner reports it, or `path/to/file.test.js::title` when it repeats across files.

Where no test covers a step, leave `tests` empty and say why in `none`: "front end, no server test" (it lives elsewhere), "no test", or "switched off in tests". Gaps are part of the answer, so never stretch a loosely related test to fill one.

A test can match a step yet be unable to fail when that step breaks: for example, a "picks at random" test whose setup leaves only one possible answer. Mark it `"weak": "only one question left to pick, so it passes without a shuffle"`. The page shows it as passed but weak. Offer to strengthen it.

If the user asks for a missing or stronger test, write it and show it passes. Then confirm it fails when the code it guards is briefly broken, restore the code, and say so.

### 4. Run the tests

Run the test files you matched (not the whole suite unless that's quicker) and save machine-readable results:

```bash
npx jest <test files> --json --outputFile=<scratchpad>/results.json
npx vitest run <test files> --reporter=json --outputFile=<scratchpad>/results.json
```

Both write the shape the build script reads. For another test runner, convert its results into that shape: `{ "testResults": [ { "name": "<file>", "assertionResults": [ { "title", "fullName", "status" } ] } ] }`.

### 5. Write the timeline data

Write `<scratchpad>/timeline.json`:

```json
{
  "pageTitle": "Homework Question Timeline",
  "title": "What happens when a teacher builds a homework",
  "subtitle": "Branch feature/random-questions",
  "journeys": [
    {
      "name": "Preview the questions",
      "note": "",
      "steps": [
        { "who": "teacher", "what": "Chooses topics 1-4, a quiz, 50 questions", "tests": [], "none": "front end, no server test" },
        { "who": "server", "what": "Can they see this class?", "tests": ["is gated — a teacher from another org is denied"] },
        { "who": "server", "what": "Shuffles them", "isNew": true, "tests": ["picks at random across every chosen subtopic"] }
      ]
    },
    { "name": "Set the homework", "note": "not changed", "steps": [] }
  ],
  "footnote": "Steps marked \"no test\" were also untested before this change."
}
```

`pageTitle` names the page in the browser tab and gallery: two to four words naming the change, never a sentence. Optional per step: `label` overrides the actor's name (`"who": "app", "label": "School app"`), and `weak` explains a test that can't fail.

### 6. Build both outputs

```bash
node ~/.claude/skills/test-timeline/scripts/build.js <scratchpad>/timeline.json <scratchpad>/results.json <scratchpad>/<short-name>-timeline.html
```

This prints the terminal timeline and writes the page. Each test shows ✓ passed, ✗ FAILED, or ? not found. "Not found" means a title doesn't match a test that ran: fix the title or run the missing file, then build again. Never edit the results by hand.

### 7. Show it

- Paste the terminal output into your reply in a code block.
- Publish the HTML with the Artifact tool (icon `timeline`). If no Artifact tool is available, give the path of the HTML file so the user can open it. The page is already designed: journeys stacked down the page, columns # / Who / What happens / Tests, about 10px text, coloured names without boxes or backgrounds, a person icon for people. Don't restyle it unless the user asks. When re-running for the same change, republish the same file path so the link stays the same.
- Underneath, list in a few plain sentences the steps with no test and any weak tests, and say whether each gap existed before the change.

## Things to keep straight

- The step-to-test matching is your judgement; the pass or fail comes from the test run. Say so once, briefly.
- The page shows the results of the run it was built from. Rebuild after changing code or tests.
- Keep the timeline files in the scratchpad, never in the user's repository.
