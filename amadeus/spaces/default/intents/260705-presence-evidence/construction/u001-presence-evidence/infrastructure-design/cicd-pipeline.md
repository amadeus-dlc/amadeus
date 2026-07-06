# CI/CD Pipeline — u001-presence-evidence（260705-presence-evidence）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[performance-design.md](../nfr-design/performance-design.md)

## 適用判断

pipeline の変更はない（新規 eval なし = FR-2.2、package.json 追記なし）。

## 既存 CI との関係

既存 CI（test:all）が文書変更のリンク・整合の回帰を担う（FR-2.1。performance-design.md の回帰確認設計 = test:all pass のみ、と同一の基準）。
