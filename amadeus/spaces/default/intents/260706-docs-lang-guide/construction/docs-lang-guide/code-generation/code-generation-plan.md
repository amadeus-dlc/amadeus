# Code Generation Plan — docs-lang-guide

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[domain-entities.md](../functional-design/domain-entities.md)

## 執筆チェックリスト

### B001（#509）: language-policy

- [x] `docs/amadeus/language-policy.md` 新設（英語、正）。H2: Scope / Canonical and translation / Synchronization rules / Cross-linking rules / Relation to skill-language-policy（FR-1.1、BR-1〜BR-3）
- [x] `docs/amadeus/language-policy.ja.md` 新設（日本語、対訳）。同一節構成（FR-1.1、NFR-1）
- [x] `AMADEUS.md` 作業言語節に 1 行追記。既存 2 箇条（返答・仕様・調査メモ・検証結果の日本語化／記述系成果物の日本語維持）からの明示カーブアウトを、SKILL.md/TS カーブアウト bullet と同じ様式で記述し、language-policy.md へリンク（FR-1.2、BR-4）
- [x] `docs/amadeus/skill-language-policy.md` に責務分担の 1 文と関連文書リンクを追記（FR-1.3）

### B002（#532）: extension-guide

- [x] FR-2.3 の実測をまず実施（下記「実測の実施記録」参照）してから執筆
- [x] `docs/amadeus/extension-guide.md` 新設（英語、正）。H2: Scaling principle / Extension points / Human editing discipline / Sources（FR-2.1、FR-2.2）
- [x] `docs/amadeus/extension-guide.ja.md` 新設（日本語、対訳）。同一節構成（FR-2.1、NFR-1）
- [x] `docs/amadeus/steering.md` の Cross-References に 1 行追加（FR-2.5）
- [x] `README.md` の Documentation 節に 1 行追加（FR-2.5）

### 実測の実施記録（FR-2.3 の事前検証）

執筆前に次のアンカーを実ファイルで確認した（詳細は code-summary.md の「実測証跡」参照）。

- [x] `amadeus-graph.ts` の `resolveRulesForStage`（rules_in_context 解決）
- [x] `stage-protocol.md` の template resolution 節
- [x] `amadeus-required-sections.md`（sensor manifest。当初想定の `amadeus-sensor-required-sections.ts` は sensor 本体（実行スクリプト）であり、resolution 規約の文書は `.md` 側にあると判明）
- [x] `.agents/rules/amadeus-artifacts-and-examples.md` の templates 規約
- [x] `docs/amadeus/steering.md` の Space 契約
- [x] `amadeus-state.ts` の `HARNESS_DOC_DIRS` / `workspaceHasWork` / `declare-docs-only` / `GUARD_EXEMPTED`
- [x] `.agents/amadeus/scopes/amadeus-pdm.md`（pdm scope の実在）
- [x] `aidlc/spaces/default/codekb/amadeus/timestamp.md`（codekb 再生成前例の実在）
- [x] 本 Intent の `runtime-graph.json`（rules_in_context の実例として使えるか確認 → 使えなかった。下記 C-3 相当の訂正参照）

### C-3 に関する実装ガード適用の確認

requirements.md の C-3 のとおり、本 Intent の成果物（`docs/amadeus/*.md`、`AMADEUS.md`、`README.md`）は `aidlc/` 外への書き込みであり、`amadeus-state.ts` の `HARNESS_DOC_DIRS`（`aidlc` / `.claude` / `.kiro` / `.codex` / `.git` のみを除外）に該当しないため、`workspaceHasWork` ガードは自然に満たされる。`declare-docs-only` は使用しなかった。

### 記録

- [x] `code-generation-plan.md`（本ファイル）
- [x] `code-summary.md`
