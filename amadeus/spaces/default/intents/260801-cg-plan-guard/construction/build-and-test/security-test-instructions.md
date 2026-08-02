# Security Test Instructions — 260801-cg-plan-guard

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(4 unit)

- 本 intent の攻撃面は「検証・ゲートの fail-open 化」クラスに限られる(新規外部入力・認証・秘匿情報なし)。実在境界へ trace する検査のみ選定(bt-proportional-selection)。

## 選定根拠

攻撃面はゲートの fail-open 化クラスに限定(新規外部入力・認証・秘匿情報なし)。DAST・依存スキャンの機械追加は該当境界なしのため見送り、根拠を本書に明記。

## 検証形

- fail-closed 実証: 落ちる実証 計9注入(Bolt 1: 3 / Bolt 2: 3 / Bolt 3: 5 のうち重複除く)が全て赤→復元 diff 0 — ガード無効化・判定弱体化・default 開放のいずれも検出されることを実測。
- 未消費フィールド(検証劇場クラス)は E-CPG-U2ABS で除去済み。
- 依存追加ゼロ(dist:check / lockfile 差分なし)— 依存監査は既存 CI の範囲で追加不要。
