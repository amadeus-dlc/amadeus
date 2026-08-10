# Code Generation Plan — numeric-provenance-distribution

## 実装方針

U2 の runtime 意味論は変更せず、既存 build と self-install promotion の公開境界から配送同値性を検証する。配送対象は harness registry、各 manifest、self-install registry から解決し、生成 tree の directory 走査や最初に見つかった entrypoint へ依存しない。

## 実装手順

- [x] **Step 1 — 配送 target resolver:** `PACKAGE_HARNESS_IDS`、`SELF_INSTALL_HARNESS_IDS`、各 harness manifest、既存 package/self-install 集合を exact-set 検証し、package root と self-install root を安全に解決する。重複、unknown ID、manifest 名不一致、絶対 path、`..` root 脱出は closed failure とする。→ DS-5、FR-DIST-1、NFR-4
- [x] **Step 2 — package projection 統合テスト:** CI が統合テスト前に公式 producer で生成した全 package harness を入力とし、core tool・manifest の raw bytes、manifest metadata、`harness.json`、stage graph の enforcement stage exact set を検証する。→ DS-1〜5、FR-DIST-1、FR-TST-1、NFR-1
- [x] **Step 3 — self-install fire 統合テスト:** 検証済み package tree を専用 temporary project root へ既存 `promoteSelfMain(..., --no-build)` で投影し、全 self-install harness の固定 dispatcher から正負 fixture を fire する。harness ごとに (1) manifest discovery、(2) 正負 verdict、(3) sensor ID・stage・output path・fire ID の audit 対応、(4) advisory severity・stage graph exact set、(5) package と self-install の tool／manifest raw bytes 一致を確認する。→ DS-1〜3/5、FR-DIST-2、FR-TST-2〜3、NFR-1〜2
- [x] **Step 4 — CI/source-only 収束:** focused test、typecheck、lint、source-only、graph invariant、complexity、CI test 集合を実測する。再現性 job は A/B の project root・node_modules・cache・HOME・TMPDIR・dist root を分離し、`env -i` の明示 allowlist、frozen lockfile digest 不変、生成物の relative path・file type・executable bit・raw bytes 一致を検証する。生成面は commit 対象へ含めない。→ DS-5〜6、FR-DIST-3、NFR-3〜4
- [x] **Step 5 — 記録:** 実装ファイル、配送 receipt、検証結果、計画逸脱を `code-summary.md` に記録する。→ DS-5、FR-DIST-3

## TDD seam

- Red: 未実装の配送 target resolver を integration test から import し、対象集合を検証できない失敗を確認する。
- Green: exact-set と path containment に必要な最小 resolver を実装する。
- Vertical completion: package projection、self-install positive fire、self-install negative fire の順に observable behavior を追加する。
- Review BLOCKER Red: CI workflow 契約テストで、隔離環境・lockfile 不変・実行権限差検出が欠ける状態を `8 pass / 3 fail` として確認する。生成済み install state の preflight は追加 slice で `10 pass / 1 fail` を確認する。
- Review BLOCKER Green: reproducible-build job の縮退環境、digest guard、metadata comparison、preflight を最小実装し、同契約テストを `11 pass / 0 fail` にする。

## 対象ファイル

- `scripts/numeric-provenance-distribution.ts`
- `.github/workflows/ci.yml`
- `tests/integration/t-ci-build-before-test.integration.test.ts`
- `tests/integration/t533-numeric-provenance-distribution.integration.test.ts`
- `construction/numeric-provenance-distribution/code-generation/code-generation-plan.md`
- `construction/numeric-provenance-distribution/code-generation/code-summary.md`

既存 Bun test runner と integration tier を使用するため、新しい test configuration と runtime dependency は追加しない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T18:04:06Z
- **Iteration:** 1
- **Scope decision:** none

U1→U2→U3 の責務・依存方向と配送 target resolver は非循環で整合している。しかし、U3 が所有する必須の再現性証拠と self-install 配送同値性証拠が、authoritative pass-list 上では不足している。

### Findings

- BLOCKER | `security-design.md` の Deterministic build boundary／Verification matrix は、独立した project root・node_modules・cache・HOME・TMPDIR・dist root、frozen lockfile、環境 allowlist、および relative path・file type・executable bit・raw bytes の一致を要求する。最新版 `code-summary.md` が記録する証拠は `find` による各428 filesの列挙と `diff -qr` のみであり、実行権限、隔離条件、lockfile不変、環境縮退を検証できない。CI job成功という集約結果だけでも再現不能であり、U3の完了証拠契約を満たさない。
- BLOCKER | `security-design.md` の Delivery-tree acceptance item 5 は、各 `SELF_INSTALL_HARNESS_IDS` 配送面について tool／manifest bytes が対応するbuild outputと一致すること、および5項目のharness別receiptを要求する。一方、`code-generation-plan.md` と最新版 `code-summary.md` はraw-byte検証をpackage harnessにだけ記録し、self-install面ではpromotion後の正負fireとaudit終端しか記録していない。この状態では、機能fireが通る範囲のself-install driftを検出できず、明示された配送同値性契約を満たしたと判定できない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T18:13:10Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の2件のBLOCKERは閉包された。再現性検査はA/B間でproject root・node_modules・cache・HOME・TMPDIR・dist root・install stateを分離し、環境allowlist、frozen lockfile digest不変、relative path・file type・executable bit・raw bytes一致を検証した証拠が記録されている。self-install配送同値性も全5 harnessについて、tool／manifest raw bytesを対応package出力と比較し、discovery・正負verdict・audit対応・advisory/graphを含むharness別receiptが記録されている。focused tests、実workflow step、blocking CIはいずれも成功しており、U3の完了証拠契約を満たす。

### Findings

- None
