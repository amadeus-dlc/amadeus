# Performance Requirements — u001-engine-installer（260705-engine-installer）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[business-logic-model.md](../functional-design/business-logic-model.md)

## 要求

| ID | 要求 | 根拠 |
|---|---|---|
| PERF-1 | インストール（5 工程 + スモーク）はローカル I/O のみで完了し、目標時間は数十秒以内とする（厳密な数値目標は置かない） | 対象はローカルファイルコピー + doctor 起動。ネットワーク I/O なし（NFR-2） |
| PERF-2 | 専用 eval は `test:it:all` の連鎖に加わるため、決定論的で不要な待機を含まない | CON-6、既存 eval（engine-e2e）の慣行 |

## 適用判断

スループット・レイテンシの SLO は不適用とする。単発のローカル CLI であり、性能はユーザー価値（受け入れ条件 1〜4）に含まれない（Right-Sizing）。
