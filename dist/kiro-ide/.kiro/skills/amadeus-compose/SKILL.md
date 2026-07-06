---
name: amadeus-compose
description: >
  Compose a tailored AI-DLC workflow plan - the adaptive composer reads your
  task (or a scan report), proposes the EXECUTE/SKIP stage grid that fits,
  and after your approval authors it as a scope and runs it. A typeable
  shortcut for `/amadeus compose`; the same one door, forced to the full
  composer even when a stock scope would match.
argument-hint: "[description | --report <path> | --new-scope]"
user-invocable: true
---

# AI-DLC - compose a workflow plan

Force the adaptive composer on a task. This is packaging over
`/amadeus compose ...` - it does not add a second entry point; the engine
recognizes the compose request and names the composer dispatch, and the
conductor runs the same forwarding loop as `/amadeus`.

## Steps

1. Forward the user's `$ARGUMENTS` into the engine with the leading
   `compose` verb (pass `--report <path>` / `--new-scope` through as-is):

   ```bash
   bun .kiro/tools/amadeus-orchestrate.ts next compose $ARGUMENTS
   ```

2. Act on the directive exactly as the `amadeus` skill's forwarding loop
   describes (the composer-dispatch print names the composer agent; render
   its proposal and hold the approve/edit/reject gate). From here the flow IS
   the `/amadeus` flow - continue its loop until the directive says stop.
