# Code Summary — stage-stats-cli(Bolt 1)

上流入力(consumes 全数): requirements(FR-1〜FR-7 / NFR-1〜5 の AC を検証対象として消費)、business-logic-model(A1〜A9 を実装対象として消費)、business-rules(BR-1〜BR-14 を検証観点として消費)、domain-entities(型契約・母集団恒等を実装照合面として消費)、performance-design(60 秒回帰上限を NFR-1 実測の判定基準として消費)、security-design(read-only 構造保証と信頼境界外入力の扱いを FR-7a 検査・レビュー是正の根拠として消費)、unit-of-work(U1 の DoD を Bolt 完了条件として消費)、decisions(ADR-1〜6 の裁定として消費)、code-generation-plan(実装ステップ 1〜12 の計画として消費)

## 実装成果(builder: amadeus-developer-agent、Agent worktree isolation)

| ファイル | 規模 |
|----------|------|
| packages/framework/core/tools/amadeus-stage-stats.ts | 944 行(新規) |
| tests/unit/t484-stage-stats.test.ts | 523 行 / 55 tests / 126 assertions |
| tests/integration/t485-stage-stats.integration.test.ts | 406 行 / 15 tests / 70 assertions |
| tests/.coverage-registry.json | 再生成(conductor ツリーで再々生成し ratchet held) |

- builder コミット `87910ac378b0c7ac7b331f06baec4656b7352200` → conductor ツリーへ cherry-pick(`80480eec0` 系、amend 後)。fidelity diff(コード 3 ファイル)は空 = byte 一致を機械確認

## 検証(conductor ツリーで再実行、実測 exit code)

- `bun run typecheck` = 0 / `bun run lint` = 0
- t484 = 0(55 pass)/ t485 = 0(15 pass)/ t460+t461 = 0(39 pass — C-2 green 維持)
- `bun tests/gen-coverage-registry.ts --check` = 0(fresh, ratchet held)
- builder ツリーでの追加実測: complexity-gate 0 / unchecked-cast 0 new / source-only:check 0 / no-silent-drop(祖先 SHA 明示)0

## NFR-1 実測 / 恒等(builder 実測、実ワークスペース 1 回実行)

- 実行時間 **0.653 秒**(上限 60 秒 — 約 92 倍の余裕)。走査 225 シャード / 133,663 行
- 恒等 W: 構成窓 1563 = net 母集団 1126 + unclosedIdle 34 + zeroSecond 403 — 成立
- 恒等 M: 7404 = attributable 10 + unresolved 7394 — 成立
- observed 参照値との照合: unpaired 35+5 一致、Model 帰属可能 10 一致、0 秒窓 394→403(コーパス増分)

## 落ちる実証(NFR-5 — 注入→赤→revert の 1 セット×3)

1. 除外バケット報告行の削除 → 3 fail(ヘッダ検査)
2. fail-loud を return 0 化 → 1 fail(spawn exit 1 検査)
3. 未クローズ idle の黙示救済化 → 3 fail(unclosedIdle 計上・排他性・恒等 W)

いずれも赤を実測後 fix SHA へ復元、残渣ゼロを diff --stat 空+status クリーンで機械確認。

## 申告付き逸脱(builder 申告、conductor 受理)

1. **テスト番号 t481/t482 → t484/t485**: base 前進で t481〜t483 が使用済み(実測)。NFR-2「t481 以降」は充足(cid:c1-tnnn-collision-on-regrounding の同型)
2. **FR-7a 検査の配置**: 対象ソース実読を要するため tests/integration(t485)へ配置 — 承認済み NFR-2(実 FS は integration)を dispatch 文言より優先。FR-7a AC は配置を規定しない
3. **設計成果物の入手**: fork 元に record 不在のため checkpoint コミットから git show で read-only 読出(既知事象)
4. **unparseableReviewHeading 実測 117 vs observed 参照値 3**: 2 段マッチの寛容側が裸の `## Review`(73)や `## Review Iteration N Remediation`(26)等を拾う仕様どおりの挙動。OQ-2「実装の機械集計値を最終確定とする」に従い実装は不変 — **本乖離は build-and-test 成果物へ記録する(OQ-2 の閉包手順)**

## PR 収束(#2448)とレビュー対応

