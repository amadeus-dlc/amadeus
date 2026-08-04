# Build and Test Results

## 実行環境

- Repository: `amadeus-dlc/amadeus`
- Runtime: Bun 1.3.13、TypeScript monorepo
- Inputs: `code-generation-plan.md`、`code-summary.md`
- Strategy: Comprehensive

## Results

| Check | Result | Evidence |
|---|---|---|
| Build | PASS | `bun run build` |
| Typecheck | PASS | `bun run typecheck` |
| Lint | PASS | error 0 |
| Focused Goal / terminal / mirror | PASS | 12 files、220 tests、1,362 assertions、0 fail、59.56秒 |
| Full CI test | PASS | 809 files、10,765 assertions、failed 0 |
| Distribution | PASS | `bun run distribution:check` |
| Source-only boundary | PASS | `bun run source-only:check` clean |
| Formal Model Check | PASS | outcome `NOT_DETECTED`、exit 0、run `e2a1cddf-034a-42dd-b0ee-424ae414ebf9` |

## Failures and coverage

- 未解決failure、skip、stack traceはない。
- full CIではlive substrate非提供により設計どおりskipされたtestがあるが、failed files / assertionsはいずれも0である。
- coverage / complexity / mechanism ratchetは更新後のcanonical gateを通過した。
- code-generation中に発見したfixture / baseline driftはproduction guardを緩和せず修正し、全回帰で再確認した。
- sensor手動確認時に、declared outputではない`memory.md`へ`upstream-coverage`を誤適用したadvisory failureが1件ある。7件のrequired outputに対する`required-sections` / `upstream-coverage`は全てPASSしており、この行は非適用probeの監査上の分類である。

## Security and performance

- human-only Goal revision、receipt tamper / replay / stale拒否、bypass非適用はunit / integrationでPASS。
- focused testは120秒/fileの上限内で完了し、full CIもhangなく完了した。
- dependency CVE専用scanおよび絶対latency SLOは非適用。未検証をPASSへ読み替えていない。
