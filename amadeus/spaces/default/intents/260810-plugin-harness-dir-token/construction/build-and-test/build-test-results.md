# ビルド・テスト実行結果 — 260810-plugin-harness-dir-token

実行日時: 2026-08-10 / 対象: PR [#2811](https://github.com/amadeus-dlc/amadeus/pull/2811) head
実行者: conductor（build-and-test ステージ Step 10）

## ビルド

| コマンド | exit | 出力 |
|---|---|---|
| `bun run typecheck` | **0** | `tsc --noEmit` × 2 面、出力なし |
| `bun run lint` | **0** | `Checked 1739 files. Found 457 warnings. Found 17 infos.`（警告はすべて既存の複雑度警告。本変更による増分 0） |
| `bun run build` | **0** | `dist` 8 面 + self-install 5 面を再生成 |

## テスト

| スイート | 結果 |
|---|---|
| `bun run test:ci` | **933 ファイル PASS / 0 FAIL** / `RESULT: PASS` / exit **0** |

失敗 0 件。診断・修正のループ（Step 10 の On failure 経路）は発動していない。

## 受け入れ条件の実測（FR-2 / FR-4）

述語: (i) 自面の `<harnessDir>/tools/amadeus-sensor.ts` がちょうど 1 件 / (ii) `{{HARNESS_DIR}}` 生リテラル 0 件 / (iii) 自面以外の harnessDir リテラル 0 件

### consumer 導入バンドル 8 面（経路A）

対象: `dist/plugins/pr-convergence/<harness>/plugins/pr-convergence/stages/pr-convergence.md`

| harness | 解決されたパス | 生トークン |
|---|---|---|
| claude | `bun .claude/tools/amadeus-sensor.ts` | 0 |
| codex | `bun .codex/tools/amadeus-sensor.ts` | 0 |
| cursor | `bun .cursor/tools/amadeus-sensor.ts` | 0 |
| kiro | `bun .kiro/tools/amadeus-sensor.ts` | 0 |
| kiro-ide | `bun .kiro/tools/amadeus-sensor.ts` | 0 |
| opencode | `bun .opencode/tools/amadeus-sensor.ts` | 0 |
| kimi | `bun .kimi-code/tools/amadeus-sensor.ts` | 0 |
| pi | `bun .pi/tools/amadeus-sensor.ts` | 0 |

`kiro` と `kiro-ide` がともに `.kiro` に解決するのは `harnessDir` 共有によるもので、要件の記述どおり。

### self-install 5 面（経路B）

対象: `<harnessDir>/plugins/pr-convergence/stages/pr-convergence.md`

| face | 自面パス出現 | 生トークン |
|---|---|---|
| `.claude` | 1 | 0 |
| `.codex` | 1 | 0 |
| `.cursor` | 1 | 0 |
| `.opencode` | 1 | 0 |
| `.kimi-code` | 1 | 0 |

**13 面すべてが自面の実ツールパスに解決し、生トークンの残存は 0。**
修正前は 13 面すべてが `.claude/tools/` を指していた（N-4 の実測）ため、これが是正の直接証拠になる。

## CI（GitHub Actions、PR #2811）

**13 pass / 3 skipping / 0 fail**。`Reproducible build` / `Tests` / `Typecheck` /
`Lint and complexity` / `Plugin conformance E2E` / `Source-only and graph invariants` /
`Coverage Report (head/base)` / `Intent Mirror distribution contract` を含む。
`Formal model check` は skip（本 intent の advisory を `defer-with-risk` で延期したことと整合）。

## 収束

`pr-convergence-cli.ts status` → `converged: true` / `verdict: converged` /
`mergeState: CLEAN` / violating threads 0 / ledger 全 0。
`pr-convergence-report-format` センサーは監査行で **SENSOR_PASSED**（fire の exit code ではなく
`SENSOR_PASSED` 行から読んだ）。

## 既知の限界

- `.pi` / `.kiro` / `.kiro-ide` に self-install 面は存在しない（`SELF_INSTALL_HARNESSES` は 5 面）。
  これらは consumer 導入バンドル 8 面の実測のみが証跡
- 兄弟 11 行の consumer 解決可否は **DEDUCED のまま** → [#2810](https://github.com/amadeus-dlc/amadeus/issues/2810)
- `transform()` と `seedBytesForHarness()` の規則集合の乖離を検出するガードは**存在しない**
  → [#2812](https://github.com/amadeus-dlc/amadeus/issues/2812)
