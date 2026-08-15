# Build & Test Results — intent 260815-stale-epoch-landed

> 実測のみ。blocking は PR #3113 のリモート CI を正とする。

| 検査 | 結果 | 実測者 |
|---|---|---|
| t3110(新規 13) | 13 pass / 0 fail exit 0 | builder + conductor 双方 |
| 無退行 10 suite | 254 pass / 0 fail exit 0 | builder(conductor は主要 4+3+4 suite を独立再実測) |
| 文書消費系 7 suite | 66 pass / 0 fail exit 0 | builder |
| typecheck / lint / build / registry --check / allowlist --check / complexity --check / control-byte --check | すべて exit 0 | builder + conductor(一部) |
| ローカルフルスイート | 走行済(唯一の FAIL t2851 は注入との並行実行による自己汚染 — revert 後単独再実行 exit 0 / 5 pass で帰属確定) | builder |

## Round 2(head 4a5cc1135 — CI round 1 の指摘対応)

round 1 CI(head 938aabbd1)の残指摘: Patch Coverage Gate 未被覆 15 行(すべて fail-closed エラーアーム)+ CodeRabbit スレッド 4 件。対応 = commit `a8e7fe485`(epoch proof 照合 + SelfContext 交差型 + allowlist selfReportLifecycle 削除 + t3110 へ 8 テスト追加: dirty / tampered / 非JSON / bad-row / unmeasurable / no-merge-attest / two-Unit ×2)、`4a5cc1135`(project.md 学習改訂)。

| 検査(round 2, conductor 実測) | 結果 |
|---|---|
| t3110(21 テストへ拡張) | 21 pass / 0 fail(151 expect)exit 0 |
| 回帰 t3062 + t448 + t482 + t541 | 123 pass / 0 fail exit 0 |
| typecheck(`tsc --noEmit` ×2 tsconfig) | exit 0 |
| lint(Biome) | exit 0(error 0) |
| allowlist-semantic-audit --check / gen-coverage-registry --check | exit 0 / exit 0 |
| `bun run build`(追跡ファイル不変) | exit 0・`git status` tracked 変更 0 |
| CodeRabbit スレッド 4 件 | 全件返信 + resolve(2026-08-15 14:35Z)。トップレベルへ round-2 まとめ投稿 |
| リモート CI(head 4a5cc1135, run 31890284881) | **conclusion: success**(初回走行の fail は Review Thread Gate のみ — スレッド resolve 前に評価された stale fail で、`gh run rerun --failed` 後に gate・集約 CI Success とも green。取得: `gh run view 31890284881 --json conclusion`)|
| PR #3113 必須 check / mergeStateStatus | 失敗 0(non-pass は Bugbot / Formal model check / Metrics Snapshot の skipping と、concurrency キャンセルされた Refresh workflow 残骸のみ — いずれも非必須)・**CLEAN**(`gh pr view 3113 --json mergeStateStatus`)|
| CodeRabbit sweep | `SWEEP pr=3113 unresolved=0`(cr-sweep.sh、2026-08-15 15:0xZ)|

**Patch Coverage Gate**: round 1 の未被覆 15 行 → round 2 で **green**(run 31890284881 の Patch coverage gate ジョブ pass — 8 テスト追加による被覆で解消、allowlist 追加なし・むしろ 1 エントリ削除)。

**merge-ready 三条件**: CI green ✅ ∧ sweep unresolved=0 ✅ ∧ 全コメント返信済み ✅(2026-08-15 15:0xZ、head 4a5cc1135 で実測)。
