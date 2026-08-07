# Security Test Instructions — 260807-subagent-start-pair

上流入力(consumes 全数): code-generation-plan（変更面の確認元）、code-summary（ガード保存の実測転記元）

## 適用外の根拠（cid:build-and-test:c4 — NFR trace なき専用試験は新設しない）

本 intent の requirements にセキュリティ NFR は存在しない。認証情報・入力サニタイズ・権限境界への変更はない。DAST・依存監査の新設は行わない（repository 全体の dependency audit は本 intent と別判定 — cid:build-and-test:c1-doctor-seam）。

## 患部に対応する既存担保面（本変更で保存を実測した境界）

- **dispatcher の fail-closed**: 未知 slug は exit 1 で既知 slug 列挙のうえ拒否（`bogus-slug` 実測 — hook-dispatcher.integration の "unknown slugs fail loudly" テストが固定）。HOOK_PATHS の export は読み取り面の公開のみで、slug 解決の意味論は無改変
- **kimi 経路の短絡保存**: `tool_name !== undefined` の短絡が無改変であることを §12a reviewer が実読確認（AC-B4）— 語彙拡張が未知 payload の受理拡大にならないことの境界
- **waiver の接地強制**: t483 の waiver は Issue 参照 + 理由の2フィールド必須・空文字拒否・example-anchoring — 無根拠 allowlist による無音欠落の抜け道を負ケーステストで封鎖
