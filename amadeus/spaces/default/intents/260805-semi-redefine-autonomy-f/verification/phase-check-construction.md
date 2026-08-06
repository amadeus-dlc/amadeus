# Phase Boundary Verification — Construction

intent: `260805-semi-redefine-autonomy-f`(#2253)
測定 ref: conductor クローン `conductor/2253-autonomy-flag` HEAD `74b70f40b`
検証方法: `.claude/knowledge/amadeus-shared/verification.md` の traceability チェック。数値はすべて下記コマンドの実出力からの転記。

## 1. Construction → Operation の境界チェック

方法論が要求する 3 点は「全 Unit がビルド・テスト済み」「CI パイプライン構成済み」「インフラ設計済み」。本 intent のスコープ(`self-feature`、EXECUTE 14 ステージ)では `ci-pipeline`(3.7)と `infrastructure-design`(3.4)が SKIP されているため、該当分は非適用として根拠を明記する。

| チェック | 結果 | 根拠 |
|---|---|---|
| 全 Unit がビルド済み | ✅ | `bun run build` exit 0。7 Unit すべての実装が main へ着地(PR #2293 / #2294 / #2295 / #2316 / #2317 / #2318 / #2321) |
| 全 Unit がテスト済み | ✅ | `bash tests/run-tests.sh --ci` exit 0 / `RESULT: PASS`(pass 11,494 / fail 0、819 ファイル・11,487 テスト)。intent 追加の 13 テストファイルは個別に PASS |
| CI パイプライン構成済み | N/A(スコープ除外) | `ci-pipeline`(3.7)は self-feature スコープで SKIP。既存の `.github/workflows/ci.yml` が本 intent の変更面(typecheck / lint / tests / coverage / source-only / reproducible build)を既にカバーし、7 PR すべてがその上で green を通過している |
| インフラ設計済み | N/A(スコープ除外) | `infrastructure-design`(3.4)は SKIP。本プロジェクトはアプリケーション配備基盤を持たず、配布は npm パッケージ・GitHub Release Asset・セルフインストールツリー。本 intent は配布面の構造を変更していない |

## 2. 要件 → 設計 → 実装のトレーサビリティ

requirements.md から機械抽出した要件 ID は **33 件**(`grep -ohE "\b(FR|NFR)-[A-Z]+-[0-9]+[a-z]?\b" | sort -u`)。

**結果: 33 / 33 が construction 成果物へ trace 済み。未 trace ゼロ。**

照合コマンド(各 ID について construction ツリー全域の `*.md` を検索し、hit 0 の ID を未 trace とする):

```
grep -rl "<ID>" <record>/construction --include="*.md"
```

うち 13 件は `code-generation/` の成果物(plan / summary)に直接現れ、残る 20 件は `functional-design/` および `nfr-design/` の設計成果物側に現れる。設計層のみに現れる ID は、その Unit の code-summary が設計成果物を consumes として参照する形で実装へ接続している。

## 3. 孤児成果物のチェック

| 観点 | 結果 |
|---|---|
| 要件を持たない設計 | 検出なし。7 Unit すべてが `unit-of-work.md` の Unit 一覧に対応し、各 Unit は責務・含むコンポーネント(C8 / C12-C14 / C18 等)を宣言している |
| 設計を持たない実装 | 検出なし。7 Unit すべてに `functional-design/` と(docs 専任の `semi-docs-revision` を除き)`nfr-design/logical-components.md` が存在 |
| 成果物が欠落した Unit | 検出なし。7 Unit すべてに `code-generation/code-generation-plan.md` と `code-summary.md` が実在 |

## 4. Phase 出力の整合性

| 面 | 結果 |
|---|---|
| build-and-test の produces | 宣言 7 / 実在 7(機械照合 `DECLARED=7 EXISTING=7`) |
| 宣言センサー | 自 intent の 7 成果物に対し `SENSOR_FIRED` 14 / `SENSOR_PASSED` 14 / `SENSOR_FAILED` 0(required-sections × 7、upstream-coverage × 7)。同 stage slug で観測される他 3 件の `SENSOR_FAILED` は 2026-08-05T12:28-12:29Z の別 intent(`260805-pr-convergence-plugin`、別 worktree)の発火が本 shard に記録されたもので、Output path で切り分け済み |
| 静的ゲート | typecheck / lint / source-only:check / complexity-gate すべて exit 0 |
| formal-model-check advisory | ladder の run-now 裁定に従い相関 3 フラグ付きで実行 → `NOT_DETECTED`(exit 0、反例なし、runId `ef9a54da-80de-4ecf-97ec-f39eba17036f`)。実行後 `next` の再実行で advisory 解消を実測 |

## 5. 検証で提示すべき不整合

**なし。** 上記 §1-§4 に fail は存在しない。

## 6. 申し送り(Operation フェーズは本スコープでは非実行)

本 intent のスコープは Operation フェーズ全体(4.1-4.7)を SKIP する。したがって本境界は「Construction の完了確認」であり、Operation への実引き渡しは発生しない。

- **#2330(OPEN, bug/P1/S2)**: advisory choice store の schema 1→2 移行経路の不在。本 intent では machine-local store の退避で回復(人間裁定は audit seq 239 / 1071 に実在)。恒久修正は未着手。
- **#2354 → [#2355](https://github.com/amadeus-dlc/amadeus/pull/2355) マージ済み**: CG approve の plan drift ガードが batch 番号のみで突合していた偽拒否。本境界に到達するために必要だった修正であり、Unit 名キー + 両側グループ照合へ是正して着地。
- **#1953(OPEN)**: 同ガードの偽 pass 方向(replan 後の stale 実績受理)。射程外で不変。
