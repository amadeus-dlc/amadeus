# Code Generation Plan

## 前提

- Depth は `Minimal`、Test Depth は `Comprehensive` とする。
- 入力は `requirements.md`、`requirements-analysis-questions.md`、CodeKB の `architecture.md`、`code-structure.md`、`api-documentation.md`。Units、Functional Design、NFR Design は本 Intent では生成されていないため、要件と現行コードを直接トレースする。
- 実装対象は Bun/TypeScript の既存 CLI・プラグイン境界に限定する。DB、UI、IaC、外部 API、テスト設定は追加しない。
- core は汎用の必須ステージ、成果物、センサー、監査証跡の仕組みだけを扱い、GitHub・PR レポートのスキーマと判定は `plugins/pr-convergence/` に閉じ込める。
- per-unit degrade path の Unit identity は stage slug と衝突しない `issue-2838` とする。

## 実装 Steps

### Step 1 — 必須ステージとセンサーを compose 契約に組み込む（FR-1、FR-4、FR-8）

- [x] `plugins/pr-convergence/plugin.json` と `plugins/pr-convergence/stages/pr-convergence.md` に blocking sensor resource/binding を宣言し、4 self scope の Code Generation と pr-convergence に適用する。
- [x] `amadeus-plugin-compose.ts` と `amadeus-config.ts` を最小変更し、plugin-owned sensor の install/drop と scope binding 由来の必須ステージを汎用的に保持する。
- [x] `amadeus-state.ts` と `amadeus-utility.ts` の skip/recompose/workflow completion 経路で、4 self scope の pr-convergence を除外・SKIP・未完了のまま通過できないようにする。non-self scope の opt-in 挙動は維持する。

### Step 2 — 単一 CLI のレポート状態機械と canonical attestation を実装する（FR-2、FR-3、FR-6、FR-7）

- [x] `pr-convergence-cli.ts` を唯一の writer とし、正規 lifecycle、同一 identity/bytes の冪等再実行、逆行拒否、head 変更時の失効と `created` 再開を実装する。`landed` は convergence として扱わない。
- [x] `pr-convergence-attestation.ts` を追加し、Intent UUID/record、Bolt/Unit、repo/PR、3 head、content digest、event identity を束ねる生成・検証を集約する。
- [x] event registry、audit tool、audit format に canonical `ARTIFACT_ATTESTED` event を追加し、CLI が発行した identity をレポートへ結び付ける。
- [x] `pr-convergence-git-runner.ts` と `pr-convergence-gh-runner.ts` で self scope の local/remote/PR prerequisite を検査し、失敗時は mutation 前に拒否する。commit/push は行わない。
- [x] override は linked PR、有効な attestation、実在する `HUMAN_TURN`、理由を必須とする。self unlinked は拒否し、non-self opt-in unlinked は従来どおり許可する。

### Step 3 — blocking sensor と全成果物必須を全 completion 経路で統一する（FR-4、FR-5、FR-7）

- [x] report sensor を blocking 化し、report → attestation → sensor の順序、stage 別 lifecycle、改ざん・コピー・replay、scope/head 不一致を fail closed で判定する。
- [x] `amadeus-state.ts` の共通 completion guard を `required-all` に直し、approve/advance/finalize/complete-workflow の direct API と orchestrator 経路で同じ guard を使う。
- [x] orchestrator 側へ PR 固有ロジックを追加せず、既存の共通 per-unit/completion guard を再利用する。

### Step 4 — 回帰試験と acceptance matrix を追加する（FR-1〜FR-8）

- [x] frontmatter seam、event registry、artifact guard、PR CLI/provenance/lifecycle、blocking sensor の既存試験を必要箇所だけ拡張する。
- [x] compose/drop、required-all、sensor binding、legacy non-self 互換を既存 integration matrix で回帰確認する。
- [x] 新規 `t534` unit/integration で attestation、git prerequisite、mandatory binding、created→converged、stage-aware sensor、idempotency、tamper を確認する。専用 e2e は既存 packaging E2E と integration matrix が同じ配布面を被覆するため重複追加しない。
- [x] `t534` の採番衝突がないことを確認する。

### Step 5 — Comprehensive 検証を完了する（FR-1、FR-4、FR-5、FR-8）

- [x] 追加・変更した全 test path の存在を確認してから `bun test --timeout 120000 <対象 paths>` を実行する。
- [x] `bun run lint`、`bun run typecheck`、全 smoke/unit/integration test、`bun run build`、`bun run distribution:check`、`bun run source-only:check` を実行し、生成物が Git 境界を越えず全 harness の配布面が一致することを確認する。
- [x] cold-compile timeout のみ単独再実行する方針で機能失敗と区別した。性能・負荷試験や追加テスト設定は増やしていない。

### Step 6 — PR レポート生成はユーザーの明示許可後に分離実行する（FR-2、FR-6、FR-8）

- [x] 実装・検証・code summary 完了後、ユーザーから commit、push、GitHub 提出の明示許可を受領した。
- [x] 記録を含む commit と push、Issue #2838 に紐づく GitHub 提出を行い、linked PR と head identity が成立した後、plugin CLI の `create` で `created` report/attestation/sensor を生成した。

## 完了条件

- FR-1〜FR-8 の acceptance predicate が上記 unit/integration/e2e matrix で再現され、全 completion 経路が同じ fail-closed guard を通る。
- self scope は有効な linked PR、canonical attestation、fresh blocking sensor pass なしに完了できず、non-self opt-in の既存挙動は変わらない。
- plugin drop/recompose 後も host-owned 契約が復元可能で、core に GitHub または PR レポート固有スキーマを持ち込まない。
- lint、typecheck、test、build、distribution、source-only の各検証が成功し、tracked generated surface を追加しない。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-11T22:50:39Z
- **Iteration:** 1
- **Scope decision:** none

FR-1〜FR-8は計画、実装要約、検証結果に一貫してトレースされている。generic coreとplugin固有PR schemaの境界、全completion chokepointのfail-closed化、head/content/eventに束縛されたattestationとblocking sensor、self/non-self scopeの互換境界はいずれも整合する。created reportはconverged=falseのCode Generation時点として正しく、Intent・Unit・PR・3種head・content digestが要約記載の現行headと一致する。包括的なunit/integration/distribution検証も成功しており、実装可能性、保守性、依存関係、blast radiusにBLOCKER根拠は認められない。

### Findings

- None
