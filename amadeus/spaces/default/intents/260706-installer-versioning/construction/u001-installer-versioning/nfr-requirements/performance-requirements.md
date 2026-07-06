# Performance Requirements — u001-installer-versioning（260706-installer-versioning）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[business-logic-model.md](../functional-design/business-logic-model.md)

## 要求

| ID | 要求 | 根拠 |
|---|---|---|
| PERF-1 | ハッシュ計算（約 240 ファイル = 199 engine + 39 skills + 2）の追加コストで、インストーラの体感実行時間を有意に悪化させない。SLO は設けない（ローカル単発 CLI） | Right-Sizing。#451 と同じ判断（SLO なし） |

## 検証

専用の性能テストは作らない。installer eval の実行時間が CI の実用範囲に留まることを test:all の運用で観測する（前例 #451 の performance-test-instructions と同じ扱い）。
