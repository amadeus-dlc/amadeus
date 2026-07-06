# Security Requirements — u001-presence-evidence（260705-presence-evidence）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 要求

| ID | 要求 | 根拠 |
|---|---|---|
| SEC-1 | 文書は防衛線の実態を過大にも過小にも書かない（誤ったセキュリティ保証の禁止） | FR-1.1〜1.3（検証範囲・防衛線・不採用理由の明文化）。検証手段は FR-2.3（実装再読了） |
| SEC-2 | credential・秘密情報を文書に含めない | Construction ガードレール |

## 検証の対応

SEC-1 は FR-2.3 の執筆時再読了 + PR レビュー。SEC-2 は diff レビュー。
