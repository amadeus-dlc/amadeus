# Application Design — 設計質問(intent 260816-priority-bug-batch-3)

> 裁定承認: 本ファイルの5問はソロ選挙 `E-260817-PBB3-FIX-METHODS`(2 fresh subagent voter、blind 配布)にかけ、q1/q5 は 2-0 established、q2/q3/q4 は tie hold → 正準リスト第1項によりユーザー裁定(2026-08-17 の実 HUMAN_TURN、AskUserQuestion 応答)で確定した。詳細は decisions.md(ADR-1〜5)と選挙 store(`amadeus/spaces/default/elections/260817-e-260817-pbb3-fix-method/`)。

requirements.md 未解決事項の4件(FR-1/FR-2/FR-3/FR-5 の方式)を、FR-3 は2面(クラスA/B)に分割して5問とした。component 境界・通信様式・データ所有の変更は無い(既存コンポーネントの欠陥修正 — components.md)ため、ステージ標準の境界質問は「該当なし」とし、方式裁定のみを問うた。

## Q1: #3153 宣言と応答の結線方式

A. targeted presence reservation の適用拡大 / B. milestone 限定の presence 境界変更 / C. occurrence-bound 応答トークン新設 / X. Other

[Answer]: B — 選挙 E-260817-PBB3-FIX-METHODS q1-3153-binding established(2-0、GoA 2/3)。実装契約は decisions.md ADR-1。

## Q2: #3152 冪等化方式

A. 発火点分離 + 冪等鍵 / B. 冪等鍵のみ / C. 発火点移動のみ / X. Other

[Answer]: A — 選挙 E-260817-PBB3-FIX-METHODS q2-3152-idempotency は tie hold(s1=C GoA2 / s2=A GoA3)、ユーザー裁定で A 確定(2026-08-17)。実装契約は decisions.md ADR-2。

## Q3: #3149 クラスA — CLI とセンサーのどちらを正とするか

A. CLI を正としセンサーの束縛を直す / B. センサーを正とし CLI に converged→landed を追加 / X. Other

[Answer]: A — 選挙 E-260817-PBB3-FIX-METHODS q3-3149-authority は tie hold(s1=B GoA2 / s2=A GoA3)、ユーザー裁定で A 確定(2026-08-17)。converged は final のまま、in-place finalisation + attestation ベース束縛。実装契約は decisions.md ADR-3。

## Q4: #3149 クラスB — 孤児化 created の回復経路

A. 機械的同値証明のみ / B. human-presence 付き override のみ / C. 二段構え / X. Other

[Answer]: B — 選挙 E-260817-PBB3-FIX-METHODS q4-3149-orphan-recovery は tie hold(s1=C GoA2 / s2=B GoA3)、ユーザー裁定で B 確定(2026-08-17)。s2 の実測(実在3件すべて tree/patch-id 不一致)により機械証明は観測レンジ外。実装契約は decisions.md ADR-4。

## Q5: #3046 並行安全化方式

A. 採番の voter スコープ化 / B. mkdir ロック / C. 採番廃止 / X. Other

[Answer]: A — 選挙 E-260817-PBB3-FIX-METHODS q5-3046-concurrency established(2-0、GoA 2/2)。実装契約は decisions.md ADR-5。

## 曖昧性分析

5問の回答に矛盾・曖昧語はない。q1/q5 の両票 reservation は相互補完(同一 seam・同一述語を指名)で runoff 不要と判定した。q2 の s1 反論(計数意味論)は ADR-2 契約5として、q3 の s1 懸念(merge facts 不在)は ADR-3 契約1-2として、q4 の s1 懸念(ラバースタンプ化)は ADR-4 契約2として、いずれも採択案の制約に取り込み済み。
