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
- `tests/integration/t369-protocol-autosolo-hook.test.ts` — 全 conductor 面の decline / 非収束フォールバック契約
- `tests/e2e/t237-election-walking-skeleton.test.ts` — 実 election CLI の split vote / hold / 人間フォールバック
- `amadeus/spaces/default/intents/260814-unit-failure-autoelectio/inception/requirements-analysis/requirements.md` — invalid config の fail-closed 契約を NFR-2 と整合
- `bun run build` で各ハーネス面へ投影

## Key implementation decisions

- 新 kind は `ask` ではなく作業指令(`execute-advisory-handoff` と同型)
- `Retry / Skip / Abort` は共通定数・tuple 型・runtime validator で正準順序を固定
- config は `resolveAmadeusConfig(projectDir)` の 1引数経路。`auto` → 新 kind、`manual`/不在 → 現行 ask、invalid → NFR-2 準拠の `errorDirective`
- intent 層 config が project 層より優先されることを active cursor 経路のテストで固定
- attempt/batch 欠落は fail-closed `error`(新 kind を欠識別子で出さない)
- ruling は既存 `report --user-input retry|skip|abort` → `handleFailureRuling`
- CLI decline / 非収束の ask フォールバックは conductor 契約(SKILL / protocol)と integration / E2E で固定。engine は team/solo を判定しない

## Test coverage

- t211 #2976 unit: auto / manual / absent / invalid / intent 層優先 / Retry・Skip・Abort ruling / audit event 連鎖 — pass
- t211 既存 swarm/solo ruling 回帰 — 維持
- t113: well-formed + empty / non-canonical `choices` — pass
- t369 integration: 8 conductor 面の decline / hold / split / interrupt / CLI error / 人間裁定復帰 — pass
- t237 E2E: 実 election CLI の split vote → tie hold、timeline、acting contract の人間フォールバック — pass
- reviewer repair 対象: t211 + t369 は 46 pass / 0 fail、t237 は 2 pass / 0 fail
- 実装対象テスト: 106 pass / 0 fail
- `bun run typecheck` — pass
- `bun run lint` — exit 0(既存 warning 464件・info 17件、新規 error なし)
- `bun run build` — pass(8ハーネス投影を再生成)
- `git diff --check` — clean
- GitHub Actions run 31789338681 — 全必須 check 成功。Tests、Coverage(head/base/aggregate)、隔離2回ビルド再現性、source-only、graph invariants、plugin conformance、mirror check を含む

## Deviations

- なし。Comprehensive strategy の unit / integration / E2E を実施し、監査には新語彙を追加せず既存 event 連鎖を検証した。
