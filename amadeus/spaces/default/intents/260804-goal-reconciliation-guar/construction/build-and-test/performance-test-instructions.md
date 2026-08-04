# Performance Test Instructions

## 適用範囲

要求仕様にはlatencyやthroughputの数値SLOはない。このCLIは短命processであり、`code-generation-plan.md` / `code-summary.md` のperformance riskは、completion guard追加によるtest suiteの非現実的な増大と、deterministic checkの停止である。

## 実行方法

- focused Goal suiteを `bun test --timeout 120000 ...` で実行し、Bunが報告する所要時間とtimeout有無を記録する。
- 全回帰を `bun run test:ci` で実行し、既知のcold compile timeoutは対象file単独再実行で分類する。
- TLA+検査はengine指定commandで実行し、有限時間内に `NOT_DETECTED` または反例を返すことを確認する。

## 合格条件

- 120秒上限内で各focused fileが完了し、hangがない。
- performance専用の絶対SLOは要求されていないため、過去baselineとの差を捏造しない。
- regressionが疑われる場合はwall-clock、CPU制約、cold/warm条件を揃えて別途benchmarkを作る。
