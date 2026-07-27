# Security Test Instructions — 260726-promote-self-hooks

上流入力 (consumes 全数): code-generation-plan.md, code-summary.md

## 適用判定

NFR セキュリティ要件の成果物はない (bugfix スコープ) が、本変更は**ユーザー級設定ファイル `~/.kimi-code/config.toml` への書き込み**というセキュリティ敏感面を持つため、関連する保証を既存実装の検証として整理する (新規攻撃面テストの追加はなし)。

## 検証済みの保証 (t299 / t-kimi-hooks-merge / setup domain テストが担保)

- バックアップ作成 (`config.toml.amadeus-backup-<ISO>`) — replace 経路で t299 (iii) が検証
- pre-write TOML guard — マージ結果の構文検証に失敗した場合は書き込まない (module 既存)
- 冪等 noop — 同一ブロック既存時は config 不変・バックアップなし (t299 (ii))
- マーカー異常 (重複・非対・逆順) は loud fail、自動修復しない (domain 既存)
- managed block 外のバイトは一切変更しない (BR-1、domain テストが担保)
- 実ユーザー config の汚染防止 — テストは `KIMI_CODE_HOME` mkdtemp 隔離 (t209/t227/t299)

## 実行

`bun test tests/integration/t299-promote-self-kimi-hooks-merge.test.ts tests/integration/t-kimi-hooks-merge.test.ts tests/unit/setup-kimi-hooks-domain.test.ts`
