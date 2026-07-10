# Code Generation Plan — dynamic-size-observation(#699)

> 上流: `../functional-design/`(business-logic-model / business-rules / domain-entities)、`../../../inception/requirements-analysis/requirements.md`。
> テスト戦略: refactor scope 既定(既存スイート緑維持)+ BR-8 の落ちる実証・in-process seam テスト(NFR-5)。
> 実装先: Bolt worktree(base: main)ブランチ `bolt/dynamic-test-size`。PR → codex レビュー → 人間承認マージ(スカッシュ)。

## Steps

- [ ] Step 1: `tests/lib/test-size.ts` にドメイン層を追加(既存 export 不変・追加のみ — BR-7)
  - `WALL_CLOCK_BANDS`(BR-1: small<1s / large≥30s、canonical 1定義)
  - `sizeFloorFromDuration(durationSeconds): TestSize`(境界: 上限排他・下限包含)
  - `WallClockDrift` 判別ユニオン + `detectWallClockDrift(effectiveDeclared, dynamicFloor)`(スマートコンストラクタ — 不成立 drift は表現不能)
  - `MeasuredTestRecord` / `buildMeasuredRecord(input)`(純関数、I/O なし — Step B 決定木)
  - `TestSizeReport` / `buildTestSizeReport(records)`(first-class collection、driftCount 導出)
  - `SizeObservation` / `SizeObservationBackend` + wall-clock 実装(初回消費者 — FR-6 付帯条件)
  → 対応 FR: FR-2, FR-4, FR-6
- [ ] Step 2: Step 1 の in-process ユニットテスト(新規 `tests/unit/t-test-size-dynamic.test.ts`、`// size: small` 注釈付き)
  - floor 境界値(0.999/1.0/29.999/30.0)、drift 成立/不成立、注釈あり/なし/無効、report 集計、backend 素通し
  - 赤/緑 fixture の in-process 実証(BR-8: `// size: small` + 1s 超 duration → drift / 帯内 → none)
  → 対応 FR: FR-2(テスト可能条件)
- [ ] Step 3: `tests/run-tests.ts` の収集・出力配線(BR-6: exit 契約不可侵)
  - per-file JUnit parse 点(:754-762 近傍)で `(file, tier, duration)` をメモリ収集(collector は main から引き回す引数、backend 経由。`meta.duration` は string → `Number()` parse、NaN 除外+stderr note)
  - 全 tier 後: source 読み取り → `buildMeasuredRecord` → `buildTestSizeReport` → `tests/logs/test-size-report.json` 書き出し(dir 自動作成、部分実行はその実行分のみ — BR-4)
  - `printSizeMatrix` 直後(既存 try/catch wrap 内)に drift 行出力(BR-5: 0 件でも `wall-clock drift: 0 file(s)`)
  → 対応 FR: FR-1, FR-3, FR-5(advisory — CI を赤くしない)
- [ ] Step 4: t112 伝播確認(NFR-2)— run-tests.ts の新規 import が `tests/lib/test-size.ts` のみ(コピー済み `t112.serial.test.ts:93`)であることを実測確認。増えた場合はコピーリストへ追加
- [ ] Step 5: `.github/workflows/ci.yml` に artifact upload 追加(`amadeus-test-size-report`、`tests/logs/test-size-report.json`、`if: always()` + `if-no-files-found: warn` + `retention-days: 14` — coverage パターン踏襲)
  → 対応 FR: FR-3
- [ ] Step 6: runner 経由の落ちる実証(BR-8)— 一時的な赤 fixture(`// size: small` + `Bun.sleepSync` 等で >1s)を注入して `wall-clock drift: 1 file(s)` と JSON レコードを実測 → fixture 除去で 0 件に戻ることを実測。証跡(コマンド+出力)を code-summary へ記録
- [ ] Step 7: 検証コマンド一式(exit code 添付 — evidence-discipline)
  - `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci`
  - 静的 drift guard(t-test-size-drift)・t112 の既存グリーン維持を確認

## 非対象(この plan で作らないもの)

- strace/eBPF バックエンド実装(FR-6 は seam+wall-clock 初回消費者まで)
- 動的 drift の CI 赤化フラグ(BR-3: advisory のみ、先回り実装禁止)
- coverage registry / `.meta` ライフサイクル / 静的 guard / printSizeMatrix 表構造の変更
- dist/ 再生成(対象ファイルは `tests/` と `.github/` のみで core/harness 非接触 — 実装後に接触ゼロを確認)

## トレーサビリティ

| Step | FR/BR | 検証 |
|---|---|---|
| 1 | FR-2/4/6, BR-1/2/7 | Step 2 の in-process テスト |
| 2 | FR-2, BR-8 | bun test 単体実行 |
| 3 | FR-1/3/5, BR-4/5/6 | Step 6 実証 + t112 グリーン |
| 4 | NFR-2, BR-7 | import 差分照合 |
| 5 | FR-3, BR-4 | CI 実行(PR 上) |
| 6 | BR-8(Mandated 落ちる実証) | 赤→緑の実測記録 |
| 7 | NFR 全般 | exit code 一式 |
