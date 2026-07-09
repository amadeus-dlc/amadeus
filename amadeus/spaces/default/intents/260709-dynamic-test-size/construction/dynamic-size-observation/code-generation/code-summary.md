# Code Summary — dynamic-size-observation(#699)

> 実装: developer subagent(Bolt worktree `bolt/dynamic-test-size`、base: main 13092b851)+ conductor の deslop パス(team.md 新工程、2026-07-09 追加)。
> 上流: `code-generation-plan.md`(全 Step 完了)、functional-design 3成果物、requirements.md。

## 変更ファイル

| ファイル | 変更 | 対応 FR/BR |
|---|---|---|
| `tests/lib/test-size.ts` | Phase D ドメイン層を追加(既存 export 不変): `WALL_CLOCK_BANDS` / `sizeFloorFromDuration` / `WallClockDrift` + `detectWallClockDrift`(スマートコンストラクタ)/ `MeasuredTestRecord` + `buildMeasuredRecord`(純関数)/ `TestSizeReport` + `buildTestSizeReport` / `SizeObservationBackend` + `wallClockBackend`(seam 初回消費者) | FR-2/4/6、BR-1/2/7 |
| `tests/unit/t-test-size-dynamic.test.ts` | 新規(`// size: small`、pure in-process)。floor 境界値(0.999/1.0/29.999/30.0)、drift 成立/不成立、注釈3態、report 集計、backend 素通し、赤/緑 fixture の in-process 実証 | FR-2、BR-8 |
| `tests/run-tests.ts` | `SizeCollector` を main() から明示引数で全実行経路へ引き回し。JUnit parse 点で duration を backend 経由収集(string→Number、NaN は stderr note 除外)。printSummary の既存 try/catch 内で JSON レポート書き出し(`tests/logs/test-size-report.json`)+ drift 行出力(0 件でも表示) | FR-1/3/5、BR-4/5/6 |
| `.github/workflows/ci.yml` | check ジョブへ `amadeus-test-size-report` artifact upload(`if: always()`、warn、14日 — coverage パターン踏襲) | FR-3 |

コミット(bolt/dynamic-test-size、英語):
- `7e448f6b3` feat(#699): add Phase D dynamic test-size domain layer
- `d945a2948` feat(#699): wire dynamic test-size collection into the runner
- `3e27100ac` ci(#699): upload dynamic test-size report as an advisory artifact
- `20b453cf5` refactor(#699): report drift count from the report summary (deslop)

## 主要実装判断

1. collector はモジュールグローバルでなく main() からの明示引数(in-process テスト可能な seam — NFR-5)。
2. 収集は `wallClockBackend.observe()` 経由(選挙 Q4 付帯条件: seam の初回消費者。第2バックエンド時のシグネチャ改訂見込みをコメント明記)。
3. `detectWallClockDrift` はスマートコンストラクタ — 不成立 drift は表現不能(parse-dont-validate)。
4. 無効注釈は `staticSize` に degrade(静的 guard の領分 — BR-2)。
5. exit code 契約: 全レポート経路が printSummary の既存 try/catch 内。書き出し失敗は stderr note のみ(BR-6)。t112 実測グリーン。
6. 新規テストファイル自身の static size 保護: シグナルトークンを runtime 組み立て(t-test-size-drift と同じ手法)— on-disk guard が実際に検出→修正した(guard が機能している副次実証)。
7. deslop(conductor): drift 件数の open-code(filter+再ナローイング)を `report.summary.driftCount` 消費+単一ループへ簡約(first-class collection の徹底)。挙動不変を検証再実行で実証。
8. codecov 無影響: `tests/**` は codecov.yml の ignore 対象。

## 落ちる実証(BR-8 / team.md Mandated)

- **赤**: 一時 fixture(`// size: small` + busy-wait 1.5s、静的シグナルなし)→ `wall-clock drift: 1 file(s)` + `declared=small measured=medium (1.504173s)` + JSON `driftCount: 1` を実測(RUNNER_EXIT=0 — advisory でゲートしないことも同時に実証)。
- **緑**: fixture 削除 → `wall-clock drift: 0 file(s)`、`driftCount: 0`。fixture は最終コミットに不含(working tree clean)。
- busy-wait 採用理由: `Bun.sleep` は静的 timer シグナルで静的 guard も赤化し動的実証が混濁するため(plan からの意図的逸脱、記録済み)。

## 検証(実測 exit code)

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bash tests/run-tests.sh --ci` | 0(276 files / 0 failures) |

deslop 後の再検証: typecheck=0 / lint=0 / t-test-size-drift + t-test-size-dynamic PASS(conductor 実測)。
実スイート全体で drift 0 件(誤検出ゼロ)、レポート 252 レコード。

## plan からの逸脱

- Step 6 の赤 fixture 手法のみ(上記 busy-wait)。他は plan どおり。t112 伝播(Step 4): 新規 import は `./lib/test-size.ts` のみ(コピー済み)で追加不要を実測確認。
