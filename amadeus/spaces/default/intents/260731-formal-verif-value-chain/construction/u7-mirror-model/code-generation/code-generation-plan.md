# Code Generation Plan — u7-mirror-model

上流入力(consumes 全数): unit-of-work, functional-design(business-logic-model / business-rules / domain-entities), nfr-design, bolt-plan

## 実行計画(2 フェーズ分割 — conductor の並行化判断)

- **Phase A(非交差前倒し)**: MirrorLifecycle TLA+ モデル(T1〜T4 — 共有 Core+AsIntended/AsImplemented 2 変種+vacuity ガード cfg)、TLC 実測(完全探索/反例/空文化ガード)、T7 工程文書(docs/reference/21・22+plugin README)。純追加ファイルのみで u4/u6 と非交差。
- **Phase B(u6 着地後)**: base 取込マージ → T5 model-map v2 スキーマ(v1 互換なし・loud 拒否)+読み手全更新 → T6 MirrorLifecycle 登録(4 ファイル SHA ピン、#1876 修正済み断面)→ sensor matches glob 拡張 → TDD テスト(v2 parse / FormalElection 移行等価性 / SOURCE_DRIFT 落ちる実証)。
- **CI 統合の範囲(ユーザー裁定・案1)**: 本 Bolt は「全登録モデルの drift 監視」まで。TLC run/verify の複数モデル化(FormalElection 固定 6 ファイル+テスト 25 の unpin)は別 Issue へ切り出し。loader は無引数契約維持・canonical 定数で実行対象選択。
