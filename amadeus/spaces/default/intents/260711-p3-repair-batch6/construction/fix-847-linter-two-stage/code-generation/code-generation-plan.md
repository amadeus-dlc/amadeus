# code-generation plan — Bolt FR-5 / Issue #847

## 対象バグ
`packages/framework/core/tools/amadeus-sensor-linter.ts` が `bunx eslint` ラップ専用に逆戻り
（元修正 #538 `c6597bf18` が現行 source-of-truth `packages/framework/core/` へ伝播せず喪失）。
Biome 採用 repo（本 repo 自身）では eslint config 不在で常に exit 127 = quiet PASS になり、
実 linter が gate で発火しない。

## 契約（#538 `c6597bf18` から差分再接地）
2 段検出:
1. **tier-1 `lint:check`**: workspace の nearest package.json が `lint:check` script を宣言していれば
   `bun run lint:check`（cwd=projectRoot）をラップ。exit 0 = pass、非0 = 1 violation（error severity、
   診断出力を message へ格納）。spawn 失敗（status null: signal/timeout）は保守的 tool-unavailable（127）。
2. **tier-2 eslint（従来）**: `lint:check` 宣言なしなら既存の eslint 検出（不在 → 127 quiet PASS）。
   既存コードは無改変で保全。

## 契約同等性と現行実装への適合点
- 元修正は `.agents/amadeus/tools/`（旧 self-install 面）へ適用。現行の正本は
  `packages/framework/core/tools/`。同一契約を core へ再接地する。
- 元 `runLintScript` は `process.exit` 直呼びの `never` 関数。現行では **seam 分割** して in-process
  被覆可能にする（bun --coverage の spawn 盲点 + codecov/patch 100% 対応、cid:seam-export-handler-amend）:
  - `detectLintScript(projectRoot): boolean`（export、pure fs read）
  - `buildLintScriptOutput(status, stdout, stderr, filePath): SensorOutput`（export、pure map）
  - `runLintScript(projectRoot, filePath, spawn=spawnSync): { exitCode, stdout }`（export、spawn 注入可、
    `env: process.env` 明示）
  - `maybeRunLintTier(projectRoot, filePath, spawn?): {exitCode,stdout} | null`（export、tier-1 なら結果、なしなら null）
  - `main()` を export し、tier-1 ディスパッチを projectRoot 解決直後・eslint probe の前に挿入。
- JSON 出力形状は locked shape を厳守（pass/errorCount/warningCount/violations/findings_count）。
- 挙動同等: message は先頭 4000 文字、violation は line0/col0/rule="lint:check"/severity="error"。

## テスト（hermetic、実 eslint/実 linter を spawn しない — t92 #819/#862 方針）
新規 `tests/integration/tXXX-linter-lint-check.test.ts`（dist/claude copy を in-process import）:
- (a) 宣言あり+違反あり: 一時 project に `"lint:check":"exit 1"` stub + .ts → main() 経由（process.exit spy）
  で pass:false, findings_count 1。**修正前 RED**（現行は tier-1 不在で quiet PASS）。
- (b) 宣言あり+違反なし: `"lint:check":"exit 0"` → pass:true, findings_count 0。
- (c) 宣言なし: `detectLintScript` false を直接検証（従来 eslint 経路の保全 = 既存 t92 case11/e2e が担保）。
  実 eslint を spawn しないため main() は走らせない。
- (d) 追加: no package.json → detectLintScript false（catch 分岐）。
- (e) spawn status null → runLintScript(inject spawn) exitCode 127（tool-unavailable 分岐）。
- (a)(b) は `bun run "exit 1"/"exit 0"` の hermetic spawn（実 linter レス）。
- 全 spawn に `env: process.env` 明示。
- EXPECTED_NONE_TO_CLI へ新ファイル追記（cli spawner ではなく in-process import なので不要か要確認）
  + `bun tests/gen-coverage-registry.ts` regen。

## 落ちる実証
修正を一時 revert → 新テスト (a) RED（quiet PASS で pass:true）を実測 → 記録 → GREEN。

## 閉包実測
Issue #847 再現手順を verbatim 再適用（Biome repo の linter sensor が quiet PASS になる症状）→ 非再現を実測。

## 同根棚卸し
`amadeus-sensor-type-check.ts` 他 sensor に「実ツール専用ラップで project script 無視」同型欠陥がないか grep 列挙。
元修正 diff の他ファイル面（amadeus-linter.md description）喪失も確認。

## dist/self-install 同期
`bun scripts/package.ts` + `bun run promote:self` を同一コミット。

## 検証
typecheck / lint / dist:check / promote:self:check / complexity-gate --check / 新規+t92 / gen-coverage-registry --check。
push 前 lcov で diff 追加行未カバー 0 を実測。
