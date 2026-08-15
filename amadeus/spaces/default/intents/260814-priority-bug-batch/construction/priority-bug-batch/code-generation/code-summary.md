# Code Summary — unit: priority-bug-batch

> Depth Minimal(bullet のみ)。PR: https://github.com/amadeus-dlc/amadeus/pull/3076(branch `bolt-priority-bug-batch`、base `8b36a0ad0`、5 commits)。実装は builder サブエージェント(worktree 分離)、数値は builder 報告と conductor 取込後の再実測からの転記。

## 変更ファイル

- `tests/unit/t07-hook-audit-logger.serial.test.ts` — FR-5/#3035。300ms/500ms 壁時計 assert 2 件を機能 assert(exit 0 + 監査レコード有無)へ置換、`durationMs` 計測(`performance.now()`/`FireResult.durationMs`)削除(commit `a0c0bfad8`)
- `tests/integration/t2851-doctor-self-install-freshness.serial.test.ts` — FR-3/#3034。live `--check` 経路の冒頭に clean 前提条件プローブを追加、DIFFERS/ORPHAN 時は理由明示で skip(commit `29c5a256f`)
- `scripts/no-silent-drop-evidence-adapter.ts`(+ 対応テスト)— FR-1/#3065。`isIncompleteTreeRead`(exit 0・非空・非 NUL 終端)+ `TREE_READ_ATTEMPTS = 3` の有限リトライ。上限超過は既存 forensics 付き fail-closed throw 維持(commit `10b9c542f`)
- `packages/framework/core/tools/amadeus-migrate.ts`(+ 対応テスト)— FR-2/#3065。`normalizeGitOutcome` 抽出、`result.error` の fail-closed 検査(error 時 ok:false・stderr へ連結)(commit `79af688ba`)
- `packages/framework/harness/pi/drivers/amadeus-pi-driver.ts`(+ t-pi-child-driver テスト)— FR-4/#3040。`amadeus-pi-driver.ts:546` `if (collector.observation().settled) return;` — settle 済み child を timeout レース対象外(cleanup 期限のみ)へ(commit `7637f2725`)

## TDD 実測(builder 報告からの転記)

- FR-1: Red 2 fail(NUL ガード即発火 / 呼出回数 1)→ Green 12 pass / 42 expect
- FR-2: Red 2 fail(error 付き exit 0 が ok:true)→ Green 19 pass / 41 expect
- FR-4: Red `kind: "timed-out"` / `reason: "pi-timeout"`(settle 済み)実測 → Green 16 pass / 48 expect。真のハング(fixture `hang`)は `timed-out` のまま green。Red は修正行の一時除去→赤実測→復元、残渣ゼロを `git diff --stat` で確認
- FR-5(TDD 適用外・振る舞い不変): 前 16 pass / 20 expect → 後 16 pass / 22 expect、`grep -c toBeLessThan` = 0(exit 1)
- FR-3: clean 5 pass / 37 expect、dirty 注入(`zz-orphan-probe.ts`)で skip 出力 + 5 pass / 17 expect、プローブ除去残渣なし

## 検証

- builder(worktree): typecheck 0 / lint 0 / build 0(追跡不変)/ targeted 6 ファイル 111 pass 0 fail / coverage-patch-quick advisory PASS(added 18 / covered 18 / uncovered 0)
- conductor(取込後の配送先ツリー、`bun run build` 済み): typecheck 0 / t07+t2851+t-pi = 37 pass 0 fail / t427 = 26 pass 0 fail
- 台帳: 新規テストファイルなし(既存4ファイル追記)→ coverage-registry `--check` 0。model-map implPath 非該当。allowlist 448 エントリ unresolved=0(resync 不要)
- blocking 検証はリモート CI(`ci-success` 集約、PR #3076)を正とする(push-first)

## 逸脱・申し送り

- 承認済み計画からの逸脱なし
- 既存の無関係な赤(スコープ外・起票候補): `t224-upstream-v2-migration-cli.test.ts` の `symlink clone-id migration isolates distinct fixture identities that share a lock path` が本マシンで bun 既定 5000ms timeout により SIGTERM(7911ms)。base `8b36a0ad0` + build 済み同一条件でも再現(自変更由来でないことをベース比較で確認済み)。ロック取得リトライ予算がテスト timeout 超過、独自 timeout 未宣言
- FR-2 で戻り値注釈の interface 切り出しが patch coverage の追加行 1 uncovered を生んだため、シグネチャを base 同一バイトへ戻して回避(waiver 不使用)
