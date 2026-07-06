# Risk and Sequencing Rationale — 260706-installer-versioning（Issue #543）

上流入力: [bolt-plan.md](bolt-plan.md)、[raid-log.md](../../ideation/feasibility/raid-log.md)

## 順序の根拠

1. B001 が copyEngine / copySkills のファイル単位化（AD-7 = 本 Intent 最大の構造変更）を先に済ませる。skeleton の「判定なし計上」は従来挙動と出力互換のため、構造変更のリスクを機能追加と分離して検証できる（eval の従来 assertion 271 件が回帰検知）。
2. B002 は B001 の計上基盤の上に判定・退避・告知を載せる。3-way の全象限 eval は B001 の manifest が実在して初めて意味を持つ。

## リスクと手当て

| リスク | 手当て |
|---|---|
| ファイル単位化で従来の収束挙動が変わる | B001 を walking skeleton として人間個別確認 + 既存 271 assertion の全 GREEN を gate 条件に含める |
| 退避・削除パスの取りこぼし | 書き込み単一入口（AD-2）+ eval (f)(g)(h) |
| 自己導入で退避物が走査に混入 | requirements 制約（実装時確認）。B002 の検証項目に含める |
| #572（skills/ restructure）との接触 | 対象は scripts/ + dev-scripts/ + README。skills/ に触れる場合は leader へ一報 |
