# RAID Log — metrics 可視化(B1 後続)

上流入力(consumes 全数): intent-statement.md

## Risks(リスク)

- R1: retention 定数(360件)の将来変更で埋め込み HTML が肥大しうる — 緩和: 生成スクリプトにサイズの loud 警告(閾値は requirements で数値固定)。現状実測 123件=193KB で余裕
- R2: スナップショットのスキーマ進化(schema_version 2 やコレクタ増減)で描画が壊れうる — 緩和: parseSnapshot 共有(C4)により writer と読み手が同時に進化する構造。未知コレクタは「表示しない」でなく一覧に落ちる設計を requirements で固定
- R3: CI 同乗ステップの追加が既存 metrics-snapshot job のコミット・公開シーケンスと干渉しうる — 緩和: HTML 生成は snapshot `--write` と retention `--apply` の後・commit 前の同一シーケンスに挿入し、コミット単位を1つに保つ(詳細は construction)
  - 訂正(2026-07-26 RE 実測、260726 re-scan): 当初「push 最大3回再試行(260712 設計)」を前提としたが、現実装(ci.yml:464-480)は main 直 push ではなく **bot ブランチ + `gh pr create` + `gh pr merge --auto --squash`** で、再試行は `GITHUB_RUN_ATTEMPT` 入りブランチ名による衝突回避。挿入位置の結論(retention 後・commit 前)は不変

## Assumptions(前提)

- A1: 閲覧はローカル `file://` のみ(Q1=A 裁定 — Pages 公開はスコープ外)
- A2: 可視化は読み取り専用の消費であり、writer/retention の挙動を変えない(C3)
- A3: 過去 123件のスキーマ均一性(実測済み)が retention 窓内で維持される — R2 で保険

## Issues(既知の問題)

- 現時点でなし(データ全件 parse 成功・失敗0件を実測済み)

## Dependencies(依存)

- D1: `scripts/metrics-timeseries.ts` の parseSnapshot / Snapshot 型(再利用元)
- D2: `.github/workflows/ci.yml` metrics-snapshot job(同乗先、:398-449)
- D3: `metrics/*.json` 台帳(唯一の入力データ)
- D4: 該当なし(外部サービス依存ゼロ — レジストリ照会等の外部前提検証は本 intent には不要)
