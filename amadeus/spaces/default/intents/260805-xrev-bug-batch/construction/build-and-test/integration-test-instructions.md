# Integration Test Instructions — 260805-xrev-bug-batch

本 intent の患部はいずれも **engine / tools の境界**（監査シャードの読み書き、approve 経路、reviewer runtime、
completion 認可）であり、単体では意味を持たない。したがって主戦場は integration tier である。

## 実行

```bash
bun test tests/integration/<file>
bun tests/run-tests.ts --integration
bun run test:ci -- -P 4        # smoke + unit + integration（CI と同一プロファイル）
```

## 機構の選択（in-process vs spawn）

本 repo には計測上の分岐がある: **spawn したプロセスの行は LCOV に載らない**。
したがって「ガードの判定行そのもの」を測るテストは **in-process**（`handleReport` / `runReviewerCommand` を直呼び）で書く。
CLI の契約（exit code、stdout 形）を測るテストだけ spawn する。この使い分けは本 intent の 4 unit で実際に適用した。

## 単位別の境界テスト

| unit | ファイル | 固定した境界 |
|---|---|---|
| fix-2147 | `t245-reviewer-protocol-production-path` | invocation store の発行・消費・再発行、fail-closed 拒否の全経路 |
| fix-2251 | `t453-await-completion-directive` | 未コミット窓が `await-completion` を返し ERROR_LOGGED を増やさないこと、壊れた state / 壊れた Goal 成果物は error 経路に留まること |
| fix-2251 | `t427-goal-reconciliation` | `settleable` の分類（鮮度 vs identity） |
| fix-1953 | `t402-approve-reconciliation`(integration) | 旧世代・無世代の実績を証拠に数えないこと、現行世代は通ること |
| fix-1953 | `t379-swarm-canonical-emit` | emitter → registry → 保存行で `Plan generation` が生存すること |
| fix-1946 | `t451-election-receipt-stamp` | ballot の受理時刻刻印 |
| fix-2112 | `t420-unchecked-cast-guard` | 連鎖の最外1サイト化と綴り検出 |

## 外部依存の扱い

外部サービスは無い。プロセス境界（`bun` の spawn）と実ファイルシステムのみが外部依存であり、
後者は一時ディレクトリで隔離する。ネットワークに触れるテストは本 intent に無い。

## 期待

`bun run test:ci` が **0 failed** であること。個別ファイルの pass 数は環境で変わりうるが、失敗は 0 が基準。
