# Requirements Analysis — 質問と裁定(260814-t99-copytree-race)

承認: full autonomy ladder による AUTO_DECIDED 2件(Q1 `auto-decision-bb0179a630bc3120268828afd088a76f` 2026-08-14T05:18:00Z / Q2 `auto-decision-d9d261592cc56f112e66bf8233311a06` 2026-08-14T05:20:00Z、`amadeus-bolt decide-question` の decided 出力より転記)。

Intent autonomy: **full**(intent-grant-cd802ff8ef0d6a01d5349782eccfe6dd)。ステージ内質問は `amadeus-bolt decide-question` の梯子で裁定(`cid:scope-definition:c1-semi-ladder-routing`)。質問バジェット: Minimal ≤4、実使用 2。

既決事項(再質問しない — `cid:requirements-analysis:c5`): 欠陥の実在と機序(xrev-260814-3003 2名成立・ESTABLISHED_WITH_REFINEMENTS)、TDD 必須、検証セット(対象単独 + full suite --ci + typecheck + lint)、PR マージ人間専権。

## Q1. copyTreeWithRetry の修正方式

A. (A)+(C): attempt 毎の dest クリア + 診断の集合差分強化(設計意図 :614-616/:716-718 を保存)
B. (D)+(C): post-condition を src⊆dest 包含へ + 診断強化(設計意図の書き換えを伴う)
C. (A) 単独 / D. (D) 単独
X. Other (please specify)

[Answer]: A — `a-clear-dest-plus-c-diagnostics`。裁定: decide-question、decisionId `auto-decision-bb0179a630bc3120268828afd088a76f`、rung agent-recommendation(loud degradation 記録)。根拠: (D) は verbatim 宣言済みの設計意図2件の書き換え = 仕様変更に接近(迷えばエスカレーションの原則から回避可能な A を優先)。(A) は xrev reviewer-2 の対照実験で収束が実証済み、(C) は reviewer-1 が最小の観測性追加と指摘。**Mode:** full-autonomy ladder

## Q2. スコープ線引き(姉妹面・未ガード面・exists 未消費)

A. helper 修正のみ + 残余(fixtures.ts:784 姉妹面 / 未ガード素 cpSync 面 / CopyTreeOps.exists 未消費)は follow-up Issue 起票
B. :784 姉妹面も本 intent に含める
C. 未ガード面を全数置換
X. Other (please specify)

[Answer]: A — `helper-only-plus-followup-issue`。裁定: decide-question、decisionId `auto-decision-d9d261592cc56f112e66bf8233311a06`、rung agent-recommendation(loud degradation 記録)。根拠: self-fix は限定的是正(surgical)。helper 修正は6ガード呼出へ自動波及し Issue #3003 の完了条件を満たす。未ガード面は件数が述語依存(19〜89)で AC 化に不適(RE UNMEASURED-3)。**Mode:** full-autonomy ladder

## 質問化しなかった残余論点(材料性なし — 推奨既定を採用)

- **dest-fresh 契約の明文化**: (A) 採用で必須前提化するため doc comment で明文化を FR に含める(可逆・低リスク)
- **リトライ回数・backoff**: 現行契約(3回、50ms×attempt)を維持(変更理由なし)
