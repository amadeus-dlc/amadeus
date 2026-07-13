# 出力モック(wireframes 相当)— metrics-observation

> UI を持たない CLI/計測系 intent のため、PM4-2(ui-less-mockups-as-output-contract)に従い「verdict 別の出力文言+exit code のモック」で充足する。様式は既存兄弟ツール(tests/complexity-gate.ts の `OK`/`FAILED [種別]` 2行様式、coverage-project-gate の整形出力)の既習様式に揃え、新規発明しない。**スキーマのフィールド名・保存パスは design 確定までの例示**(出力契約の形=verdict 分岐と exit code が本モックの正準部分)。

## 1. 計測成功(正常系)

```
$ bun <snapshot-tool> --write
METRICS SNAPSHOT OK — 6 collectors, written to metrics/2026-07-12T05-20-00Z.json
```
- exit code: **0**
- snapshot ファイル例(例示 — フィールドは design で確定):

```json
{
  "schema_version": 1,
  "captured_at": "2026-07-12T05:20:00Z",
  "commit": "6869b1058...",
  "collectors": {
    "ccn":       { "tool": "lizard", "tool_version": "1.23.0", "functions": 2140, "over_threshold": 42, "distribution": {"p50": 3, "p90": 9, "max": 39} },
    "coverage":  { "tool": "bun-lcov+coverage-normalize", "line_pct": 51.41, "lines": 18573, "hits": 9550 },
    "loc":       { "tool": "git+static-scan", "ts_files": 482, "total_lines": 118000 },
    "tests":     { "tool": "run-tests-summary", "files": 396, "assertions": 4413 },
    "dist_size": { "tool": "du", "bytes": 12582912 }
  }
}
```

## 2. 計測失敗(loud fail — 成功基準 S3)

```
$ bun <snapshot-tool> --write
METRICS SNAPSHOT FAILED [COLLECTOR: ccn] — lizard exited 127 (not installed?). No snapshot written.
```
- exit code: **1**
- 契約: **部分 snapshot・古い値の残置をしない**(書き込みはアトミックに全成功時のみ)。失敗 collector 名を必ず明示。

## 3. 検証モード(CI 配線の落ちる実証用)

```
$ bun <snapshot-tool> --check
METRICS SNAPSHOT CHECK OK — all 6 collectors executable (dry-run, nothing written)
```
- exit code: 0(全 collector 実行可能)/ 1(いずれか不能 — 失敗名明示)

## 4. CI ログ上の見え方(main マージ時、第一候補トリガー)

```
Run metrics snapshot
  METRICS SNAPSHOT OK — 6 collectors, written to metrics/2026-07-12T05-20-00Z.json
  [snapshot-commit] pushed 1 file to main (loop-guard: paths-ignore metrics/)
```
