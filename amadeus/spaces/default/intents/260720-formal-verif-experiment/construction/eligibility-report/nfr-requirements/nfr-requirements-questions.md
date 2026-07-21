# NFR Requirements 質問 — eligibility-report

本質問は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` の既決境界を確認する。

## Q1. decision性能

- A. verified 96/72-cell matrixをsingle-pass評価し、hard eligibility後に両arm適格時だけ3-axis Paretoを行う
- B. weighted scoreを追加する
- C. raw evidenceをreport生成時に再実行する
- X. その他

[Answer]: A — matrix / cost identityを再検証し、pure evaluator / rendererで閉じる。（E-FVERA2R）
**Basis:** `requirements.md` FR-6/FR-9、`business-rules.md` BR-01〜09

## Q2. report security

- A. canonical JSON + escaped Markdown、content-addressed trace refs、credential/private path 0件とする
- B. raw secret-bearing environmentを添付する
- C. external dashboardへ自動送信する
- X. その他

[Answer]: A — repo-local recordへ再現可能なreportを保存し、network publishを追加しない。（E-FVEAD3）
**Basis:** `requirements.md` NFR-2/NFR-4、`business-rules.md` BR-13〜17

## Q3. final composition

- A. U1 dispatcherへtop-level handlersを一意に結線し、evaluation / renderingをrootへ重複実装しない
- B. rootでParetoを再計算する
- C. dynamic plugin discoveryを追加する
- X. その他

[Answer]: A — wiring-only責務を維持し、既知FD findingは最終履歴へ保持する。（E-FVEUG2）
**Basis:** `business-logic-model.md` wiring-only root、`business-rules.md` BR-18〜22
