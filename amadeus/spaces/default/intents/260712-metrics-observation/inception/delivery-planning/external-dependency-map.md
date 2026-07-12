# External Dependency Map — metrics-observation

| 依存 | 種別 | 状態 |
|---|---|---|
| lizard 1.23.0(pip) | 計測器(ccn collector) | 導入済み・CI 両ジョブ pin(#837)。新規導入なし |
| GitHub Actions GITHUB_TOKEN | CI 書き戻し | 既存機構。job 単位 contents:write の追加のみ(Bolt 3) |
| Codecov | カバレッジ可視化 | 非接触(変更なし) |
| 新規 npm/pip 依存 | — | **ゼロ**(build-vs-buy 裁定・C1 制約どおり) |
