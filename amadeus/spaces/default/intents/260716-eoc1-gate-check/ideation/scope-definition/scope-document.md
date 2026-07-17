# Scope Document — eoc1-gate-check(Issue #1101)

## 上流入力(consumes 全数)

`../intent-capture/intent-statement.md`、`../feasibility/feasibility-assessment.md`(実測5点)、`../feasibility/constraint-register.md`(C-1〜C-5)、`../feasibility/raid-log.md`。

## In Scope

1. `ensureQuestionsEvidence` 相当の検査述語を amadeus-lib.ts(既計測モジュール)へ追加 — 含意形([Answer] 非空 ⇒ 裁定参照(E-code)または承認タイムスタンプ行実在)
2. handleGateStart(amadeus-state.ts :1661)からの呼び出し — validateSlugInState 後・setCheckbox 前、fail-closed(error() → 非0 exit・遷移なし)
3. questions ファイル不在は正常(検査スキップ)/ 発火は gate-start 時のみ(旧 record へ遡及しない)
4. 落ちる実証3系テスト(記入+承認なし拒否 / 承認行型不正拒否 / 正常系非拒否)
5. dist 8ツリー再生成+registry+docs 整合(stage-protocol の E-OC1 記述への1行追記可否は実装時判断)

## Out of Scope(pre-declared)

- #922 の advisory sensor 化(検査述語の共有関数化までは in — sensor 発火点の追加は #922 側で別対応。requirements で共有関数の形を確定)
- E-OC1 手順ノルム自体の改定
- 過去 record の遡及検査・一括修正

## 成功基準

gate-start に「承認証跡なき [Answer] 記入」の注入 → 拒否(exit 非0・STAGE_AWAITING_APPROVAL 非 emit)、正常系(本 intent の実 questions)→ 通過。
