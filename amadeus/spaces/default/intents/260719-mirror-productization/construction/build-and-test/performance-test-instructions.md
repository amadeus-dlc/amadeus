# Performance Test Instructions

## 対象NFR

各Unitの `performance-requirements.md` / `performance-design.md` と `code-summary.md` を入力とする。外部負荷試験ではなく、CLIの追加I/O、設定read回数、非境界routingへの回帰を決定的テストで測る。

## 実行と指標

`bun test tests/integration/t265-engine-boundary.integration.test.ts` を実行し、非境界でconfig read 0、境界で各層最大1回、Receiptの単一snapshot読取、completed後の追加directive 0を確認する。全CIのwall-clock値は環境依存advisoryとして扱い、機能判定には使わない。

## 合格基準

ネットワーク呼出し0、audit全走査0、非境界の追加config I/O 0、対象Unitの性能assertion失敗0を必須とする。定量値はテスト出力だけを証跡とする。
