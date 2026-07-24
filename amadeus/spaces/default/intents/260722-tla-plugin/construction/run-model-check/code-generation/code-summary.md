# run-model-check コード生成サマリー

## 実装結果

U3 `run-model-check` の CLI、Darwin/Docker planner、planner-neutral な TLC 実行境界、成果物 publisher を実装した。CLI は可変の `.tla` / `.cfg` を U1 の canonical source identity と照合し、TLC の正規化済み探索結果だけを `NOT_DETECTED` / `DETECTED` / `HARNESS_ERROR` に変換する。

- exit code は `0 = NOT_DETECTED`、`1 = DETECTED`、`2 = HARNESS_ERROR` に固定した。
- Darwin は既存の JDK/sandbox 検査を用い、Docker は digest 固定 image、`--network=none`、read-only source/jar mount を用いる。
- planner は prepare 時に環境を snapshot し、spawn 直前に再検査する。drift 時は child を起動しない。
- EnvReceiptは`passed | failed | not-applicable | not-run`を区別する。前段failureの未実行検査は`not-run`、実行済みdriftだけ`failed`、platform非該当だけ`not-applicable`とし、provider別matrixはplannerが所有する。
- TLC process は shell-free argv、180秒 deadline、stdout/stderr 各16 MiB上限で実行する。timeout/overflow 時は process group を `SIGTERM`、`SIGKILL` の順で停止・回収する。
- terminal manifest は最後に書き、成功時は一時ディレクトリを出力先へ atomic rename する。harness failure は run 固有 failure directory に隔離する。
- artifact予約後はcache作成からpublisherまでを単一failure/publish境界へ入れ、同期例外を固定HARNESS_ERROR/exit 2へ閉じる。publisher初回例外はfailure outcomeで一度だけ回復publishする。
- `run-skeleton-ci.ts` と U1 の引数なし public loader は変更していない。

## 主な変更ファイル

- `scripts/formal-verif/run-model-check-domain.ts`: CLI、planner、receipt、outcome 契約
- `scripts/formal-verif/run-model-check-source.ts`: 可変パスと U1 canonical source の接続
- `scripts/formal-verif/tlc-spawn-planner.ts`: Darwin/Docker planner と Node 環境 adapter
- `scripts/formal-verif/fs-tlc-toolchain.ts`: planner-neutral prepare/run と bounded process 実行
- `scripts/formal-verif/run-model-check-artifacts.ts`: manifest-last の成果物公開
- `scripts/formal-verif/run-model-check-paths.ts`: out分離とcache作成のfilesystem port/Result境界
- `scripts/formal-verif/run-model-check-execution.ts`: artifact予約後の単一execute/publish境界
- `scripts/formal-verif/run-model-check-reporter.ts`: terminal JSON/human line
- `scripts/formal-verif/run-model-check.ts`: 189行のproduction composition rootとtestable main seam
- `scripts/formal-verif/index.ts`: U3 public contract の export
- `tests/unit/`、`tests/integration/`、`tests/e2e/`: 契約、filesystem/process、CLI 境界の試験

## 検証結果

- 型検査: PASS
- U3/U5境界 focused test: 16ファイル、123 assertions、失敗0
- 全CI（`--parallel 1`）: 503ファイル、7,149 assertions、失敗0
- 既定parallel実行では対象外の`t257-status-registry-migration`性能assertionが2回flaky failureとなったが、同test単独は11/11 PASS、serial全CIは上記のとおり全件PASS
- complexity gate: PASS、新規違反0
- coverage registry: PASS
- 最新差分の追加行 coverage: 1,490 / 1,490、未カバー0、allowlist/exclusion なし
- `dist:check`: PASS
- `promote:self:check`: PASS
- Darwin 実TLC: `NOT_DETECTED` / exit 0、96.923秒、model workspace への副作用なし
- Docker planner: digest/network/mount/argv と falling proof は deterministic test で PASS
- distribution boundary: `origin/main` から `5f8001742` までは finding 0、U1 commit `8020e22dd` で11配布面×4参照の44 findingsが初出した。model-completeness sensorがhostの `scripts/formal-verif` を参照していた境界を、framework同梱のcanonical model-map/hash moduleへ修正し、全dist/self-install mirrorを再生成した。`t258-boundary-guard.integration.test.ts` は4件すべてPASSした。

## 受入結果と制約

- Docker daemon が停止しているため、実containerによる完全探索は未実施である。
- Darwin性能受入はwarm-up 1回 + 計測5回を完了した。`cliMs / spawnMs / workspaceWrites` は、warm-up `105143.240 / 104252.610 / 0`、計測1 `103795.709 / 103619.963 / 0`、計測2 `106503.313 / 106319.788 / 0`、計測3 `106057.753 / 105876.891 / 0`、計測4 `106144.403 / 105967.854 / 0`、計測5 `106858.094 / 106681.187 / 0` だった。計測最大spawnは106681.187ms、最大CLIは106858.094msで、全回が180秒上限内、全回NOT_DETECTED、workspace write 0だった。
- CLI E2E はproduction entrypointの構文エラーexit 2と、公開dependency seamを使うtest-only subprocess fixtureのexit 0/1をblack-box実行した。3系すべてでstderr JSON、human-readable行、terminal manifest、artifact digest/bytesを外部観測から確認した。productionへtest modeや環境変数分岐は追加していない。
- Step 11は条件付き未完了である。Darwin性能部分は完了したが、Docker実container受入はdeterministic planner/falling proofで代替せず、U4/CIのmandatory gateへ引き継いだ。

## Architecture Review Iteration 1 対応

- Critical「未実行inspectionの偽failed」: `not-run`とcanonical builder/matrixを追加し閉包した。
- Critical「予約後例外漏れ」: filesystem port、単一failure/publish境界、realpath/cache/publisher black-box回帰で閉包した。
- Major「407行root責務集中」: rootを189行へ縮小し、path/cache、receipt、reporter、execution/publishを分離した。
- Major「Docker未実施の完了扱い」: Step 11を未完了へ戻し、U4 mandatory gateへ明示的に引き継いだ。
