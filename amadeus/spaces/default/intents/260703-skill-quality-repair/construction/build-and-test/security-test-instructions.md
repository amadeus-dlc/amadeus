# Security Test Instructions

Unit: skill-quality-repair（Test Strategy: Minimal）

## 適用判断

実施しない。

## 判断根拠

- 本 Intent にセキュリティ NFR は存在しない（nfr-requirements stage は refactor scope により SKIP。requirements.md にも該当要求がない）。
- 変更は repo 内の文書と検査スクリプトに閉じ、認証・入力受理・外部通信の面を追加していない。GitHub Issue 短縮参照の契約（R005）は「曖昧時に停止して人間に確認する」という保守的規則であり、攻撃面を広げない。
