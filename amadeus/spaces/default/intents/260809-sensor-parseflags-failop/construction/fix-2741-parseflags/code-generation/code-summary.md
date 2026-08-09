# Code Summary — fix-2741-parseflags

上流入力(consumes 全数): requirements.md(FR-1〜7 逐語準拠 — FR-5 は裁定 `cg-2741-q5-t519-conflict` により2本改訂へ明示改訂済み)。設計系 consumes(business-logic-model / business-rules / domain-entities / performance-design / security-design / deployment-architecture)は self-fix スコープの SKIP により不在(expected)— 代替正本は Issue #2741 クロスレビューと RE 正本。

## 実装(PR #2756、head `d93f2648c`)

- **FR-1**: `packages/framework/core/tools/amadeus-sensor-flags.ts` 新設(47行)— `requireFlagValue` の canonical 1定義(両アーム loud: end-of-arguments / next-token-flag、house idiom 文言)。`fail` は注入形で各センサーの `amadeus-sensor-<id>:` prefix を保持。複製 0 は t521 sweep で機械固定
- **FR-2〜4**: 対象7センサー(depth/question/nfr-budget、scope-sizing、answer-evidence、required-sections、pr-convergence-report-format)の parseFlags をヘルパー消費へ置換。`unit_kind:"--depth"` 受理・RS-C 完全偽 green とも再現不能化
- **FR-5**: テスト契約の明示改訂2本 — t488(名前+assert 新契約化)/ t519:264(stderr 実文言化 — 裁定 ID をテスト直上コメントに記録)。t488:688-693 / t514:645 の完全省略ピンは不変・green
- **FR-6**: 7センサーへ `fail` export 移植。**TDD Red 実測 = 7 pass / 16 fail**(budget 系が異常フラグで exit 0 を返す #2741 本体の直接証拠)→ 適用後 t520+t521 = 28 pass → 最終 t521 = 31 pass / 0 fail
- **FR-7**: 対象外4ファイル(upstream-coverage / dispatcher / linter / type-check)の diff **0行** を numstat 実測+t521 が意図コメント実在を固定

## 検証(exit code 記録)

typecheck 0 / lint 0(error 0)/ build+porcelain 0(生成物 drift なし)/ patch coverage gate pass(初回赤 → required-sections 3分岐へ in-process 負例追加 `d93f2648c` で解消 — allowlist 追加なし)/ **PR CI 13 pass / 0 fail・MERGEABLE/CLEAN**。収束スキル `github:j5ik2o-gh-pr-converge-loop` 実発動(CodeRabbit 1スレッド — レジストリ再生成指摘は `--check` OK / enumerateExportedFunctions の対象外を実測して根拠付き見送り+resolve)。transient 2件(no-silent-drop 5000ms timeout / t222 一時ファイル生成失敗)は単体再実行 green+CI pass で負荷起因と帰属。

## Q3 付随: bootstrap 遡及の実測

`git log --follow --diff-filter=A` 全7ファイル: **required-sections のみ bootstrap 由来**(`5cfb16165`、2026-07-06 — 欠陥形は当時の :58-71 に逐語実在)。他6件は intent 遡及(#1123 / #2284 / #2503 / #2699 / #2712 / #2738)— 直近3件は naive parse 様式の踏襲伝播。ラベルは Q3 裁定どおり不変、本実測を Issue #2741 へ記録する。

## 逸脱

1件・裁定済み: FR-3×FR-5 の実測衝突で builder が停止 → semi 梯子裁定 `a-revise-t519` → requirements FR-5 明示改訂 → 続行(deviation-stop の正規運用)。他になし。

## 収束

pr-convergence-report.md は plugin CLI(`report` verb)が converged 評価後に機械生成(branch guard = main 確認済み)。マージは未実施(ゲート承認後)。
