# コード生成サマリー — unit: rename-lint-fixes

対応 Issue: [#537](https://github.com/amadeus-dlc/amadeus/issues/537)（scope-table の旧パス ENOENT）、[#540](https://github.com/amadeus-dlc/amadeus/issues/540)（learnings の sensors 旧名解決）、[#538](https://github.com/amadeus-dlc/amadeus/issues/538)（linter sensor の実質 no-op）
上流入力: `code-generation-plan.md`、`inception/requirements-analysis/requirements.md`（FR-1〜FR-4、NFR-1〜NFR-4、AC-1〜AC-6）

本サマリーは B001（#537）と B002（#540）の実装完了時点の記録である。
B003（#538）は NFR-2 に従い #528 PR merge 後に着手するため、本時点では設計確定（code-generation-plan.md に設計仕様と AC-6 検証仕様を記録済み）のみの状態である。

## 変更ファイル一覧（B001 / B002 完了分）

### エンジン本体（.agents/amadeus/、parity 例外宣言済み）

- `.agents/amadeus/tools/amadeus-utility.ts`
  - `skillMdPath()` の解決先を `join(TOOLS_DIR, "..", "..", "..", "skills", "amadeus", "SKILL.md")` へ修正（FR-1.1）。
  - `TOOLS_DIR` は `.agents/amadeus/tools/` であるため、3 段上でリポジトリルートに達し `skills/amadeus/SKILL.md` を正しく参照する。
  - 旧パス: `join(TOOLS_DIR, "..", "skills", "aidlc", "SKILL.md")` → `.agents/amadeus/skills/aidlc/SKILL.md`（不在）を参照して ENOENT。

- `.agents/amadeus/tools/amadeus-learnings.ts`
  - `sensorManifestPath()` の sensor ファイル名テンプレートを `` `amadeus-${sensorId}.md` `` へ修正（FR-2.1）。
  - 旧パターン: `` `aidlc-${sensorId}.md` `` → 実在する `amadeus-*.md` の 4 ファイルが解決されない。

### dev-scripts（検証）

- 新規 `dev-scripts/evals/rename-leftovers/check.ts` — rename-leftovers eval（FR-1.2 / FR-2.2 / FR-4.2、常設）。4 観点（tools 内 skills/aidlc パス断片、aidlc-${ テンプレートリテラル、センサーファイル命名、scope-table --check の exit 0）を決定論的に検査する。
- 新規 `dev-scripts/evals/rename-leftovers/allowlist.json` — 正当な旧名参照の許可リスト。`aidlc-state.md`（v2 成果物名）、`.aidlc-plan.json` 等の v2 互換ファイル名、`amadeus-sensor-schema.ts` のデッドエラーメッセージ文字列などを宣言する（各エントリに `pattern`、`reason`、`files` を記録）。

### 設定

- `package.json`: `"test:it:rename-leftovers": "bun run dev-scripts/evals/rename-leftovers/check.ts"` を追加し、`test:it:all` 末尾に `&& npm run test:it:rename-leftovers` を追記（FR-1.3 判断：scope-table --check の drift を CI で自動検出する）。

### parity 宣言

- `dev-scripts/data/parity-map.json`: `engineFileExceptions` に `tools/aidlc-utility.ts`・`tools/aidlc-learnings.ts` が既存宣言済みであることを確認した。新規宣言は不要（FR-4.1）。

## 主要判断

1. **`skillMdPath()` の相対パス段数を `..` 1 個から `../../../` 3 個に修正した。** `TOOLS_DIR` は `fileURLToPath(import.meta.url)` から得られる `.agents/amadeus/tools/` であり、1 段上の `.agents/amadeus/` に `skills/aidlc/` は存在しない。3 段上がるとリポジトリルートとなり、`skills/amadeus/SKILL.md` を正しく解決できる。旧コードの `..` は明らかにパス段数の誤りであり、#445 engine-namespace 改名時の取りこぼしである。

2. **FR-1.3：scope-table --check を rename-leftovers eval 経由で test:it:all に組み込むことを採用した。** scope-table の SKILL.md は Bolt scope の追加・変更のたびに再生成が必要であり、再生成漏れがあると `--check` が exit 非 0 になる。この drift を CI で自動検出することで、SKILL.md 更新漏れを早期に発見できる。組み込まない場合は drift が人手レビューまで気づかれず、gate の信頼性が下がる。scope-table --check は rename-leftovers eval の観点 (d) として既に実装したため、`test:it:rename-leftovers` を追加するだけで組み込みが完了する。

3. **`amadeus-sensor-schema.ts:165` の `` `aidlc-${obj.id}.md` `` は許可リスト登録で対応した（修正せず）。** `SENSOR_FILE_REGEX = /^amadeus-([a-z][a-z0-9-]*)\.md$/` がすでに `amadeus-` prefix でマッチし、`filenameId` にはステム（例: `linter`）だけを渡すため `obj.id === filenameId` は常に真となり、このエラーメッセージ文字列には実行時に到達しない dead code である。文言の修正は Surgical Changes 原則に従い本 Intent のスコープ外として扱い、許可リストに理由付きで宣言した。

4. **parity 宣言は既存の `tools/aidlc-utility.ts`・`tools/aidlc-learnings.ts` エントリを流用した。** これらはすでに `engineFileExceptions` に宣言されており、新規エントリは不要だった。今回変更したファイルの実際のパスは `tools/amadeus-utility.ts`・`tools/amadeus-learnings.ts`（改名後）であり、例外宣言のキーが旧名（`aidlc-*`）であることも parity-check 通過済みであることから整合している。

## RED→GREEN 証跡（FR-4.2）

新規 `dev-scripts/evals/rename-leftovers/check.ts`（8 assertion）で各観点を検証した。

- **(a) B001 — skills/aidlc パス断片の検出**: 実装前は `amadeus-utility.ts` の `skillMdPath()` が `"skills", "aidlc"` を含む行で FAIL した。修正後、allowlist 外の違反が 0 件になることを確認（GREEN）。

- **(b) B002 — `` `aidlc-${ `` テンプレートリテラルの検出**: 実装前は `amadeus-learnings.ts:84` の `` `aidlc-${sensorId}.md` `` で FAIL した。修正後、allowlist 外の違反が 0 件になることを確認（GREEN）。`amadeus-sensor-schema.ts:165` の dead code パターンは allowlist で除外済みで正しく動作する。

- **(c) センサーファイル命名**: 実装前から `.agents/amadeus/sensors/` の全 4 件（`amadeus-linter.md`・`amadeus-required-sections.md`・`amadeus-type-check.md`・`amadeus-upstream-coverage.md`）は正しい命名であったため、RED は生じなかった（B001/B002 の副次確認として機能した）。

- **(d) scope-table --check**: 実装前は `skillMdPath()` の ENOENT により exit 非 0 で FAIL した。B001 修正後 exit 0 で完走することを確認（GREEN）。

RED 確認は `bun run dev-scripts/evals/rename-leftovers/check.ts` を実装前後で実行し、FAIL → ok の変化で比較した。

## 検証結果

| 検証 | 結果 |
|---|---|
| `bun run dev-scripts/evals/rename-leftovers/check.ts`（新規、RED→GREEN 済み） | 8/8 ok |
| `npm run test:all` | pass（exit 0。全サブコマンドおよび `test:it:rename-leftovers` 込みの `test:it:all` を含む。2026-07-06T02:30Z 時点）|
| `npm run parity:check` | ok（39 skills、199 engine files） |
| `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-rename-lint-fixes` | pass（不足または矛盾: なし）|

## 逸脱

- **B003 実装は本時点で未着手。** requirements.md の NFR-2「B003 の着手は engineer3 の #528 PR の merge 後」に従い意図的に保留している。code-generation-plan.md に設計仕様と AC-6 検証仕様を記録済みであり、AC-6 は設計確定地点（code-generation-plan.md）での充足を要件としているため、実装保留は requirement 違反ではない。#528 merge 後に Step 7→Step 8→Step 9 を実行して本 summary を最終化する。

- **センサーファイル命名の RED は生じなかった。** FR-2.2 の eval (c) 観点は B002 修正前から GREEN だった。これは eval 整備前にセンサーファイルがすでに正しく改名されていたことを意味し、B002 の修正（learnings.ts 側の解決パターン）とは独立した観点である。
