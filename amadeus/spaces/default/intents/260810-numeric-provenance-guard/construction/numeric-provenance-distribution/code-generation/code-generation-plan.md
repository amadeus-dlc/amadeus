# Code Generation Plan — numeric-provenance-distribution

## 実装方針

U2 の runtime 意味論は変更せず、既存 build と self-install promotion の公開境界から配送同値性を検証する。配送対象は harness registry、各 manifest、self-install registry から解決し、生成 tree の directory 走査や最初に見つかった entrypoint へ依存しない。

## 実装手順

- [x] **Step 1 — 配送 target resolver:** `PACKAGE_HARNESS_IDS`、`SELF_INSTALL_HARNESS_IDS`、各 harness manifest、既存 package/self-install 集合を exact-set 検証し、package root と self-install root を安全に解決する。重複、unknown ID、manifest 名不一致、絶対 path、`..` root 脱出は closed failure とする。→ DS-5、FR-DIST-1、NFR-4
- [x] **Step 2 — package projection 統合テスト:** CI が統合テスト前に公式 producer で生成した全 package harness を入力とし、core tool・manifest の raw bytes、manifest metadata、`harness.json`、stage graph の enforcement stage exact set を検証する。→ DS-1〜5、FR-DIST-1、FR-TST-1、NFR-1
- [x] **Step 3 — self-install fire 統合テスト:** 検証済み package tree を専用 temporary project root へ既存 `promoteSelfMain(..., --no-build)` で投影し、全 self-install harness の固定 dispatcher から正負 fixture を fire する。各 fire の `SENSOR_FIRED` と `SENSOR_PASSED` / `SENSOR_FAILED` が同一 fire ID で audit 終端へ到達することを確認する。→ DS-1〜3/5、FR-DIST-2、FR-TST-2〜3、NFR-1〜2
- [x] **Step 4 — CI/source-only 収束:** focused test、typecheck、lint、source-only、graph invariant、再現性 build、complexity、CI test 集合を実測し、生成面を commit 対象へ含めない。→ DS-5〜6、FR-DIST-3、NFR-3〜4
- [x] **Step 5 — 記録:** 実装ファイル、配送 receipt、検証結果、計画逸脱を `code-summary.md` に記録する。→ DS-5、FR-DIST-3

## TDD seam

- Red: 未実装の配送 target resolver を integration test から import し、対象集合を検証できない失敗を確認する。
- Green: exact-set と path containment に必要な最小 resolver を実装する。
- Vertical completion: package projection、self-install positive fire、self-install negative fire の順に observable behavior を追加する。

## 対象ファイル

- `scripts/numeric-provenance-distribution.ts`
- `tests/integration/t533-numeric-provenance-distribution.integration.test.ts`
- `construction/numeric-provenance-distribution/code-generation/code-generation-plan.md`
- `construction/numeric-provenance-distribution/code-generation/code-summary.md`

既存 Bun test runner と integration tier を使用するため、新しい test configuration と runtime dependency は追加しない。
