# Code Generation Plan — fix-1846-1849-engine-state(Bolt 2)

上流入力(consumes 全数): requirements.md

- 本 unit の実装対象は `requirements.md` の FR-3(#1846 birth scaffold の Construction Autonomy Mode 欠落)と FR-4(#1849 compose 時の state 再構築、ユーザー裁定 A)。共通契約 CR-1〜CR-6 と AC-3a〜3c / AC-4a〜4c を検収基準として採用した。functional-design 系 consumes は degrade スコープ(units-generation SKIP)により設計どおり不在 — 設計判断は本 plan と PR 本文に記録する。

## 方針

1. **FR-3(生成側修正)**: `amadeus-utility.ts` の birth scaffold の `## Current Status` へ `- **Construction Autonomy Mode**: unset` を追加し、`state-template.md:93` の正準と整合させる。`setFieldStrict`(`amadeus-bolt.ts:816`)の strict 契約は不変。
2. **FR-3 drift ガード(AC-3c)**: scaffold と state-template.md のフィールド集合差分を機械照合するテストを新設(t393)。既知のテンプレ陳腐化2件(`Harness` / `Test Strategy`)は明示 allowlist でピン(テンプレ側是正は別変更)。
3. **FR-4(裁定 A: compose 時 state 再構築)**: 共有 writer(`renderStageProgressSection` / `replaceStageProgressSection` / `perUnitLineOf` / `rebuildDerivedPlanFields`)を `amadeus-lib.ts` へ抽出し、scope-change・recompose・新設 `resyncIntentStates` が同一 writer を使う(canonical 1定義)。`resyncStateToStageGraph` を唯一の行生成経路とし、outcome を `resynced|current|not-running|foreign-rows|unreadable` の判別 union で返す。
4. **クロスホスト**: host graph は `<hostRoot>/tools/data/stage-graph.json` を実読(実行中コピー基準のキャッシュは `--project-root` 別ハーネス時に誤るため不採用)。
5. **fail-closed 双方向**: 終端 record(Status ≠ Running)は `not-running` で無改変、現ホスト graph に無い行は `foreign-rows` で無改変 skip、`recompose --add` の無言 no-op は exit 1 の loud 拒否へ(AC-4c)。
6. **TDD**: 各 AC につき失敗テスト先行(t393 = FR-3、t394 = FR-4)。Red verbatim を記録してから最小実装で Green。

## テスト計画

- t393(新設・FR-3): AC-3a set-autonomy 成功 / AC-3c scaffold⇔テンプレ drift 照合。
- t394(新設・FR-4): AC-4a report 拒否解消 / AC-4b counters 整合 / AC-4c recompose --add loud 化 / 逆向き・終端除外の固定 / compose 配線 pin(`recompile → generateRunners → resyncIntentStates` 順序)。
- t33: scaffold pin の明示改訂(宣言済み、CR-5)。共有 fixture `state-construction.md` は据置(他テストの自前注入を上書きしないため)。

## リスクと対処

- 複雑度ゲート: ガード追加で CCN 超過が出た場合は baseline 更新でなく helper 抽出で解消する。
- coverage registry: 新規テストで FRESHNESS DIFF → `bun tests/gen-coverage-registry.ts` 再生成。
- FR-4r(260729-otel-upstream record 修復)は conductor 側タスクとして本 unit のスコープ外(builder は当該 record に不接触)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T03:23:03Z
- **Iteration:** 1
- **Scope decision:** none

Major 1件: CR-6 の同根残存(no-op 経路・Completed 定義差)が prose 記録のみで Issue 化されていない。他は実装忠実性・TDD 実証・逸脱なしを diff 実読で確認。

### Findings

- Major: CR-6 same-root 残存2クラスタが Issue 未起票(修正 or Issue 化が要件)。→ conductor が #1874 / #1875 として起票し PR 本文・code-summary を更新済み。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T03:24:38Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1 の Major(CR-6 Issue 未起票)は閉包 — #1874/#1875 実在・ラベル・列挙一致、PR 本文と code-summary の引用を実測確認。指摘 0 件。

### Findings

- None
