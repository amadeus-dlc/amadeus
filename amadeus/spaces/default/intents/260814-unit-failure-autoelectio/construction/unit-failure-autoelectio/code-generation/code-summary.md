# Code Summary — unit-failure-autoelectio (Issue #2976)

Depth: Minimal

## Files created/modified

- `packages/framework/core/tools/amadeus-directive.ts` — `execute-failure-election` kind / validator / self-check fixture
- `packages/framework/core/tools/amadeus-orchestrate.ts` — `await-unit-ruling` で config 分岐
- `packages/framework/core/amadeus-common/protocols/stage-protocol.md` — halt-and-ask branch 1 を新 directive 契約へ
- `packages/framework/harness/{claude,codex,kimi,kiro,kiro-ide,pi}/skills/amadeus/SKILL.md` — acting table
- `packages/framework/harness/{cursor,opencode}/commands/amadeus.md` — acting table
- `tests/unit/t211-swarm-batch-progress.test.ts` — #2976 分岐 / ruling
- `tests/unit/t113.test.ts` — well-formed / empty-choices
- `bun run build` で各ハーネス面へ投影

## Key implementation decisions

- 新 kind は `ask` ではなく作業指令(`execute-advisory-handoff` と同型)
- `Retry / Skip / Abort` は共通定数・tuple 型・runtime validator で正準順序を固定
- config は `resolveAmadeusConfig(projectDir)` の 1引数経路。`auto` → 新 kind、`manual`/不在 → 現行 ask、invalid → `error`
- intent 層 config が project 層より優先されることを active cursor 経路のテストで固定
- attempt/batch 欠落は fail-closed `error`(新 kind を欠識別子で出さない)
- ruling は既存 `report --user-input retry|skip|abort` → `handleFailureRuling`
- CLI decline / 非収束の ask フォールバックは conductor 契約(SKILL / protocol)。engine は team/solo を判定しない

## Test coverage

- t211 #2976: auto / manual / absent / invalid / intent 層優先 / Retry・Skip・Abort ruling — pass
- t211 既存 swarm/solo ruling 回帰 — 維持
- t113: well-formed + empty / non-canonical `choices` — pass
- 対象テスト合計 — 106 pass / 0 fail
- `bun run typecheck` — pass
- `bun run lint` — exit 0(既存 warning 464件・info 17件、新規 error なし)
- `bun run build` — pass(8ハーネス投影を再生成)
- `git diff --check` — clean
- フルスイートは build-and-test で1回

## Deviations

- Step 5 の非収束フォールバックは conductor 面の文書化。engine に team/solo 判定や新 audit 語彙は置いていない(plan どおり)
- 新テストは plan 文面の「integration 層」ではなく既存 t211 unit スイートへ追加(同一 in-process 機構を再利用)
