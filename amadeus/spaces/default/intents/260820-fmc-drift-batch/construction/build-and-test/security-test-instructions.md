# Security Test Instructions — 260820-fmc-drift-batch

## 判定: N/A(適用可能な security 数値 NFR が存在しない)

`requirements.md` **NFR-3** は性能とあわせて security の専用検査も「生成しない」と明示宣言している(逐語「性能・security の専用検査は生成しない(no-test-theatre-for-absent-nfr)」)。SAST/DAST・認証・injection 等の専用検査に対する合否目標は要件に存在せず、体裁のための検査実体は作らない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr)。各 unit の `code-generation-plan.md` にも security 検査目標への trace は存在しない(4面確認)。

## 根拠・既存の担保・覆す条件

- **根拠**: 本 intent はフレームワーク内部の検証機構(tla 適用性判定・registration・実装境界・advisory 退役)への変更であり、認証・外部入力境界・秘密情報の新設はない。各 unit の `nfr-design/security-design.md` は設計面の fail-closed 要求(NFR-2)を規定しており、その検証は**セキュリティ専用検査ではなく** fail-closed 枝の通常テストとして code-generation で実装済み(各 `code-summary.md` の fail-closed 節: model-source-unreadable / unparseable / vocabulary-inconsistent / issue-evidence-unreadable 等、注入→赤→revert の落ちる実証つき)
- **既存の担保**: 秘密情報のハードコード禁止・入力検証は construction フェーズ共通ガードレール + Biome/型検査 + 既存 CI ゲートが常時適用。gh CLI 境界は既存ノルム(cid:practices-discovery:gh-scripts-boundary)の適用範囲
- **覆す条件**: 外部入力境界・認証・秘密情報を扱う変更が将来の intent で入る場合、その intent の NFR で目標を宣言してから専用検査を設計する
