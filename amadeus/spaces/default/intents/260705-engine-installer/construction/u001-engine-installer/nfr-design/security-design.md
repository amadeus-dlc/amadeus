# Security Design — u001-engine-installer（260705-engine-installer）

上流入力: [security-requirements.md](../nfr-requirements/security-requirements.md)、[business-logic-model.md](../functional-design/business-logic-model.md)

## 設計

| 要求 | 設計 |
|---|---|
| SEC-1（credential なし） | 配布物は静的コピーのみ。インストーラは環境変数・トークンを読まない |
| SEC-2（書き込み境界） | すべての書き込み先 path を `join(target, ...)` で構成し、manifest 外の path を組み立てない（実装レビューで担保） |
| SEC-3（既存資産の不変） | 非対象に触れない設計（copySkills は amadeus* glob 限定、mergeSettings は hooks キー限定、aidlc/ は manifest 非掲載）+ 動的検証（FR-2.7 / FR-2.11 / FR-2.13） |
| SEC-4（ネットワークなし） | import は node:/bun 標準のみ（eval の cold cache + オフライン相当駆動 = FR-2.2 が回帰検証） |

## 適用判断

サニタイズ・エンコーディング処理は不適用とする（入力は path 1 個で、SEC-2 の境界設計と事前チェック（FR-1.1）で足りる）。
