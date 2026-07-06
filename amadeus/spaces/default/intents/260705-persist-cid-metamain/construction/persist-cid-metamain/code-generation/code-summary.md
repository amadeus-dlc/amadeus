# Code Summary：260705-persist-cid-metamain

unit: persist-cid-metamain（Bolt 2 本直列、すべて TDD で RED → GREEN を確認）

## B001（#504）: learnings persist の cid 衝突解消と明示報告

- 変更: `.agents/amadeus/tools/amadeus-learnings.ts`
  - `cidMarker(dirName, slug, candidateId)` へ拡張し、marker を `<!-- cid:<dirName>:<stage>:<cN> -->` 形式に変更（FR-1.1）。dirName は `activeIntent(projectDir)`（audit emission と同じ解決）で取得し、解決不能時は loud に fail する（曖昧な marker で新たな衝突を生まない）。
  - 照合は新形式 marker の有無のみで判定（FR-1.2）。旧形式 marker は照合キーに使わず、改稿もしない（FR-1.3）。
  - 戻り値の JSON 形を確定（O-1）: `{ stage_slug, rule_learned, already_present, sensor_proposed, notes }`。`rule_learned` = 実際に追記した件数、`already_present` = 新形式 marker により追記をスキップした件数（FR-1.4）。
- RED 証跡: 別 Intent の同名 candidate_id が無言 no-op / already_present フィールド不在で失敗を確認 → 修正後 GREEN。
- FR-1.3 の pin: 旧形式 marker 共存時に新形式で追記され appended 側でカウントされる検査を eval に固定。

## B002（#507）: エンジン tools 5 ファイルの import.meta.main ガード

- 変更: `amadeus-sensor.ts` / `amadeus-sensor-required-sections.ts` / `amadeus-sensor-upstream-coverage.ts` / `amadeus-swarm.ts` / `amadeus-validate.ts` の末尾を `main();` → `if (import.meta.main) main();`（既存ハウススタイルと同一。FR-2.1）。
- RED 証跡: `bun -e "await import(...)"` が 5 ファイルとも exit 1 / 全 tools 走査で未ガード 5 件 → 修正後: import は exit 0（FR-2.2）、引数なし実行の usage エラーと exit code は修正前後で完全一致（FR-2.3）、未ガード 0 件（FR-2.5 の回帰検査として eval に常設）。

## eval / 検証結果

- 新規 eval: `dev-scripts/evals/persist-cid-metamain/check.ts`（隔離 workspace + 実 CLI 駆動、成功・失敗とも cleanup）。`package.json` に `test:it:persist-cid-metamain` を追加し `test:it:all` へ連結。
- `npm run test:it:persist-cid-metamain`: pass（conductor 側でも再実行して独立検証済み）。
- `npm run typecheck`: エラーなし。`npm run test:it:engine-e2e`: 全項目 ok（CLI 挙動の退行なし）。`npm run parity:check`: ok。`npm run lint:check`: ok。

## parity 宣言

- `dev-scripts/data/parity-map.json`: engineFileExceptions へ #507 の 5 ファイルを追加。exceptions へ #504（amadeus-learnings.ts）と #507（5 ファイル）の理由 2 件を追記。
- skills/ 正準ソースへの同一反映は、対象 6 ファイルに skills/ 側複製が存在しない（実測 0 件）ため適用対象外（NFR-3、requirements に明記済み）。

## 変更ファイル一覧

- `.agents/amadeus/tools/amadeus-learnings.ts`（B001）
- `.agents/amadeus/tools/amadeus-sensor.ts`、`amadeus-sensor-required-sections.ts`、`amadeus-sensor-upstream-coverage.ts`、`amadeus-swarm.ts`、`amadeus-validate.ts`（B002）
- `dev-scripts/evals/persist-cid-metamain/check.ts`（新規）
- `package.json`、`dev-scripts/data/parity-map.json`

## 実装分担の記録

実装・eval・parity 追記は developer subagent（Bolt 直列実行）、独立検証（eval 再実行・parity・変更範囲確認）と record 整合（Per unit 更新、本 summary）は conductor が実施した。
