# Discovered Rules — 260717-mirror-issue-tool

上流入力(consumes 全数): code-structure.md、technology-stack.md、dependencies.md、code-quality-assessment.md、architecture.md、business-overview.md(codekb)

## 新規発見ルール(Q1 裁定、2026-07-17)

- **gh CLI 依存の境界**: gh(GitHub CLI)への依存は `scripts/` 配下の repo ローカル開発支援ツールに限定して許容する。配布フレームワーク(`packages/framework/`、`dist/`、self-install ツリー)へは持ち込まない — 既存 Forbidden「利用者側の Bun-only 前提を変更する理由を文書化せず、配布フレームワークへ runtime dependency を追加しない」との整合。gh 不在・未認証時は loud エラー(exit 1)でフェイルファスト。認証はローカル gh keyring へ委譲し、トークンをコード・設定に持たない。

## 既存ルールの適用確認

- 検証劇場 Forbidden: close の着地検査は実測(intents.json status / state Status)から導出(RE 重点「完了2シグナル」)— ハードコード判定を作らない
- issues-in-japanese: ミラー Issue 本文・タイトルは日本語
