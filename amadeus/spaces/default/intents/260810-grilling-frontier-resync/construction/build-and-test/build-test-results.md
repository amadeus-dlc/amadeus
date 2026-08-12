# Build and Test Results

**Intent**: 260810-grilling-frontier-resync / **Stage**: build-and-test (3.6) / **Test Strategy**: Comprehensive

上流入力(consumes 全数): `code-generation-plan.md` / `code-summary.md` / `pr-convergence-report.md`(各 Unit の実装実績と builder 実測 — 本書はその conductor 側再実測)、`unit-of-work.md`(U1/U2/U3 の完了条件)、`requirements.md`(FR/NFR の受け入れ基準)、`bolt-plan.md`(Bolt ごとの検証列)。

**測定 ref**: conductor ツリー `/Users/j5ik2o/orca/workspaces/amadeus/worktree-grilling-frontier-resync-2`、branch `worktree-grilling-frontier-resync-2`、HEAD `09924674f`(Bolt 1 #2828 / Bolt 2 #2843 / Bolt 3 #2844 の main 着地を取込済み)。exit code はパイプを介さず個別取得した(cid:code-generation:no-exit-capture-through-pipe)。

## ビルド(build-instructions.md B-1〜B-4)

| # | コマンド | exit | 出力 |
|---|---|---|---|
| B-2 | `bun run build` | 0 | 全ハーネス投影を再生成(`promote-self: project-local self install updated`) |
| B-3 | `git status --porcelain` | — | packages/ docs/ tests/ に差分なし(追跡ファイル不変) |
| B-4 | `bun run source-only:check` | 0 | `source-only boundary: clean` |
| B-5 | 隔離2回ビルド再現性検査 | 0 | **CI を正**とする。Bolt 3 builder が CI `reproducible-build` job を逐語再現し 10 出力すべて `diff -qr` で byte 一致を実測(`projection-sweep/code-generation/code-summary.md`)。加えて PR #2843/#2844 の CI で当該 job が pass |

## 静的検査

| コマンド | exit | 出力 |
|---|---|---|
| `bun run typecheck` | 0 | `tsc --noEmit` × 2 tsconfig |
| `bun run lint` | 0 | 456 warnings / 17 infos(いずれも base 由来。自変更ファイルの警告 0 は Bolt 2 builder が grep で確認) |

## テスト

### 対象スコープ(unit-test-instructions U-1/U-2、integration-test-instructions I-1〜I-4)

パス集合の実在を**配列展開で事前確認**: `DECLARED=6 EXISTING=6`(cid:build-and-test:bt-path-existence-array-expansion)。

```
bun test tests/unit/t530-grilling-marker-predicate.test.ts \
         tests/unit/t199-grilling-distribution.test.ts \
         tests/integration/t531-grilling-budget-sensor.integration.test.ts \
         tests/integration/t415-interaction-budget-contract.test.ts \
         tests/integration/t517-question-budget-sensor.integration.test.ts \
         tests/integration/t199-generated-prefix-contract.test.ts
```

**exit 0 / 107 pass / 0 fail / `Ran 107 tests across 6 files`** — 期待ファイル数 6 と runner の実行ファイル数 6 が一致(cid:build-and-test:test-path-set-completeness)。

### フルスイート(I-5)

```
bash tests/run-tests.sh --ci
```

**exit 0 / RESULT: PASS**。`=== DONE ... (PASS)` = **943 ファイル** / `(FAIL)` = **0 ファイル**、**Total assertions: 13030 / Failed assertions: 0**。

test-size マトリクス(runner の派生集計): smoke 0/16/0、unit 242/162/1、integration 7/515/0、TOTAL small 249 / medium 693 / large 1。

**帰属の切り分けは不要**: 失敗が 0 件のため、cid:build-and-test:bt-20260730-2 が要求するベース比較(未改変ベースでの同一失敗集合の再現)は適用対象がない。なお Bolt 2 builder の隔離 worktree(base `a5e05d2af`)では 4 ファイルが赤で、うち 3 件は `no-silent-drop` の `BASELINE_INVALID`(ベース revision 解決依存)、1 件は `t222` の既存 flaky と帰属確定されていた — **本 conductor ツリー(main 着地後)ではいずれも解消**しており、赤が base 側の状態に依存していたという builder の帰属を独立に裏付ける。

### 申し送り(非ブロッキング)

runner が報告した wall-clock drift 7 ファイル(declared=medium / measured=large)はすべて本 intent の変更対象外(`t-codex-hooks-migration` / `t222` / `t225` / `t365` / `t49` / `t05` / `t17`)。並行負荷下の計測であり、size purity の静的判定ではなく実時間の逸脱表示である(cid:code-generation:fanout-load-settle-before-integration)。本 intent のスコープ外として別途扱う。

## 性能・セキュリティ

`performance-test-instructions.md` / `security-test-instructions.md` の判定どおり、**合否を決める数値目標を伴う性能 NFR は不在**のため専用ベンチマークは作成しない(検証劇場の回避、cid:build-and-test:c2-no-test-theatre-for-absent-nfr)。セキュリティは既存面の再利用のみ(lint / typecheck / source-only:check がいずれも exit 0、境界ガード群はフルスイート内で PASS)。依存は追加・更新なし。

## FR / NFR の充足対応

| 要件 | 担保面 | 実測 |
|---|---|---|
| FR-PROTO-1 骨格の diff 空 | Bolt 1/2 の骨格 digest | `fa5c1e5ee76b1c8f…` が Bolt 1 記録と完全一致(conductor 独立再実測、追補は overlay 側のみ) |
| FR-PROTO-4〜10 / FR-CONTRACT-1/2/5 / FR-PROJ-1 | t415 の逐語 pin | I-2 green |
| FR-CONTRACT-3 | t530 の `VALID_DEPTH_VALUES` 3値 assert | U-1 green |
| FR-CONTRACT-4 (i)(ii) / FR-PROTO-7/8 の事後検査面 | t531 の verdict 5態(落ちる実証込み)+ t517 の fail-open 封鎖 pin | I-1 / I-3 green |
| FR-CONTRACT-6 | t415 完全改訂+対角実測3方向 | Bolt 2 builder 実測((a) 10 pass / (b) 8 pass / (c) 1 fail) |
| FR-PROJ-2/3 | 語彙 sweep 述語 P1〜P7 / R2〜R4 | conductor ツリーで 0 hit を再実測(`bun run build` 後) |
| FR-PROJ-4 / NFR-2 | build 再生成・source-only・隔離2回・t199 | B-2/B-4/B-5 と U-2/I-4 が green |
| FR-DOG-1(dogfood 実走) | **未実施** — 下記 verdict 参照 |

## Verdict: 条件付き READY

すべての宣言済みゲート(build / static / unit / integration / フルスイート)が exit 0 で、FR-PROTO・FR-CONTRACT・FR-PROJ 系は上表のとおり実測で充足している。

**条件(未検証面の明示、cid:build-and-test:verdict-names-unverified-facets)**: **FR-DOG-1(dogfood 実走による会話時の遮断器発火の検証)は本ステージで未実施**。これは BLOCKER B のユーザー裁定(2026-08-10)で「FR-PROTO-8 AC の機械面は C3 センサーの事後検査の落ちる実証で充足し、**会話時の遮断器発火自体の検証は FR-DOG-1 が担う**」と確定した面であり、受け入れ基準の内側にある(cid:build-and-test:no-silent-scope-narrowing により conductor 判断でスコープ外にはしない)。実走は grilling を実際に走らせる運用行為であり、本ステージのコマンド実行では代替できない。**operation フェーズは本スコープで SKIP のため、実走の実施時期はゲートでユーザーへ諮る。**
