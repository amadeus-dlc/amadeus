# Integration Test Instructions — 260818-priority-bug-batch-4

Test Strategy = Comprehensive。unit 間の相互作用と、配送先ツリー(dist 投影)を含む境界を対象にする。上流入力は 2 unit の `code-generation-plan.md` と `code-summary.md`。

## 実行方法

- `bun test tests/integration/<file>`(integration 層。filesystem / process を使う medium test はここに置く — unit allowlist を増やさない)
- フルスイート: `bash tests/run-tests.sh --ci`(**リモート CI が正本**。ローカル完走を push や PR 作成の前提条件にしない — push-first)

## 境界と観点

### 配送先ツリー(engine 正本 → 7 ハーネス投影)

`t425-unit-pool-harness-parity.integration.test.ts` が担う。`packages/framework/core/tools/amadeus-unit-pool*.ts` の byte 一致と、`dist/<harness>/<instruction>` の pool プロトコル文言 9 リテラルを検査する。**ソース断面の green は投影の退行を隠す**ため、ハーネス面を触る変更では build 後に必ず実行する。

対象 7 面: `claude` / `codex` / `cursor` / `kimi` / `kiro` / `kiro-ide` / `opencode`。

### engine ↔ conductor の directive 契約

`t135-invoke-swarm.test.ts` が `invoke-swarm` の実物 directive を検査する。batch identity は engine 所有の routing であり conductor が再導出してはならない一方、convergence check(`--check-cmd` / `--test-file`)は conductor 知識であり engine は供給しない — この非対称が両 unit を跨ぐ設計契約である。

### per-unit outcome 台帳と pool 台帳の交差

`t533-per-unit-consume-fanout.integration.test.ts` が担う。per-unit 経路の settle 行と pool 経路のイベントが同じ triple(stage / unit / batch)へ落ちたとき、pool 優先の de-dup が働き二重計上されないことを検査する。

## unit 間の交差(直列化の根拠)

両 unit とも `packages/framework/core/tools/amadeus-orchestrate.ts` を変更する。patch 面(Unit 1 = emit 境界 + `spentPoolRefusal`、Unit 2 = `:2475-:2556` / `:4686-:4711` 系)は非交差だが行番号は base 断面で移動する。delivery-planning の計画どおり **PR は直列着地**とし、後続 unit は先行着地後に rebase してから CI を回す。
