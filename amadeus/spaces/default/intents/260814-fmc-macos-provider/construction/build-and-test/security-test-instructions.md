# Security Test Instructions(intent 260814-fmc-macos-provider)

## 判定: 適用可能な security NFR の新設なし(既存契約の維持のみ)

本 intent は認証・認可・入力境界を追加しない。セキュリティ関連の既存契約 — sandbox-exec の network-deny probe、Docker `--network=none`、jar sha256 固定 — は無変更で、既存 unit/integration テスト(spawn-planner の network-deny assert、DOCKER_INSPECTION_PLAN)が維持を検証している(unit-test-instructions.md の FR-3/FR-4 観点に包含)。

## この判定を覆す条件

フォールバックが分離境界の弱い側へ暗黙に落ちる設計変更(例: sandbox なし直接実行への fallback)が提案された場合は、security NFR の宣言と専用検査を必須とする。
