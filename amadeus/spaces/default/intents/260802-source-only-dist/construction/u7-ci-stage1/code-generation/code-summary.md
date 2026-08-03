# Code Generation Summary — u7-ci-stage1

## 結果

u7 の段階1として、root の正規 build コマンド、CI の build-before-test、test runner の dist presence guard、独立tree 2本による再現性検査を実装した。既存の drift checks は u8 の原子切替まで維持している。

ただし、`dist/` を持たない fresh clone からの bootstrap build は本 Unit では未充足である。現行 `scripts/package.ts` の `seedCompiledData` は compile seed を既存の `dist/<harness>/<dir>/tools/data/stage-graph.json` と fallback の `dist/claude` からのみ取得するため、root `dist/` を除外したtreeでは graph compile が `stage-graph.json` の `ENOENT` で失敗する。u7 の Functional Design が定める Stage 1 境界と親判断に従い、tracked dist seed を意図的に残した。u8/C8 で source-owned bootstrap seed または同等の packaging 再設計を行い、その後に tracked `dist/` の削除と clean-dist guard を有効化する必要がある。

## 消費した上流成果物

- Functional Design: business-logic-model、business-rules、domain-entities、performance-design、security-design、unit-of-work、requirements
- 補助設計: application-design の C7 段階1、unit-of-work-story-map の Slice 2、delivery-planning の Bolt 6
- 実装規約: project/team rules、Code Generation stage protocol、developer/shared knowledge、TDD skill

## 実装内容

- `package.json`: `bun run dist && bun run promote:self` を正規の `bun run build` として追加した。
- `.github/workflows/ci.yml`: dist を消費する head jobs で install 後・test 前に build を実行する。merge-base coverage は移行前commit向けfallbackを持つ。固定 `GITHUB_SHA` の独立tree A/Bを直列buildし、`diff -qr` で生成bytesを比較する blocking job を追加した。
- `tests/run-tests.ts`: root `dist/` が不在または空なら exit 1 と一元化した build 案内を返す fail-closed guard を追加した。
- `tests/integration/t-ci-build-before-test.integration.test.ts`: build alias、CI順序、merge-base fallback、独立tree、byte差、presence guard、旧drift checksとblocking集約を公開境界から検証する7件を追加した。
- 既存CI契約テストと formal baseline を意図したworkflow変更へ追従させた。
- `tests/integration/t112.serial.test.ts`: exit-code集約だけを検証するscratch fixtureへ built markerを置き、新しい公開preconditionを満たした上で従来責務を検証するようにした。

API、repository/data access、database migration、frontend、deployment/IaC の変更はない。

## TDDと検証

- Red: 新規契約テストを先に追加し、build alias、CI build順序、再現性job、runner guardが未実装のため 0 pass / 8 fail を確認した。その後、重複した比較観点を統合して最終7件にした。
- Green: 修正後の対象4ファイルは 28 pass / 0 fail / 220 assertions。追加契約7件、CI snapshot/formal契約、`t112` の7ケースを含む。
- `bun run typecheck`: 成功。
- `bun run lint`: 成功。既存ベースラインの 391 warnings / 23 infos のみ。
- `git diff --check`: 成功。
- 旧drift checks: `bun run dist:check`、`bun run promote:self:check`、`bun .claude/tools/amadeus-graph.ts compile --check` はすべて成功。
- root `bun run build`: 成功し、生成treeに意図しない追跡差分なし。
- tracked seed を含む独立一時tree A/B: 各treeで install と build を行い、`dist/` は byte-identical。
- `bun run test:ci -- -P 4`: 初回は 755 files 中754 filesが成功し、唯一 `t112` のscratch fixtureが新presence guardを満たさず5 assertions失敗した。fixture修正後、`t112` を含む対象4ファイルを再実行して 28 pass / 0 fail を確認した。全755 filesの再実行は行っていない。
- negative bootstrap: root `dist/` を除外した独立treeの `bun run build` は上記 compile seed の `ENOENT` を再現した。これは隠さず u8/C8 の残課題とする。

## 変更ファイル

- `.github/workflows/ci.yml`
- `package.json`
- `tests/run-tests.ts`
- `tests/integration/t-ci-build-before-test.integration.test.ts`
- `tests/integration/t112.serial.test.ts`
- `tests/integration/t222-ci-snapshot-branch.integration.test.ts`
- `tests/integration/t-formal-verif-ci-workflow.integration.test.ts`
- `tests/fixtures/formal-verif-ci-baseline.sha256`
- 本ディレクトリの `code-generation-plan.md` と `code-summary.md`
