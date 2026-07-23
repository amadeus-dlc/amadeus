# Requirements — 260723-t241-ci-residency

上流入力(consumes 全数): business-overview、architecture、code-structure。

## Intent 分析

FR-0 二層証明の CI 層(ADR-6 layer (i) — 「AI が手順知識を持たなくても選挙を完走できる」ことの決定的・常設証明)を、**表明どおり PR CI で常時実行される状態へ回復**したい。現状は `tests/e2e/t241-election-machine-executor.test.ts:1` が「CI-resident」を自称する一方、`--ci`(= `test:ci` / `coverage:ci`)は smoke+unit+integration のみ(`tests/run-tests.ts:197-202`)で e2e を実行せず、全 workflow(ci.yml / release.yml / formal-verification.yml)に `--e2e` / `--release` は 0ヒット — 常時証明が実質不在(Issue #1294、bug / P2 / S3-MAJOR、クロスレビュー2名成立)。architecture(codekb)の current view「FR-0 機械実行器の CI-resident 表明とテスト tier 配置の乖離」に実測記録済み。

- 原因所在: intent 260718-election-ts-foundation(PR #1235)の実装逸脱 — ADR-6(`decisions.md:44`)は layer (i) を「integration テストで固定する」と明記(verbatim 裏取り済み)。設計は正、実装が e2e 配置で CI 範囲との整合検証を欠いた。#1294 へ転記済み
- 業務境界: business-overview(codekb)のとおり業務ドメインに構造変化はなく、本 intent はテスト配置・CI 実行範囲の内部整合の回復に限定される。ゴールは文書化済み設計(ADR-6)への回復であり bugfix スコープの範囲内。t237(walking-skeleton)は「Layer: e2e」正直宣言で矛盾なし — 対象外

## 機能要件(FR)

- **FR-1(修正方式)**: **t241 を `tests/integration/` へ移設**する(E-TCRRAQ1 裁定 A、3-0、GoA 1x3、留保なし)。ADR-6(decisions.md:44)の「integration テストで固定する」への実装回復であり、ヘッダの layer 表記・coverage registry・runner 実行対象の随伴整合を含む(裁定文に明記)。受容度記録: 全票 B=6 / C=7〜8(e5 は C=8 ブロック級 — C 案の仕様後退への強い拒否が記録された)
- **FR-2(整合の全数回復)**: 採用方式の下で「ヘッダ表明・テスト配置・CI 実行範囲」の3点が矛盾なく整合すること。整合対象は上流 code-structure.md:10 の伝播候補列挙を全数採用する: (a) ヘッダの layer/tier 表記 (b) coverage registry(`tests/gen-coverage-registry.ts` の `EXPECTED_NONE_TO_CLI` 含む) (c) runner の実行対象 (d) **ファイル名 suffix 慣習** — 既存 integration 兄弟6本は全数 `*.integration.test.ts`(grep 実測)であり、移設時は同 suffix へ rename する (e) **docs 面** — `docs/reference/09-testing.md` を含む対象語彙(t241 / e2e 層 / CI-resident)の repo 全域 grep で docs 対象面を棚卸しし、該当があれば同一 PR で更新、0件なら 0件を成果物に記録する(cid:enumeration-completeness-review 追補 E-SDE-FD の走査範囲)。すべて同一 PR で整合させる(cid:fixture-propagation-grep)
- **FR-3(常時証明の実効性)**: 修正後、t241 が PR CI(`test:ci` 経路)で実際に実行されることを、宣言でなく実行痕跡(CI の実行ログ or ローカル `--ci` 実行での pass 実測)で確認する — 表明と実行実態の乖離(検証劇場隣接クラス)を再発させない
- **FR-4(size purity 整合)**: 配置変更を伴う場合、`classifyTestSize` の静的判定(spawn 型 → medium)が移設先 tier の上限に適合することをローカルで実測してから push する(RE 実測: integration MAX=medium で clean、precedent 6本)

## 非機能要件(NFR)

- **NFR-1(回帰テスト)**: 本欠陥クラス(「CI-resident 表明を持つテストが --ci 実行対象外の層に置かれる」)の再発をガードする決定的検査を検討し、導入可否と根拠を成果物に記録する(導入は必須としない — 落ちる実証と両側 sweep を伴う場合のみ完成扱い: Mandated「落ちる実証」+cid:corpus-sweep-for-new-guards)
- **NFR-2(既存 CI green)**: `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` を green に保つ。t241 自体が移設後スイートで green であること(94 tests 級の全数実行確認 — cid:test-path-set-completeness)
- **NFR-3(非交差)**: packages/framework/・dist/ に触れない見込み(tests/ と必要なら .github/workflows のみ)。dist:check / promote:self:check で非交差を確認
- **NFR-4(CI 予算)**: PR CI の実行時間増分を実測し、増分が **+60 秒超**(基準: 直近 PR #1391 の typecheck-lint-drift-tests ジョブ実測 4m25s = 265s に対し約 +23%)の場合は成果物に記録して gate で申告する(60 秒は t241 単体の spawn 実行が数秒オーダーである RE 実測から十分な余裕側に置いた申告閾値であり、fail 条件ではない)

## 制約

- bugfix スコープ(Minimal): 外科的最小変更。FR-0/ADR-6 の意図(常時証明)自体は変更しない — それを変える案(C 系)は仕様変更でありユーザー裁定事項
- t237・他の e2e テストの移設キャンペーンはしない(対象は t241 の矛盾解消のみ)
- 260718-election-ts-foundation の他の成果物(選挙 CLI 本体)には触れない

## 前提

- ADR-6 の原文(decisions.md:44)が layer (i) の配置権威(verbatim 確認済み)
- integration 層の spawn テスト precedent 6本と size purity 適合は RE 実測済み(re-scans/260723-t241-ci-residency.md)

## Out of scope

- t237 の層変更・表明変更(矛盾なし)
- e2e 層全体の CI 編入方針の一般化(本 intent は t241 単独)
- FR-0 受け入れ実演層(layer (ii))への変更

## Open questions

- NFR-1 のガード導入可否(requirements では検討義務のみ固定、結論は design/実装段)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-23T01:26:04Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の Major1(FR-2 伝播候補 2/3 欠落)+Minor2(business-overview 装飾トークン、NFR-4 非数値閾値)を是正し、iteration 2 で全件独立再実測(code-structure:10 全数一致、suffix 6本 grep、gh pr checks 265s、fix-diff 再照合)により READY

### Findings

- None
