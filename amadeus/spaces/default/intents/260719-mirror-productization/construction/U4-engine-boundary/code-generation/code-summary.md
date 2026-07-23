# Code Summary — U4-engine-boundary

## 実装結果

- `packages/framework/core/tools/amadeus-orchestrate.ts`へ`MirrorBoundaryDecision`の2値純関数とphase境界guardを追加した。
- bare `next`だけが境界を評価し、ideation / inceptionは次phaseの最初のin-scope stage、constructionはworkflow完了状態で発火する。read-only utility、jump、resume、single-stage、通常の同一phase routingには追加config I/Oを行わない。
- U3の3層config resolveを境界guard通過後だけ呼び、invalid層とerrorsを含む既存error directiveをstdoutへ厳密な単一JSONとして返してfail-closedに停止する。stderrは空、または非規範advisoryだけとする。
- auto off/未設定はask、auto on×Mirror Issueありは固定sync print、auto on×未作成はcreate選択肢付きaskへ降格する4象限を実装した。
- ask回答は`report --mirror-boundary <phase> --result completed --user-input <create|sync|skip>`で相関し、成功済み操作またはskipだけをReceipt completedへ記録する。close、自由文、不一致phase、未提示createを拒否する。
- auto-syncはReceiptをpendingへ記録してから固定`amadeus-mirror.ts sync`を実行し、成功後だけcompletedへ記録する手順をprint directiveで名指しした。失敗・通知欠落・更新失敗ではpendingが残り、後続`next`がcanonical順で最古の1件だけ再発行する。

## Receipt状態機械

- `packages/framework/core/tools/amadeus-state.ts`へ`Mirror Boundary Receipts`のparse / serialize / transitionと`mirror-boundary` subcommandを追加した。
- canonical phaseはphase-check対象と同じ`ideation → inception → construction`の単一定義から導出する。
- 保存形式はJSON objectの`phase: pending | completed`だけとし、未知phase、未知status、重複key、構文破損を拒否する。
- `absent → pending`、`pending → completed`、askの`absent → completed`を期待元状態つきで原子更新する。completed再通知は冪等no-op、期待状態不一致はstate byte不変で停止する。
- 既存state fieldとaudit eventの意味、およびstate templateは変更していない。追加状態面はstateへ必要時だけ保存するruntime-only `Mirror Boundary Receipts` fieldに限定した。

## テスト

- 新規:
  - `tests/unit/t265-engine-boundary.test.ts`
  - `tests/integration/t265-engine-boundary.integration.test.ts`
  - `tests/e2e/t265-engine-boundary.test.ts`
- U4対象: 3ファイル、49 tests、205 assertions、0 fail。
- ideation / inception / construction × auto on/off × Mirror Issue有無の12セルを実CLI tableで検証し、各セルでdirective kind、固定sync、create提示有無、state byte不変、stdout単一JSON、stderr空を固定した。
- sync失敗後のpending再発行、Receipt更新失敗、複数pending進行、session再開、phase不一致、未提示create、自由文、二重回答、skipの`absent → completed`を実行journeyで検証した。
- invalid configテストはstdoutの全体を単一JSONとしてparseし、`kind: "error"`、stderr空、state byte不変を検証した。
- E2Eは6 harnessの静的配布一致に加え、生成済みClaude CLIを別processで起動し、pending再開からcompleted後の通常`run-stage`復帰まで検証した。
- `t114` / `t116`に加え、通過済みphaseを表す共有fixture 6件へcompleted Receiptを追加し、新境界promptが既存テスト本来の観測面を横取りしないよう追随した。
- 初回CIで失敗した7ファイルは、fixture Receipt追随とcoverage / complexity ratchet更新後に157 tests、1488 assertions、0 failで再確認した。
- `bun run typecheck`: green。
- 全744ファイルのBiome error check: green（既存warningはerror判定外）。
- `bun run dist:check` / `bun run promote:self:check`: 6 harnessとself-installでgreen。
- 正規全CI `bun tests/run-tests.ts --ci`: exit 0、478 test files、6888 assertions、0 failed files、0 failed assertions、`RESULT: PASS`。Claude substrate unavailableによる既定SKIPがあり、wall-clock drift advisoryは1件だった。

## 変更ファイル

- 正本: `packages/framework/core/tools/amadeus-orchestrate.ts`
- 正本: `packages/framework/core/tools/amadeus-state.ts`
- 回帰fixture追随: `tests/unit/t114-orchestrate-next.test.ts`
- 回帰fixture追随: `tests/unit/t116-directive-path-resolution.test.ts`
- U4 tests: `tests/unit/t265-engine-boundary.test.ts`、`tests/integration/t265-engine-boundary.integration.test.ts`、`tests/e2e/t265-engine-boundary.test.ts`
- 既存fixture追随: `tests/fixtures/state-brownfield-feature.md`、`state-construction*.md`、`state-jumped.md`、`state-bugfix-final-construction.md`
- 品質ratchet追随: `tests/.coverage-registry.json`、`tests/.complexity-baseline.json`、`tests/unit/gen-coverage-registry.test.ts`
- 生成物: 6 harnessの`amadeus-orchestrate.ts` / `amadeus-state.ts`とself-install面

## 判断と計画逸脱

- `next`の読み取り専用契約を維持するため、auto-syncのpending/completed書込はprint directiveが既存state toolの専用subcommandを順に実行する形とした。GitHubへの自動副作用は固定syncだけであり、metadata更新を動的shell生成へ混ぜていない。
- phase境界の過去分をworkflow途中で遡及askしないため、Receipt不在だけでなく「次phaseの最初のin-scope stage」またはworkflow完了を外側guard条件にした。pending auto-syncだけは設計どおり共通`next`入口で常時回復する。
- U3実装、directive kind集合、package/lockfile、既存state fieldとaudit eventの意味、state templateは変更していない。runtime-only Receipt fieldだけを追加した。
- stateのworkflow完了マークは親レビュー後の担当であり、本作業では変更していない。

## 未解決事項

- コードおよび検証上の未解決事項はない。
