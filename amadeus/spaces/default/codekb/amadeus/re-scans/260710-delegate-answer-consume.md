# Re-scan 記録 — 260710-delegate-answer-consume

> #707 契約(per-intent re-scan 記録)。差分ベース点の真実源はこのファイル(この intent 固有)。共有 `reverse-engineering-timestamp.md` は鮮度ポインタであってベース点ではない。

## スキャンメタデータ

- **base**: `24197d755a51712c1bfd6fa405f709c070c61f0d`
  - 理由: 前 intent `260709-dynamic-test-size` の re-scan 記録(`re-scans/260709-dynamic-test-size.md`)の observed を差分ベースに採用(#707 契約)。
- **observed**: `5e9040cdabd72034f9bd704c5d22ca7dde247a6e`
  - `git rev-parse HEAD` 実測(Developer スキャン・Architect 合成の双方で確認、現 HEAD)。
- **date**: 2026-07-10
- **intent**: `260710-delegate-answer-consume`(#736 — 委任発行 grounding が interview 応答の QUESTION_ANSWERED に先食いされる)
- **手法**: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。焦点領域は現行コードを実コード直読で file:line 確定(正本 `packages/framework/core/tools/`)。

## focus(スキャンスコープ)

- `packages/framework/core/tools/amadeus-lib.ts` — 委任機構の presence 境界: `GATE_RESOLUTION_EVENTS`(`:1506`)・`humanActedSinceGate(projectDir, verb?)`(`:1507-1546`)・`verifyDelegatedProvenance`(`:1585-1611`)・thin alias `humanActedSinceLastAnswer`(`:1615-1616`)
- `packages/framework/core/tools/amadeus-state.ts` — 消費側 `assertHumanPresentForGateResolution`(`:1446-1471`、verb forward `:1456`)・発行側 `handleDelegateApproval`(`:1607-1689`、grounding `:1625`)/`handleDelegateRejection`(`:1701-`、grounding `:1719`)
- `packages/framework/core/tools/amadeus-audit.ts` — `DELEGATED_REJECTION` の VALID_EVENT_TYPES 追加・CLI minting guard
- `packages/framework/core/tools/amadeus-log.ts` — QUESTION_ANSWERED emit(consume-once 契約、base→HEAD 無変更)
- `tests/unit/t112-delegated-approval.test.ts` — #671/#685 pin(QUESTION_ANSWERED×委任 交差ケース不在を実測)
- `tests/unit/t188-human-presence-gate.test.ts` — 境界セマンティクスと 1-answer/turn 契約(`:325-348`)
- audit 定義: `audit-format.md`(`:78-79`)・`docs/reference/12-state-machine.md`(`:213-214`)、`t28-audit-event-sync` sync ガード

## 差分の焦点影響(`24197d755..5e9040cda`)

- `git diff --name-status 24197d755..5e9040cda -- ':!amadeus/' ':!dist/'` の実体は **#685(verb-scoped provenance + DELEGATED_REJECTION)** の実装。フォーカス3ファイル(`amadeus-lib.ts` +59/-45・`amadeus-state.ts` +281・`amadeus-audit.ts` +114)+ docs 3行(audit-format.md / 12-state-machine.md ja/en)。
- **フォーカス面への影響: 大(直接改変)**。#736 修正方式 B が要求する verb スコープの足場は base→HEAD 間で既に実装済み。ただし #736 の機構(QUESTION_ANSWERED が委任発行 grounding を先食い)は verb スコープと**直交** — QUESTION_ANSWERED は委任 type ではなく `GATE_RESOLUTION_EVENTS`(`amadeus-lib.ts:1506`)の resolution 要素で、`humanActedSinceGate` の verb 分岐(`:1519-1524`)の影響を受けない。
- **`amadeus-log.ts` は無変更**(QUESTION_ANSWERED emit 側は #685 で触られていない)。emit 側改修は現時点で不要の可能性。
- 回帰テスト未整備: t112 に QUESTION_ANSWERED×委任 の交差ケース無し(`grep QUESTION_ANSWERED` ヒット 0、実測)。t188:325-348 が answer 側の 1-answer/turn 契約を pin しており、修正はこの契約との両立が要件。
- 結論: フォーカス領域は現行コード直読で file:line を確定。反映は `code-quality-assessment.md`(#736 観測面 3節)と `architecture.md`(委任 presence 機構の verb-scoped 構造節)の 2件、加えて本 re-scan 記録と鮮度ポインタ。他 7 成果物は温存(依存・構造・スタック・API・ビジネス面が本 intent の観測面と無関係で不変)。
