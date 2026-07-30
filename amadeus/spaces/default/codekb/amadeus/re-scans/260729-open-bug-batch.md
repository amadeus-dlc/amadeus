# 260729-open-bug-batch 差分スキャン記録

## 実行メタデータ

- Date: `2026-07-29T07:06:38Z`
- Repository: `amadeus-dlc/amadeus`
- Base commit: `ca8ff0af40d6250edffe42246d3f5538819c22af`
- Observed commit: `22ee27dbef9027203658a6cd98bf97501c4b222c`
- Distance: `13 commits`
- Ancestry: `ca8ff0af4` は observed の祖先（`git merge-base --is-ancestor` exit 0）
- Scope: `amadeus-bugfix` / Brownfield / single repository
- Scan mode: Developer static live-code scan を上流入力にした differential refresh。Architect の引用再確認あり。テスト未実行。
- Focus: [#1667](https://github.com/amadeus-dlc/amadeus/issues/1667)、[#1664](https://github.com/amadeus-dlc/amadeus/issues/1664)、[#1663](https://github.com/amadeus-dlc/amadeus/issues/1663)、[#1662](https://github.com/amadeus-dlc/amadeus/issues/1662)、[#1336](https://github.com/amadeus-dlc/amadeus/issues/1336)、[#1607](https://github.com/amadeus-dlc/amadeus/issues/1607)、OTel [#1679](https://github.com/amadeus-dlc/amadeus/issues/1679) との衝突。
- Delivery: 1 Issue = 1 Bolt = 1 GitHub Pull Request。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)

## 区間の変化

`ca8ff0af4..22ee27dbe` は13コミット、624ファイル、71,100 insertions / 26,206 deletionsである。生成面・record・metrics等を除く比較断面は215ファイル、16,982 insertions / 7,844 deletions。主な変更は Intent Mirror Project 同期スタック、Bun-only runner 契約、CLI/SDK/TUI test mechanism、gated/unset swarm routing、番号回答の意味解決である。

追加された mirror 正本は `amadeus-mirror-project-contract.ts`、`diagnostics.ts`、`executor.ts`、`gateway.ts`、`ledger-reducer.ts`、`reconciliation-reducer.ts`、`verification.ts`。#1607 は旧 lifecycle のみでなく、この Project completion gate と audit outbox を含む現行 stack で修正する。

## Developer Code Scan の合成結果

| Issue | 確定事項 | 根因確度 | 主対象 | 欠落テスト |
| --- | --- | --- | --- | --- |
| #1667 | child timeout 180秒、Bun test timeout 120秒 | 95% | `book-pack-verify.test.ts`、必要時 verifier/runner | 並列負荷回帰 |
| #1664 | t224 が既存 stdout/stderr を assertion 診断に含めない | 診断100%、製品20% | t224、再現後 migrate/doctor/clone-id/audit | failure envelope |
| #1663 | parallel checkout の個別 status を親が保持しない | 観測性95%、欠損35% | `team-up.sh`、t295 | member status/log 集約 |
| #1662 | committed diff と dirty LCOV が異なる断面を測る | 100% | `coverage-patch-gate.ts`、t229 | dirty/line-shift |
| #1336 | fixed 50ms + PID liveness は readiness ではない | 99% | `team-up.sh`、safety-wait、resume serial | delayed init→exit fixture |
| #1607 | complete/seal/cursor clear が mirror completion より先 | 100% | orchestrate/state/audit/mirror stack | multi-intent final completion 貫通 |

## Architect Synthesis

6件は「実行結果・source snapshot・readiness・durable receipt のいずれかを観測せず成功を宣言する」という共通品質テーマを持つため、1つの Bugfix Intent として追跡可能である。一方、修正責務と回帰面は分かれるため1 Issue = 1 Bolt = 1 Pull Requestを維持する。

### 依存と順序

1. #1607 を OTel #1679 の Construction 前に着地させる。audit/journal/state entry と audit seal transaction が Critical 共有境界である。
2. #1664 の診断を OTel Journal v2 前に着地させる。t224 の journal/audit expectation を観測可能にする。
3. #1336 → #1663 の順に直列化する。同じ `team-up.sh` を変更し、readiness protocol が worker aggregation の前提になる。
4. #1662 と #1667 は主ファイルが分離しており並行可能。最終 Build and Test は同一 CI 負荷帯で横断する。

### 修正境界

- #1667 / #1664 / #1663 は診断追加だけで完了にしない。再現→原因確定→最小修正→回帰固定までを同じ Bolt に含める。
- #1662 は diff と LCOV の共通 snapshot identity を定義し、dirty working tree を無音受理しない。
- #1336 は固定 sleep を増やさず、期限付き readiness handshake と kill/reap cleanup を使う。
- #1607 は post-complete audit seal を緩和せず、mirror durable receipt を completion commit より前または同一 transaction に置く。
- core 正本変更は7 dist + 5 self-installへ再生成し、生成物を独立編集しない。

## OTel #1679 衝突評価

| Issue | 衝突度 | 交差面 |
| --- | --- | --- |
| #1607 | Critical | audit/journal/state entry、audit seal、completion transaction |
| #1664 | High | t224 journal/audit expectations、doctor terminal diagnosis |
| #1336 | Medium | child context、launcher startup |
| #1663 | Low-Medium | Team Mode launcher |
| #1667 | Low | test runner load |
| #1662 | Low | coverage generation |

別 worktree `otel-improvement` の未コミット CodeKB は latest reachable trunk ではないため読まず、本記録へ混ぜていない。衝突評価は Developer scan が observed source から導出した結果だけを使う。

## 更新成果物

- `business-overview.md`: 6件の利用者価値、1 Issue = 1 Bolt = 1 Pull Request、OTel 順序制約。
- `architecture.md`: 4修正境界、Interaction Diagrams、completion transaction、依存トポロジー。
- `code-structure.md`: issue別正本/テスト/配布面、区間の構造変化。
- `api-documentation.md`: timeout、diagnostic envelope、worker result、snapshot、readiness、completion の内部契約。
- `component-inventory.md`: 6件の所有コンポーネントと共有境界。
- `technology-stack.md`: Bun-only stack、version、739 tests、7/5 distribution。
- `dependencies.md`: 外部/内部依存、Bolt と OTel の順序。
- `code-quality-assessment.md`: 根因確度、欠落テスト、技術的負債、検証順序。
- `reverse-engineering-timestamp.md`: shared freshness pointer を observed `22ee27dbe` へ更新。

## 制約と未解決事項

- 本 scan は静的解析であり、対象テスト・full suite は未実行。
- #1667 の `rm` 直接原因、#1664 の製品根因、#1663 の実欠損根因は未確定。後続 Bolt で観測性を先に補い、再現結果から閉じる。
- 実装方式の最終裁定は Requirements Analysis / Construction に委ねる。Reverse Engineering は live code の現状と境界だけを確定した。
- intent state、audit、report、GitHub Issue/Pull Request は本 scan で変更していない。
