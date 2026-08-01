# Delivery Planning 質問記録 — 260801-tla-multi-model

上流入力(consumes 全数): `bolt-plan.md`、`team-allocation.md`、`risk-and-sequencing-rationale.md`、`external-dependency-map.md`

E-OC1 判定: 本ファイルの2問は実行方式の裁定であり、ソロモードではユーザー専権のため選挙を実施せず、AskUserQuestion によるユーザー直接裁定で回答を確定した。記入は裁定受領後(cid:code-generation:election-answer-after-ruling)。
ユーザー承認: 2026-08-01T17:45:00Z

## Q1: batch 2(u2/u3)の実行方式

- A. 直列実行(u2 → u3 の順) — ソロの既定。衝突リスクゼロで単純
- B. swarm 並行(worktree 分離で同時) — 速いが調停コスト。u2/u3 はファイル非交差が確定済み
- X. Other (please specify)

[Answer]: B. swarm 並行(worktree 分離)

## Q2: Construction の autonomy mode

walking skeleton off のため最初の Bolt も通常 Bolt。残り Bolt の進め方。

- A. gated(バッチ終了ごとにゲート) — 各 batch のマージ前に人間確認
- B. autonomous(承認なしで全バッチ連続) — 常任グラントでゲートは執行されるが、バッチ間の人間確認なし
- X. Other (please specify)

[Answer]: B. autonomous(全バッチ連続)
