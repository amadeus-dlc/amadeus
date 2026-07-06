# 動向 — Presence Evidence（260705-presence-evidence）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)

## 関連する動向

- エージェント自動化の進行に伴い、「人間の承認を機械的に証明する」要求はハーネス横断で強まっている（本 repo では presence hook + HUMAN_TURN mint 規律として実装済み）。
- 一方でハーネス差（Cursor の presence hook 不発火）が既知であり、presence 依存の検査は手動 mint 運用（Corrections 記載）を前提に設計する必要がある。

## 含意

presence 相関を追加する場合も、意味論は既存の mint 規律（#497 確定判断 8）の内側に収め、新しい presence 概念を発明しないことが安全である。
