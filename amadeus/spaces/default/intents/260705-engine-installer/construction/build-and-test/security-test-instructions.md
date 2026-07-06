# Security Test Instructions

Unit: u001-engine-installer

## 適用判断

独立したセキュリティテストは作成しない。SEC 要求の検証は次で担う（security-requirements.md「検証の対応」の確定どおり）。

- SEC-2（書き込み境界）: 実装レビュー（PR）。path 脱出の動的検証は脅威モデル判断により非対象。
- SEC-3（既存資産の不変）: eval の FR-2.7 / FR-2.11 / FR-2.13。
- SEC-1 / SEC-4（credential なし・ネットワークなし）: 実装レビューと eval のオフライン相当駆動（FR-2.2）。
