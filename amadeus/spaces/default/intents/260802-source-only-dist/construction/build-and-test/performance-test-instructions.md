# 性能テスト手順

## 上流参照と性能契約

全9 Unit の `code-generation-plan.md`、`code-summary.md`、各Unitのperformance designを入力とする。対象は常駐サービスではなく短命なBun CLIとGitHub Actionsであるため、同時接続負荷ではなく、走査回数、entry数、比較回数、wall-clock退行を検査する。

## 実行方法

- 通常の退行検査: `bun run test:ci`
- 配布ベンチマーク: `bun run distribution:benchmark`
- 集約済み複数runner証跡の評価: `bun run distribution:benchmark:aggregate`
- release asset生成ではfixture fileCountを増やし、read/write entry countとsort比較回数のcounter assertionを検証する

ローカル単発の絶対時間はホスト負荷の影響が大きいため、正否判定には決定的counterとCIの継続的wall-clockを優先する。

## 合格基準

- 1回のbuildで必要な生成を完結し、テストjob内の不要な重複buildを増やさない
- fileCount増加に対する処理量が設計上の線形境界または明示したsort境界を満たす
- CIの既知timeoutは隔離再実行で成功し、再現する性能退行がない
- hosted runnerの性能判定は3 replica、warmup 3回、計測20回の既存protocolに従う