PR: https://github.com/amadeus-dlc/amadeus/pull/2448(branch `bolt-stage-stats-cli`、base `main` = `2dfa48e3fedb` 起点)。`j5ik2o-gh-pr-converge-loop` で収束させ、最終状態は **13 checks pass / 未解決スレッド 0 / MERGEABLE・CLEAN**(`pr-convergence-report.md` = converged、ledger resolved 7)。

### CI 失敗の是正(5 サイクル)

| 失敗 | 機序 | 是正 |
|------|------|------|
| coverage registry drift(t134 / gen-coverage-registry) | conductor ツリーで `dist/` 未生成のまま registry を再生成し既存エントリが脱落 | `bun run build` 後に再生成して復元 |
| mechanism ratchet | 新規 spawner t487 が `EXPECTED_NONE_TO_CLI` 台帳に未登録 | 台帳へ追記(cid:code-generation:integration-registry-regen の同型) |
| patch coverage(17 行 UNCOVERED) | 解決層(`resolveProjectDirLocal` / `activeSpaceLocal` / `main`)が spawn 経由でしか駆動されず lcov 未計測 | t487 へ in-process 駆動の resolution seam テスト 4 件を追加 |
| lint(no-silent-drop NSD001) | lcov 対策で catch から `continue` を外したため「無音継続」と判定 | `catch { broken += 1; continue; }` の 1 行化(終端を保ちつつ計測可能) |
| patch coverage(:907 の 1 行) | `activeSpaceLocal` の catch ブレース行が DA:0 | catch を 1 行へ collapse(cid:code-generation:bun-inbody-comment-da0 系) |

### レビュー指摘の対応(全 7 件、すべて修正して resolve)

- **Cursor Bugbot(Medium)**: `attributeModels` が `SUBAGENT_STARTED` と `SUBAGENT_COMPLETED` の両方を計上しモデル別合計が約 2 倍 → COMPLETED のみへ限定(1 dispatch = 1 completion、兄弟ツールと同契約)。STARTED 行の非参入をピンする unit テストを追加。恒等 M は実測 7326 = 9 + 7317 で成立
- **CodeRabbit(Major)×3**: (1) parse 不能タイムスタンプが `rawSeconds` を経て net 統計を NaN 汚染 → **`invalid-timestamp` バケットを windowing グループへ新設**し、`buildWindows` は窓化前に、`indexIdle` は区間構成前に計数除外(unit テスト 2 件追加) (2) `SENSOR_EVENTS` のオブジェクトリテラルが `Object.prototype` キーにヒットしうる → `ReadonlyMap` 化(コーパスは信頼境界外) (3) `markdownUnder` がディレクトリ symlink で無限再帰 → `readdirSync(withFileTypes)` + `isDirectory()` の実ディレクトリ限定再帰(syscall も削減)
- **CodeRabbit(Trivial)×3**: `spawnSync` へ `timeout: 60_000` / `killSignal: SIGKILL` を付与、import 完全一致 assert から型 import を除外、レンダラのサニタイズ契約(制御バイト+改行の縮約 / CSV 列偽造防止)のテストを追加

**バケット追加に伴う契約更新(申告付き逸脱 5)**: `ExclusionCounts.windowing` は 5 バケット(全体で 8)になり、measurement ref に `invalid-timestamp` 行が加わった。当初 FD は「7 フィールドの閉集合」を明示していたため、これは**設計契約の変更**にあたる — §12a iteration 1 の BLOCKER 指摘を受け、cid:code-generation:cg-invariant-conflict-explicit-revision に従って上流 FD を**明示改訂 R-1** として改訂した(domain-entities「ExclusionCounts / 母集団恒等」節が正本、business-rules BR-4・新設 BR-4b、business-logic-model A2/A3/A7/A8 へ伝播)。改訂の性質は閉集合の**拡張**であり、既存 7 バケットの意味論・恒等 W の参加集合(`unclosedIdle` + `zeroSecond` のみ)・FR-2c の全バケット報告義務はいずれも不変。

是正後の実測: typecheck 0 / lint 0 / twin **79 pass 0 fail** / 実ワークスペース `invalid-timestamp: 0`・恒等 W 不変(1563 = 1126 + 34 + 403)。

## 検証水準の開示

swarm referee(check/finalize)は本セッションの worktree 隔離ガード下で使用不能(cid:code-generation:c1-pcp-isolated-session-swarm-incompat)のため converged 表記を用いない。代替水準 = fidelity diff 空の機械確認+conductor ツリーでの検証コマンド再実行(上記 exit code)。
