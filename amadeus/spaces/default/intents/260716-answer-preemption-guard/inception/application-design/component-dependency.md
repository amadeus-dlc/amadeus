# Component Dependency — answer-preemption-guard

上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜7)、codekb `architecture.md`・`component-inventory.md`、`../practices-discovery/team-practices.md`(変更 0 件)。

## 依存グラフ(テキスト)

```
amadeus-sensor-answer-evidence.ts (C-1)
  ├─ import → amadeus-lib.ts: checkQuestionsEvidence(:1173、無改修)
  ├─ import → amadeus-lib.ts: QUESTIONS_EVIDENCE_CUTOFF_YYMMDD(C-3 新設)
  └─ spawn される ← amadeus-sensor.ts(無改修、manifest command 解決 :162-176)
amadeus-answer-evidence.md (C-2)
  └─ compile 時読込 ← amadeus-graph.ts(無改修)← stage frontmatter sensors: (C-4)
amadeus-state.ts handleGateStart
  └─ import → QUESTIONS_EVIDENCE_CUTOFF_YYMMDD(C-3 — ローカル定数を置換)
t-answer-evidence-sensor.test.ts (C-5)
  ├─ in-process → main/evaluateAnswerEvidence(seam)
  └─ spawn → 配布コピー経由 dispatcher fire(E2E、AC-5d)
```

循環依存なし。runner-gen drift guard(AC-3c)への影響: なし — runner-gen は compiled stage-slug 集合のみに依存し sensors: フィールド非参照(amadeus-runner-gen.ts:100-103 reviewer 実測)。本変更は stage 追加を含まないため自明に green(検証列には残す)。dist 再生成面: core/tools 2ファイル+core/sensors 1ファイル+stages 32ファイル → dist×5+self-install×2(package.ts discover 機構が自動伝播)。

## 変更面の非交差確認(設計時点)

C-1/C-2 は新規ファイル、C-3 は amadeus-lib.ts/amadeus-state.ts の局所置換、C-4 は stages frontmatter の1行追加 — 進行中の他 intent(norm-distillation-a = norm-metrics ツール、metrics-timeseries = 閲覧 CLI、opencode-hooks = plugin)とファイル単位で非交差(c6 判定は実装 PR 時に実 diff で再評価)。
