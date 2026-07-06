# Mockups — Engine Installer（260705-engine-installer）

上流入力: [wireframes.md](../../ideation/rough-mockups/wireframes.md)、[user-flow.md](../../ideation/rough-mockups/user-flow.md)、[requirements.md](../requirements-analysis/requirements.md)、[stories.md](../user-stories/stories.md)

## 成功時（US-1）

```text
$ bun run scripts/amadeus-install.ts --target /path/to/workspace
amadeus-install: installing into /path/to/workspace
[1/5] engine        .agents/amadeus/ (7 dirs, replaced)
[2/5] skills        .claude/skills/amadeus*, .agents/skills/amadeus* (replaced)
[3/5] symlinks      .claude/{agents,amadeus-common,hooks,knowledge,scopes,sensors,tools} (recreated)
[4/5] settings      .claude/settings.json (hooks merged: 11 entries, 0 duplicates)
[5/5] smoke         doctor check passed
amadeus-install: done. Next: see README "導入後の検証" (doctor / amadeus-validator)
```

## 事前チェック失敗時（US-5、FR-1.1）

```text
$ bun run scripts/amadeus-install.ts --target /no/such/dir
amadeus-install: error: target does not exist: /no/such/dir
  fix: pass an existing writable workspace directory via --target
(exit 1, no changes made)
```

## 衝突時（US-4、FR-1.5）

```text
[3/5] symlinks      .claude/agents ...
amadeus-install: error at step 3/5 (symlinks): .claude/agents exists and is not a symlink
  fix: move or remove /path/to/workspace/.claude/agents, then re-run (idempotent)
(exit 1, conflicting path left untouched)
```

## 解析不能な settings.json（US-4、FR-1.6）

```text
[4/5] settings      .claude/settings.json ...
amadeus-install: error at step 4/5 (settings): cannot parse /path/to/workspace/.claude/settings.json as JSON
  fix: repair the file manually, then re-run (idempotent). The file was NOT modified.
(exit 1)
```
