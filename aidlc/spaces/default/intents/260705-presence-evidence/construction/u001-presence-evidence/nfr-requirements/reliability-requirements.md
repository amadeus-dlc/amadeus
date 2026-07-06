# Reliability Requirements — u001-presence-evidence（260705-presence-evidence）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[business-rules.md](../functional-design/business-rules.md)

## 要求

| ID | 要求 | 根拠 |
|---|---|---|
| REL-1 | 文書と実装のドリフトを防ぐ: 執筆時再読了 + 実装参照の明示（PR レビューへの委任） | FR-2.3 |
| REL-2 | 対象 2 ファイルの実書き込みは #428 merge 後（競合による記述破壊の回避） | BR-7 |

## 検証

REL-1 = code-summary の記録 + PR レビュー。REL-2 = commit 履歴。
