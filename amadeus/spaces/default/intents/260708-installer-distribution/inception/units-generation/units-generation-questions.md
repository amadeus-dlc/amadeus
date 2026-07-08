# Units Generation — 質問と回答

- **Intent**: 260708-installer-distribution
- **ステージ**: units-generation (2.7)
- **モード**: Grill me(グリリング — 質問は動的に1問ずつ追記される)
- **深度**: Standard(intent-backlog P1〜P5 と application-design 8モジュールが下敷き)

> このファイルは意思決定の正式記録。実装順序の経済判断(walking-skeleton の位置づけ等)は delivery-planning の管轄。

---

## Q1. Unit 境界戦略と Unit 構成案

intent-backlog のプロト Unit(P1〜P5)を application-design の8モジュールへ対応付けた5 Unit 案:

| Unit | 内容 | 対応モジュール | 対応ストーリー | 規模 |
|------|------|----------------|----------------|------|
| U1: setup-foundation | パッケージ骨格(`packages/setup`、lint/typecheck 配線、ビルド)+ resolver / fetcher / manifest の基盤3モジュール | resolver, fetcher, manifest(+ビルド設定) | US-B5, A7(基盤部) | M |
| U2: install-flow | install サブコマンド一式(ウィザード、非対話、衝突、導入済み検出、検証、案内) | cli, planner(install), applier, verifier, reporter | US-A1〜A7 | L |
| U3: upgrade-flow | upgrade サブコマンド一式(検出、差分レポート、md5+退避、バージョン境界) | planner(upgrade), applier(退避), reporter | US-B1〜B4 | L |
| U4: publish-readiness | npm 公開整備(メタデータ是正、pack 契約テスト、publish 手順書、setup 版運用) | (パッケージ定義+テスト+docs) | US-C1〜C3 | M |
| U5: docs-rollout | README/docs の導入手順刷新、CHANGELOG/バージョンバンプ | (docs) | US-C4 | S |

境界戦略: **機能(ジャーニー)別**。U1 だけは共有基盤(既存インフラ再利用の棚卸し: 既存の tests/run-tests.sh 4層ランナー・biome/tsc 設定・CI ジョブをそのまま使い、新規機構は追加しない)。

- A. 採用 — この5 Unit 構成で進める(推奨: backlog P1〜P5 と 1:1 で、ストーリー19本が過不足なく写像でき、U2/U3 は U1 完了後に並列開発可能)
- B. 修正 — Unit の統合/分割/境界変更(内容を指定)
- X. Other(自由記述)

[Answer]: A. 採用 — 5 Unit 構成(U1 foundation / U2 install / U3 upgrade / U4 publish / U5 docs)(2026-07-08、Mode: grilling)

---

## Q2. Unit 間の依存と並列開発の許容

依存 DAG 案: U1 → U2、U1 → U3(U3 は U2 の検証パス再利用があるため **U2 にも弱依存**: backlog P3 の記載)、U2/U3 → U4(同梱物確定後にパッケージング)、U4 → U5(ワンライナーが publish 可能になってから README 刷新)。

並列性の扱い:

- A. **U2 完了後に U3 を開始(直列)** — U3 の「検証パスの再利用」(backlog P3)を素直に活かす。並列開発の余地は U4 の手順書系タスクの先行着手に限る(推奨: 単一メンテナ体制(team-formation SKIP の根拠)では並列 Bolt の調整コストが利得を上回り、U2 の planner/applier 基盤を U3 が確実に再利用できる)
- B. U1 後に U2/U3 を完全並列 — worktree 並列 Bolt で同時実装(スワーム向き。ただし planner/applier の共有部で衝突リスク)
- X. Other(自由記述)

[Answer]: A. 直列(U1→U2→U3→U4→U5。U4 の手順書系のみ先行可)(2026-07-08、Mode: grilling)
