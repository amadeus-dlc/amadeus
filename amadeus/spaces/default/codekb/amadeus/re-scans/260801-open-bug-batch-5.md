# RE 差分リフレッシュ記録: 260801-open-bug-batch-5

上流入力(consumes 全数): なし(RE は起点ステージ。入力は intent-statement とクロスレビュー済み Issue 9件)

- Date: `2026-08-01T01:30:00Z`
- Base commit: `da51af375`(observed の祖先、`git merge-base --is-ancestor da51af375 HEAD` exit 0)
- Observed commit: `c49e385ac7b787ce151ab0f077943620bd8bf7e2`(origin/main tip、`record: sync intent 260731-perf-ci-separation ... (#1862)`)
- Distance: `11 commits`
- 区間規模: `3408 files changed, 176368 insertions(+), 18008 deletions(-)` — 大半は `771afe2a2`(#1850 OTel 統合)の dist 7面+self-install 投影。ソース面の実変化は OTel モジュール群(`packages/framework/core/otel/` 18ファイル)と perf CI 分離4 Bolt(#1848/#1851/#1855/#1859)、norm 2件(#1843/#1847)
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`
- Scan mode: **クロスレビュー成果の直接採用+conductor スポット再実測**。9 Issue すべてに独立2名のクロスレビュー verdict(計18コメント、全件検証 SHA = `c49e385ac` = 本 RE の observed)が投稿済みのため、Developer scan の実体はレビューコメント群であり、conductor が患部6箇所の verbatim スポット再実測と区間 touch 判定で二重化した(Developer 用 Explore subagent は Stop hook 下で回収不能となり c5/disk-evidence 引き取り — 検証省略なし)
- 既存 open PR 棚卸し(`cid:reverse-engineering:c1-preexisting-pr-inventory`): 9 Issue すべて `gh pr list --state open --search "<n> in:title,body"` で **0 件** — 引き取り対象なし、全件新規実装

## 対象9件の患部確定(全引用 = observed `c49e385ac` で検証済み)

### Bolt 1: mirror クラスタ

**#1838(P1/S2)create が境界の applicable-operations に無条件先行**
- `packages/framework/core/tools/amadeus-mirror-policy.ts:66` — `"intent-capture-approved": ["create"]` に `sync` 欠落(conductor 再実測で verbatim 確認: 直上 `:60-65` のコメントは intent-initialized の create+sync 併記理由を説明しており、`:66` だけ非対称)
- `amadeus-mirror-coordinator.ts:235` 近傍 — operationForBoundary が create を無条件先行
- reducer 対称化面: `amadeus-mirror-state-reducer.ts` の遷移ガード群
- クロスレビュー: [#1838 r1/r2 とも ESTABLISHED_W_REF](https://github.com/amadeus-dlc/amadeus/issues/1838) — 修正4面(coordinator/policy/事前ガード/reducer 対称化)+順序制約

**#1860(P1/S2)close receipt `prepared` 滞留で completion 恒久ブロック**
- 主患部: `amadeus-mirror-executor.ts:1259-1266` close 短絡 — `complete()` へ直行し `mark-attempted` を挟まない(conductor 再実測 verbatim: `ensured.receipt.status !== "prepared"` を最終引数に渡しつつ状態前進なし)
- 第2欠陥(同一 PR で修正): `executor:527` の `applyTransition` 戻り値破棄 × `reducer:557-558` `mark-pending: only allowed from 'attempted'` — 回復記録が発行不能かつ無音
- 正解実装の対照: `adoptCreateCandidate`(`executor:674-689`)は prepared なら markAttempted を先に発行(`cid:requirements-analysis:symmetric-pair-review`)
- reducer 側に修復遷移は既存(`guardMarkAttempted:692-696` が prepared 受理)— 修正対象は executor
- テスト空白: t279 は `state:"CLOSED"` × `status:"prepared"` の組み合わせ fixture を持たない — 落ちる実証はこの組で
- クロスレビュー: [r1 VALID GoA1 / r2 READY GoA2](https://github.com/amadeus-dlc/amadeus/issues/1860)。P1 昇格はユーザー裁定済み(2026-08-01)

### Bolt 2: engine/state

**#1846(P1/S3、origin:bootstrap)birth scaffold に Construction Autonomy Mode フィールド欠落**
- `amadeus-utility.ts:4461-4472` 近傍の birth scaffold(区間内 #1850 が同ファイルを touch したが scaffold 部は不変 — conductor 再実測で `:4461` に scaffold 冒頭を確認)
- 正準位置: `state-template.md:93` `## Current Status` 配下
- `setFieldStrict`(`amadeus-bolt.ts:816`)が Field not found で拒否 → set-autonomy 不能
- 修正同梱: t33 pin 改訂
- クロスレビュー: [ESTABLISHED_W_REF](https://github.com/amadeus-dlc/amadeus/issues/1846)

**#1849(P2/S3)合成後の既存 intent で report が checkbox 行欠落により拒否**
- `amadeus-orchestrate.ts:4405-4411` — `checkboxForSlug` null で `Stage "<slug>" is not present in the state file` を emit して return(conductor 再実測 verbatim 確認)
- 非対称: next 側 `checkboxStateOf:3622-3627` は行欠落で undefined を返し寛容通過
- 機序裁定(要件段、REFRAME_REQUIRED): r1「ガードは設計どおり — 真の欠陥は単発 directive の single マーカー欠如(`:1310-1312`)」vs r2「compose が state を再構築しない欠陥 — scope-change の再構築ロジック(`amadeus-utility.ts:5178-5218`)を再利用」。両者の事実認定は矛盾なし
- 同根: `setCheckbox`(`amadeus-lib.ts:5335-5347`)行欠落時無言 no-op / `recompose --add` は回復経路にならない / 終端 record への追補は禁止(`amadeus-utility.ts:5316-5330`)
- **修復サブタスク入力(conductor 実測 2026-08-01)**: `260729-otel-upstream/amadeus-state.md` — `:28` Total Stages 18 / `:29` Completed 19 / `:38` Workflow Completion Stage formal-model-check / `:84` 手挿入 `[x] formal-model-check — EXECUTE` 行。Total・Stages to Execute 未再計算の skew が現存
- クロスレビュー: [REFRAME_REQUIRED](https://github.com/amadeus-dlc/amadeus/issues/1849)

### Bolt 3: OTel

**#1856(P2/S3)fatal-latch が emit 経路で不参照(部分配線)**
- `packages/framework/core/otel/bootstrap.ts:72-73` / `fatal-latch.ts` / `logger-provider.ts:67-110`(emit 時に latch 不参照)
- 要件段で仕様裁定必須(latch の意味論: 停止 vs 縮退)+テスト pin 改訂
- S は裁定済み S3-MAJOR 維持(2026-08-01 ユーザー裁定、r1=S2/r2=S3 の割れを解消)
- クロスレビュー: [ESTABLISHED_W_REF](https://github.com/amadeus-dlc/amadeus/issues/1856)

**#1857(P3/S4)session-end の registerTracerProvider 直呼び(latent)**
- `packages/framework/core/hooks/amadeus-session-end.ts:80-81`(conductor 再実測 verbatim: `ensureContextManager();` + `registerTracerProvider({...})`)→ `ensureTracerBootstrap(projectDir)`(`bootstrap.ts:108-116`)への2行→1行置換
- throw 側: `tracer-provider.ts:205`(r1 引用 `:194-196` は旧位置、r2 の `:204-206` 系が正 — conductor grep で `:205` 確定)
- 両レビュアー一致: **現行経路で throw は発火しない latent**。修正価値は将来変更耐性
- 無音 catch `:109-111` は recordHookDrop を呼ばない(先行 catch `:65-67` と非対称)
- 同期面: 正本1+dist 7+self-install 1 = 9コピー、`bun scripts/package.ts` + `bun run promote:self` 必須
- 既存テストの pin なし(t30 に tracer/relay 参照なし)— 回帰テスト新設
- クロスレビュー: [ESTABLISHED_W_REF、S4 付与済み](https://github.com/amadeus-dlc/amadeus/issues/1857)

### Bolt 4: drift

**#1863(P2/S3、再スコープ済み 2026-08-01)lossy drop→compose+CI に repo 断面 compile --check 無し**
- 欠陥1: `amadeus-graph.ts:1405-1411` `mergeComposedScopes` の `knownSlugs` フィルタ(conductor 再実測 verbatim: `if (knownSlugs.has(slug)) kept[slug] = action;`)— drop 後の compose で plugin セルが無音恒久消失、復旧経路なし
- 欠陥2: `compile --check`(`:2523-2529`)は fixture 一時ツリーのみで CI 実行 — 実リポジトリ断面へのジョブが `.github/workflows/` に不在
- 旧差分1(category 欠落)は #1850 で解消済み・挙動影響ゼロ、旧差分2 は誤診断 — Issue 本文は再スコープ済み
- クロスレビュー: [r1 REVISE→再スコープで解消 / r2 CONFIRMED W/ CORRECTIONS](https://github.com/amadeus-dlc/amadeus/issues/1863)

**#1864(P3/S4)coverage-patch-allowlist :1838 転位エントリ**
- 修正 = **`tests/.coverage-patch-allowlist.json` の `scripts/formal-verif/fs-tlc-toolchain.ts:1838` エントリの削除のみ**(再ピンではない — 正しい `:1861` 双子が `allowlist:1708-1712` に既存、再ピンは重複化する)
- 転位導入: `8bb81c2e7`(#1745、+23行、allowlist 未更新)。重複化: `771afe2a2`(#1850 が 1861 を追加・1838 残置)
- r2 の全344件スイープで同型21件検出 → **#1622(P1 open)の材料として Issue コメントに提供済み**。述語修正は #1495 スコープ — 本バッチでは扱わない
- クロスレビュー: [ESTABLISHED_W_REF](https://github.com/amadeus-dlc/amadeus/issues/1864)

### Bolt 5: metrics

**#1861(P2/S3)publication 検証の TOCTOU 偽赤**
- 患部: `scripts/metrics-publication-github.ts:119-134` `loadRemoteBranch` の fetch(ls-remote `:341` との間が race window)→ throw が `problems` へ(`:346-352`)→ `metrics-publication-domain.ts:453-462` が `inventory.problems.length > 0` を無条件 terminal 化(deadline 270s/poll 5s 不消費)
- 実害: `domain.ts:536-540` で maintenance dispatch スキップ → retention 削除+`metrics/index.html` 再生成が走らず stale(実測: 今回分 sha12 が index.html に 0 hit)
- 再発性: #1761 着地後 実行13回中2回(約15%)
- maintenance 経路の同一欠陥も同 PR で修正: `github.ts:500-507` / `domain.ts:587-591`
- 修正方向(両レビュアー収斂): 「消えた ref」を transient 不在として分類し候補除外+再ポーリング。landed 判定は実装済みで流用可。pin テスト衝突なし(t222 の pin は hasTerminalPullRequest 側のみ)
- 原因所在: PR #1761 / intent 260730-metrics-pr-conflicts の requirements 列挙漏れ
- P2 昇格はユーザー裁定済み(2026-08-01)
- クロスレビュー: [r1 CONFIRMED / r2 CONFIRMED W/ CORRECTIONS](https://github.com/amadeus-dlc/amadeus/issues/1861)

## 区間 touch 判定(患部16ファイル × da51af375..HEAD)

- **不変(9)**: mirror 4ファイル(coordinator/policy/executor/state-reducer)、amadeus-graph.ts、metrics-publication-github.ts、metrics-publication-domain.ts — クロスレビュー引用そのまま有効
- **#1850 のみが touch(7)**: amadeus-utility.ts / amadeus-orchestrate.ts / amadeus-lib.ts / amadeus-bolt.ts / otel 3ファイル / amadeus-session-end.ts / allowlist — **全クロスレビューが #1850 着地後の `c49e385ac` で検証済みのため行番号シフトの再解決は不要**(`cid:reverse-engineering:upstream-cite-reresolve-on-shift` の適用対象外であることを実測確認)

## Bolt 間交差判定(ファイル単位)

- Bolt 1(#1838+#1860): mirror 4ファイルを共有 → **Bolt 内直列**(同一 builder が続けて実施 or 単一 worktree)
- Bolt 2(#1846: utility/bolt/state-template ⇔ #1849: orchestrate/lib/utility): **amadeus-utility.ts で交差** → Bolt 内直列
- Bolt 3(#1856: otel/bootstrap+fatal-latch+logger-provider ⇔ #1857: hooks/session-end+otel/bootstrap): **bootstrap.ts で交差** → Bolt 内直列
- Bolt 4(#1863: amadeus-graph.ts+ci.yml ⇔ #1864: allowlist のみ): 非交差 → Bolt 内並行可
- Bolt 5(#1861: scripts/metrics-publication-*): 全 Bolt と非交差
- **Bolt 間**: 1/2 は dist 再生成面(core/tools)で衝突しうる → dist regen はマージ順に直列。3 は otel/hooks 面、4 の graph.ts は core/tools — Bolt 2 と非交差(ファイル単位)。5 は scripts/ のみで dist 非対象
- 並行度: 同時アクティブ builder ≤4(team.md)、mirror クラスタ優先着地

## テスト採番予約(`cid:code-generation:swarm-test-number-reservation`)

現最大 `t390`。予約: `t391`(#1838)/ `t392`(#1860)/ `t393`(#1846)/ `t394`(#1849)/ `t395`(#1856)/ `t396`(#1857)/ `t397`(#1863)/ `t398`(#1861)。既存テスト拡張で足りる場合は予約を消費せず返上(候補: #1860→t279 拡張、#1861→t222 拡張、#1864 はデータ修正のみでテスト不要 — patch gate 自体が検証)。

## 要件段へ送る裁定事項

1. **#1849 機序裁定**: (A) compose 時の state 再構築(scope-change ロジック再利用、Total/Stages to Execute 再計算込み、終端 record 除外、クロスホスト対応)vs (B) 単発 directive の single マーカー付与。事実認定は両立 — 修正方向のみ未決
2. **#1856 仕様裁定**: fatal-latch の emit 時意味論(latch 後の emit を drop するか縮退させるか)
3. **#1838 修正4面の順序制約**: レビューコメント記載の順序(ガード先行)を要件へ転記
