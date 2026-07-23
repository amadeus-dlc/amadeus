# Business Rules — U2 election-promotion

> 上流入力(consumes 全数): requirements(FR-1/2)、components(C2/C3)、component-methods(C2/C3)、unit-of-work(U2)、unit-of-work-story-map、services(実行形態)

## ルール一覧

| ID | ルール | 検証 |
|---|---|---|
| BR-1 | 移動は git mv(履歴保存)+scripts/ 側削除。コピー禁止(P5)— U1 重複不変量が機械検出 | U1 テスト green |
| BR-2 | 挙動変更ゼロ: import 1行以外のコード差分を作らない(バグ修正・リファクタ混入禁止 — NFR-2) | 移動前後の diff 検分(import 行のみ)+t234〜t244 green |
| BR-3 | SKILL.md の scripts/ 参照は全出現を書き換え(部分書き換え禁止)— 書き換え後 grep 0 件 | grep 機械確認+U1 live green |
| BR-4 | スキル配線は claude+codex の2面のみ。非対象4面の不在を機械確認(FR-2c) | 4面 dist の ls 不在 assert |
| BR-5 | dist:check / promote:self:check / typecheck / lint / --ci 全 green が完了条件(NFR-1) | 各コマンド exit 0 |
| BR-6 | ADR-1/ADR-3 は AD decisions.md を正本参照(新規 ADR 文書を作らない — 二重化回避)。FR-1e の内容充足は business-logic-model.md の verbatim 照合節で確認済み | PR 説明の参照実在+ADR-1 内容照合の再確認(business-logic-model 照合節) |

## 検証の割付

BR-1/BR-3/BR-4 は機械確認(grep/ls/U1 テスト)、BR-2/BR-5 は既存テスト+CI コマンド、BR-6 はレビュー観点。E2E 面の総合検証は U4。
