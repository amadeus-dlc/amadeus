# Code Generation Summary — u8-source-only-switch

## 結果

source-only 原子切替を [GitHub PR #2140](https://github.com/amadeus-dlc/amadeus/pull/2140) で実装し、2026-08-03 に [merge commit `c0b032b9154beb3d2a42866439ebfb87576d8111`](https://github.com/amadeus-dlc/amadeus/commit/c0b032b9154beb3d2a42866439ebfb87576d8111) として `source-only-dist` へ統合した。

生成済み distribution / self-install 面を Git index から除外し、正規ソース、6件の bootstrap/configuration allowlist、project runtime state だけを追跡する境界へ移行した。変更全体は 6,722 files（追加 6、変更 44、削除 6,672）で、削除の内訳は `dist/` 3,995、`.claude/` 589、`.kimi-code/` 523、`.codex/` 499、`.opencode/` 486、`.cursor/` 483、`.agents/` 94、旧テスト3である。大半は生成コピーの index-only 除外であり、ランタイム仕様の変更ではない。

## 消費した上流成果物

- Functional Design: `business-logic-model`、`business-rules`、`domain-entities`、`frontend-components`
- NFR Design: `logical-components`、`performance-design`、`reliability-design`、`scalability-design`、`security-design`
- Inception: `requirements`、application-design の C7/C8/C9・ADR-A8、`unit-of-work`、`unit-of-work-story-map` Slice 3、delivery-planning Bolt 7
- user-stories 成果物は本 Intent に存在しないため、Slice 3「source-only 切替」と FR-4/FR-5/NFR-1〜3 を story-to-code trace の代替正本とした。

## 実装内容

### 追跡境界と単一正本

- `.gitignore` を source-only 契約へ反転し、`dist/**` と `.agents/.claude/.codex/.cursor/.kimi-code/.opencode` の生成面を除外した。
- `SELF_INSTALL_ALLOWLIST` に source-only 生成対象述語を追加し、tracked allowlist 6件だけを境界から除外した。`.codex/hooks.json` の歴史的 `.gitattributes` 例外は BR-U8-9 どおり維持した。
- `scripts/source-only-boundary.ts` を新設し、`git ls-files -z` と生成対象述語の交差を安定順で報告する `source-only:check` を追加した。Git inventory 取得失敗も非0で終了する。
- 生成面 6,672 files は Git index から除外した。作業ツリーの生成物、per-user runtime、稼働中 worktree は削除していない。

### Source-only build と graph invariants

- `packages/framework/core/tools/data/stage-identities.json` を source-owned seed として追加し、`scripts/package.ts` が committed `dist/**/stage-graph.json` なしで graph/grid を生成できるようにした。
- `amadeus-graph.ts compile --check` を committed JSON の byte比較から semantic invariant 検査へ変更した。source compile / schema / sensor validation、全 harness の scope-grid 同値、Bolt DAG ok-path、committed graph 非依存を (i)〜(v) として検証する。
- `package.ts --check` は exit 2 と移行案内を返す廃止済みverbとし、`dist:check` と `promote:self:check` の root scripts を削除した。再現性の正本は u7 の隔離2回 build 比較である。
- `promote-self.ts` は check/apply の双方で source から harness candidate を生成してから project-local 面を比較・反映する。既存 carve-out と per-user preservation は維持した。

### CI・release・互換テスト

- CI drift job を「Source-only and graph invariants」へ変更し、source-only guard → build → graph invariant の順に実行する。typecheck、lint、distribution、plugin、tests、coverage の dist consumer に build-before-consume を補完した。
- reproducible-build は固定SHAの独立tree 2本を build し、`dist` bytes を比較する既存 u7 契約を維持した。
- release workflow は committed parity の代わりに source-only boundary と graph compile invariants を検査する。
- `detect-ci-changes.sh` は故意に追跡された `dist/*` も boundary job へ配送し、`.kiro-ide/*` を明示的に扱う。
- source-only checkout から動くよう packaging / plugin / book-pack fixture と関連契約テストを更新した。coverage は一時 `amadeus-candidate-*` harness source を canonical `packages/framework/core/**` へ fold し、分母の二重計上を防いだ。

## 主な変更ファイル

新規6件:

- `scripts/source-only-boundary.ts`
- `packages/framework/core/tools/data/stage-identities.json`
- `tests/unit/t418-source-only-boundary.test.ts`
- `tests/integration/t418-source-only-boundary.integration.test.ts`
- `tests/unit/t418-graph-compile-invariants.test.ts`
- `tests/integration/t418-graph-compile-surfaces.integration.test.ts`

主要変更:

- `.gitignore`、`package.json`
- `.github/workflows/ci.yml`、`.github/workflows/release.yml`
- `packages/framework/core/tools/amadeus-graph.ts`
- `packages/framework/core/tools/data/self-install-allowlist.ts`
- `scripts/package.ts`、`scripts/promote-self.ts`、`scripts/detect-ci-changes.sh`
- packaging / plugin / book-pack / coverage の関連テスト、coverage registry / ratchet / allowlist

削除は generated projection tree と、committed parity を前提にしていた旧テスト3件（`t-package-check-root-orphan`、`t-package-check-source-unreferenced`、`t145-packaging-parity`）である。

## 設計判断と逸脱

- BR-U8-1 の原子性を維持し、追跡除外・旧check撤去・新guard有効化・source-only bootstrapを同じ統合単位へ収めた。
- BR-U8-4 に従い、境界パターンを独立列挙せず `SELF_INSTALL_ALLOWLIST` から導出した。
- BR-U8-5 に従い、graph検査は生成物自身との比較ではなく source compile の意味的不変量を検証する。
- BR-U8-6 の falling proof は一時注入とrevertを別commitで可視化し、最終mergeには注入を残していない。
- BR-U8-8 に従い、収束中の不具合は追加fixで前進修正し、force push / 履歴rewriteは行っていない。
- 設計からの機能逸脱はない。CI収束のため、当初の中核ファイルに加えてsource-only checkoutを前提とするplugin/book-pack/coverage fixtureを追従修正したが、いずれもSlice 3のclean-checkout受け入れ条件を満たす回帰修正である。
- API、data access、database migration、frontend、deployment/IaC の変更はない。

## TDD・falling proof

- 境界guard、allowlist、graph invariants、empty candidate build を unit / integration test で固定した。
- commit `17f7e5c4c4222a74b785fc3649ad36fd52d6d432` で `dist/claude/.claude/settings.local.json.example` を故意に追跡し、`source-only:check` が exit 1 でその1件だけを報告することを実測した。
- commit `164facb76fa26db65d0f4cda395de774d1fd4e6f` で注入を除去し、`source-only:check` を clean に戻した。
- 後続修正は CI routing、fresh checkout bootstrap、integration contracts、plugin隔離、coverage正規化の順に小さく収束させた。

## 検証

### 実装時に [GitHub PR #2140](https://github.com/amadeus-dlc/amadeus/pull/2140) へ記録された検証

- `bun run build`: 成功
- `bun run source-only:check`: `source-only boundary: clean`
- `bun .claude/tools/amadeus-graph.ts compile --check`: 成功
- `bun run typecheck`: 成功
- `bun run test:ci`: 765 files、10,319 assertions、0 failures

### 復旧時のマージ済みHEAD再検証

- U8中核6 test files（t418 boundary / graph、t416 allowlist、u7 CI契約）: 26 pass / 0 fail / 138 assertions
- `tests/smoke/t05-run-tests-parallel.test.ts`: 32 pass / 0 fail / 81 assertions。candidate harness の直接foldと実LCOVからの除去を含む
- `bun run source-only:check`: `source-only boundary: clean`、exit 0

### GitHub CI

[CI run 30815745825](https://github.com/amadeus-dlc/amadeus/actions/runs/30815745825) は head SHA `4758f050f36eab1f53c2e062f1bc2c2aa7d4fc32` で 14/14 jobs completed、12 success、2 skipped、workflow conclusion `success`。

成功jobには Source-only and graph invariants、Reproducible build、Tests、Typecheck、Lint and complexity、Plugin conformance E2E、Intent Mirror distribution contract、Coverage Report群、CI Success が含まれる。skipは変更条件により不要だった Formal model check と Metrics Snapshot であり、失敗・cancelはない。

## 計画との差分

全計画ステップを完了した。実装収束中に fresh checkout、plugin fixture、coverage分母の問題がCIで顕在化したため、同じsource-only境界の範囲内で追加修正した。未完了項目、既知のBLOCKER、生成物への手編集はない。
