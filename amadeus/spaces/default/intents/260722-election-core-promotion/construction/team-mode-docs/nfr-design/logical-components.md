# Logical Components — team-mode-docs

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、tech-stack-decisions、business-logic-model(本文で参照)

## 論理コンポーネント

| コンポーネント | 実装位置 | 由来 |
|---|---|---|
| 20-team-mode.md / .ja.md(新設) | docs/guide/ | business-logic-model の6章構成 |
| 3層配置規約の追記 | docs/harness-engineering/ | business-logic-model の FR-7b 面 |
| 既存3文書の旧パス更新 | docs/guide/team-messaging.md、docs/guide/harnesses/codex-cli.md/.ja.md | reliability-requirements の grep 0 件検証(BR-8) |
| 旧パス grep 検査(手順) | 実装受け入れの機械確認(docs 全域) | reliability-requirements / security-requirements の内部露出排除 |
| ガイド番号再確認(手順) | 実装冒頭の定型 | tech-stack-decisions / scalability-requirements の可変点管理 |

## 配置根拠

- 全て docs/ 側 — コード・テスト・型の変更ゼロ(performance-requirements の静的文書のみ方針と対)。ガードは既存機構の再利用のみ
