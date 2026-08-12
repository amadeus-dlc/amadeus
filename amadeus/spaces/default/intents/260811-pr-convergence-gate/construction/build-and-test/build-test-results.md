# Build and Test Results

入力は `issue-2838/code-generation/code-generation-plan.md` と `code-summary.md`。実行日は 2026-08-12 JST。

## Build

| Command | Result |
|---|---|
| `bun run build` | PASS |
| `bun run typecheck` | PASS |
| `bun run lint` | PASS（既存 466 warnings / 17 infos） |
| `bun run distribution:check` | PASS（444 payloads / 448 projections） |
| `bun run source-only:check` | PASS |
| `git diff --check` | PASS |

## Test Run

`bun run test:ci` は 983 files、13,195 assertions を評価し、4 files / 30 assertions を失敗として検出した。

- `t-sensor-fire-seam.test.ts`、`t-sensor-fire-hardening.test.ts`、`t92.test.ts`: plugin subtree を保持する resolver が `AMADEUS_SENSOR_SCRIPT_DIR` test seam を先に評価せず、通常 sensor stub を projected tools path へ誤解決した。
- `t-coverage-mechanism-ratchet.test.ts`: direct CLI regression test の追加に対する deterministic spawner registry の更新漏れ。

修正後、上記4ファイルと直接影響する t511 unit/integration を隔離再実行し、6 files、117 tests、329 assertions が全件 PASS。timeout、failed assertion、skip は0件。full runner の AWS live SDK/substrate tests は credentials 不成立により既存契約どおり skip された。

## Coverage と制約

専用 coverage percentage はこの stage では生成していない。FR-1〜FR-8 は t511/t534 と既存 CLI/audit/package matrix で追跡し、performance NFR と deployment surface は非該当。GitHub CI と review convergence は後続 `pr-convergence` stage で確認する。
