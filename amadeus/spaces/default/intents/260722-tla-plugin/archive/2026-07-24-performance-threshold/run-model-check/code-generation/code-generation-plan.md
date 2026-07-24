# run-model-check コード生成計画

## 目的

U3 `run-model-check` を、単一モデルの TLC 完全探索を 1 コマンドで実行できる fail-closed な CLI として実装する。macOS の `sandbox-exec` と Linux の Docker は `TlcSpawnPlanner` より下層で切り替え、探索結果の正規化、終了コード、成果物公開は共通化する。

対象ストーリーは Unit Story Map の「3. ローカルで完全探索を1コマンド実行する」であり、対象要件は FR-3.3〜FR-3.6、横断要件 FR-6.1〜FR-6.4、NFR-1〜NFR-3 である。

## 実装境界と前提

- `scripts/formal-verif/run-skeleton-ci.ts` は既存の実験資産として挙動を変えない。
- `FsTlcToolchain` の `acquire → verifyOffline → prepare → run → normalize`、issued capability、source drift 検査、TLC 出力正規化を再利用し、planner ごとの判定コードを作らない。
- U1 の `TlaModelSource`、`ModelLoadError`、モデル同一性・receipt の生成規則を正本とし、U3 側に同等型や独自 schema を再定義しない。
- 現在の U1 public loader は固定パス・引数なしである一方、FR-3.3 は可変 `--model` / `--cfg` を要求する。実装前に、既存の固定パス wrapper を保持したまま、U1 の安全な読込処理と型を共有する引数付き canonical loader を追加する、という最小接続を確定する。承認済み U1 契約を壊さずに接続できない場合は実装を開始せず、Functional Design に戻す。
- CLI の構文エラーは run 未成立として stderr と exit `2` のみを返す。引数検証後に run ID と出力予約が成立した実行は、成功・反例・harness failure のいずれも terminal manifest を最後に発行する。
- HARNESS_ERROR は U3 では exit `2` に正規化する。これは「2 以上」という外部契約を満たし、内部の固定 `errorCode` で原因を区別する。
- production 専用の test mode や環境変数分岐は追加しない。テスト seam は純粋関数、明示的な依存注入、fake process/filesystem port で構成する。

## 実装手順

1. [x] **契約差分をテスト可能な public surface に固定する**
   - `RunModelCheckInput`、`CliError`、`TlcSpawnPlanner`、`EnvSnapshot`、`EnvReceipt`、`DockerPlannerConfig`、`ModelCheckOutcome` の discriminated union と companion API を Functional Design の定義どおりに配置する。
   - planner-neutral な prepared run に必要な情報を洗い出し、既存の Darwin 固有 `VerifiedJdkSnapshot` / `VerifiedSandbox` を planner の `EnvSnapshot` に閉じ込める。既存 lifecycle と `run-skeleton-ci.ts` の呼出し互換性は維持する。
   - U1 の canonical loader に、検証済み workspace 配下の `.tla` / `.cfg` を受け取る引数付き API と、読み込んだ bytes から正本の frozen receipt を作る API を追加する計画を型テストで固定する。固定パスの `loadVerifiedTlaSource()` は残す。
   - public surface test で U1 型の再利用、planner の最小責務が `buildArgv` / `snapshotEnvironment` / `verifyEnvironment` の 3 つだけであること、不要な export が増えないことを検証する。
   - トレーサビリティ: FR-3.3、FR-3.5、FR-6.3、BR-U3-3、BR-U3-8。

2. [x] **CLI 入力解析と安全なパス読込を test-first で実装する**
   - `--model <path.tla>`、`--cfg <path.cfg>`、`--out <dir>` を必須、`--provider auto|sandbox-exec|docker` を任意かつ既定 `auto` として、重複、未知 option、値欠落、余剰 positional argument を決定的な `CliError` にする。
   - model/cfg/workspace/out は `realpath` を基準に正規化し、symlink、非 regular file、拡張子違反、workspace 外参照、model/cfg と out の同一・親子関係、既存 out を起動前に拒否する。文字列連結や shell 解釈には渡さない。
   - U1 loader の共通検証を通して `TlaModelSource` と canonical receipt を生成し、読み直しによる TOCTOU を避けるため以降は検証済み bytes と identity を引き回す。
   - unit test は正常系、option 順序、各構文エラー、path traversal、symlink、特殊文字を含む argv を表形式で網羅し、実 filesystem ケースは integration test に分離する。
   - トレーサビリティ: ストーリー3、FR-3.3、FR-6.4、NFR-3、BR-U3-1、BR-U3-8。

3. [x] **Darwin と Docker の `TlcSpawnPlanner` を実装する**
   - `auto` は `darwin` のみ Darwin planner、それ以外は Docker plannerを選ぶ。明示 provider と実行 OS の不整合、Docker command 不在は fail-closed にする。
   - Darwin planner は既存 `sandbox-exec` の argv prefix、profile、network-deny probe、JDK snapshot/version 検証を byte-for-byte で移設する。`verifyEnvironment` は spawn 直前に再実行し、JDK・profile・network-deny の drift を検出する。
   - Docker planner は固定 digest `eclipse-temurin:26-jdk@sha256:939e35776c4582f5454276c42a9ca3825df1b4a983ed2edd4cd9b4e130bb0eeb`、`--network=none`、検証済み TLC jar の read-only mount、run 固有 container 名、検証済み workspace/output mount のみで shell-free argv を組み立てる。tag、可変 image、workspace 外 mount は拒否する。
   - TLC 1.7.4 jar の SHA-256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88` を両 planner で共通検証する。Docker は image digest / jar / network-deny を `passed`、JDK snapshot / sandbox profile を理由付き `not-applicable` とする。Darwin は image digest を `not-applicable`、残りを実検査結果にする。
   - unit test で両 planner の完全 argv、空白・記号を含む path、inspection の全 5 ID と順序、`not-applicable` の固定 reason を snapshot ではなく構造比較する。
   - falling proof として Darwin の JDK/profile/network drift、Docker の image digest/jar mismatch をそれぞれ注入し、spawn が一度も呼ばれず HARNESS_ERROR になることを検証する。
   - トレーサビリティ: FR-3.5、FR-3.6、NFR-1、NFR-3、BR-U3-2〜BR-U3-7。

4. [x] **`FsTlcToolchain` の spawn 境界を planner 委譲へ最小リファクタする**
   - `prepare` で選択済み planner の `snapshotEnvironment` を保存し、`run` の process spawn 直前に `verifyEnvironment` を呼び、検証済み manifest argv を `buildArgv` に渡す。
   - current artifact/source/std-module/capability 検証、SOURCE_DRIFT、TLC output parser、complete marker と state statistics の判定は共通経路に残す。provider 別 normalize や outcome 判定を追加しない。
   - process 実行は argv 配列のみとし shell を使わない。spawn deadline は 120 秒、stdout/stderr は各 16 MiB 上限、timeout・overflow・signal・非期待 exit・reap 失敗を固定 `errorCode` の HARNESS_ERROR にする。
   - 既存 caller には Darwin planner を既定注入して互換性を保ち、`run-skeleton-ci.ts` を変更せず既存 unit/integration/E2E test が通ることを先に確認する。
   - fake planner / fake process port による unit test で呼出し順序、prepare 後 drift、spawn 非実行、timeout kill/reap、stream overflow を検証する。
   - トレーサビリティ: FR-3.4、FR-3.5、FR-6.3、NFR-2、NFR-3、BR-U3-1〜BR-U3-6。

5. [x] **共通 outcome adapter と exit code 契約を実装する**
   - 正規化済み TLC 結果を `NOT_DETECTED` / `DETECTED` / `HARNESS_ERROR` に一度だけ変換する。
   - `NOT_DETECTED` は COMPLETE、completion marker、state statistics がすべて揃う場合に限定し exit `0` とする。部分探索、marker/statistics 欠損、timeout、drift、環境検証失敗は HARNESS_ERROR / exit `2` とする。
   - invariant violation と再現可能な counterexample identity が揃う場合のみ DETECTED / exit `1` とする。parser の曖昧状態を DETECTED や NOT_DETECTED に昇格させない。
   - stderr の先頭行は `amadeus.run-model-check.v1` の機械可読 JSON とし、`runId`、outcome、exitCode、固定 errorCode、DETECTED 時の counterexample identity を含める。続く human-readable 行にも同じ結論を表示し、secret、環境変数、不要な絶対 path は出さない。
   - outcome table の unit test で complete、violation、partial、欠損、timeout、drift、unknown parser output の全分岐と stderr redaction を固定する。
   - トレーサビリティ: ストーリー3、FR-3.4、FR-3.6、NFR-3、BR-U3-1、BR-U3-2。

6. [x] **receipt と成果物を原子的に公開する**
   - publisher だけが `<out>.tmp-<runId>`、failure directory、最終 out を作成・rename できる構造にする。既存 out、symlink、親子 conflict は書込み前に拒否し、別 realpath の workspace/out と別 runId は独立実行できるようにする。
   - `amadeus.env-receipt.v1` に `runId`、planner identity、5 inspection を保存する。executed inspection は `passed` または原因を伏せない `failed`、非該当は `expected/observed: null` と設計所定の reason を持つ `not-applicable` にする。
   - NOT_DETECTED は EnvReceipt/stdout/stderr/completion marker、DETECTED は EnvReceipt/stdout/stderr/counterexample、HARNESS_ERROR は EnvReceipt と生成済み stream を partial artifact として扱う。
   - `amadeus.model-check-manifest.v1` は outcome、exitCode、開始・終了時刻、expectedArtifacts、artifact ごとの relative path/SHA-256/bytes、partial/errorCode を記録する。manifest 自身は digest 対象外とし、必ず最後に書いてから atomic rename する。
   - 失敗時は tmp を一意な failure directory に移し partial manifest を最後に発行する。consumer test は manifest を最後に読み、runId と全 digest/size を再検証する。
   - integration test で成功・反例・失敗の artifact set、改竄 digest、途中書込み不可視性、既存 out、rename failure、同時 run の分離、failure recovery を実 filesystem 上で検証する。
   - トレーサビリティ: FR-3.4、FR-3.6、NFR-1、NFR-3、BR-U3-1、BR-U3-6、BR-U3-7。

7. [x] **`run-model-check.ts` を薄い composition root として実装する**
   - CLI は parse → planner select/snapshot → U1 source load → toolchain acquire/verifyOffline/prepare/run/normalize → outcome adapt → publish → terminal stderr/exit の順を明示し、business rule を CLI ファイルへ重複実装しない。
   - `runModelCheck(input, dependencies)` の in-process seam と、`process.argv` / `process.exitCode` を扱う最小 adapter を分離する。production entrypoint では正規依存だけを組み立てる。
   - CLI 全体に 180 秒の deadline を設け、toolchain の 120 秒 spawn deadline と競合しないよう、超過時は child を kill/reap 後に HARNESS_ERROR を公開する。
   - `scripts/formal-verif/index.ts` は利用者に必要な canonical type/function のみ export する。package script や test config は既存の glob で発見できるため、必要性を実測し、不要なら変更しない。
   - トレーサビリティ: ストーリー3、FR-3.3〜FR-3.6、FR-6.3、NFR-2。

8. [x] **unit test suite を完成させる**
   - `tests/unit/` に CLI parser、outcome adapter、planner selection/argv、receipt/manifest builder、U1 loader adapter の純粋・in-memory test を置く。
   - success path に加え、全 `CliError`、全 fixed `errorCode`、exit 0/1/2、5 inspection、artifact set、digest、deadline、16 MiB 境界、redaction、Darwin/Docker falling proof を網羅する。
   - test doubles は production interface に対して実装し、テストだけが知る branch を production code に追加しない。巨大 test file を避け、対象コンポーネント単位に分割する。
   - `tsconfig.tests.json` と `tests/run-tests.sh` の既存検出規則で新規 test が実行されることを確認し、設定変更が不要であることを検証する。
   - トレーサビリティ: FR-6.3、FR-6.4、NFR-3。

9. [x] **integration test suite で filesystem・process 境界を検証する**
   - `tests/integration/` に実 filesystem、fake executable/process port、実 SHA-256、atomic rename を使う test を置き、unit test に filesystem 操作を混ぜない。
   - `FsTlcToolchain` と planner の統合について、prepare 時 snapshot と spawn 直前 verify の間に drift を注入し、Darwin/Docker の双方で child process が起動しないことを確認する。
   - shell metacharacter を含む model/cfg/out path が単一 argv 要素のまま渡ること、workspace 外 mount、symlink swap、jar swap、source swap、stdout/stderr overflow が fail-closed になることを確認する。
   - macOS では所定 JDK/sandbox/TLC が利用可能なときだけ明示的な実環境 acceptance test を実行し、FormalElection の完全探索が NOT_DETECTED になることを確認する。環境不足を通常の deterministic test の成功に見せかけず、skip reason を明示する。
   - トレーサビリティ: FR-3.4、FR-3.5、FR-6.4、NFR-1〜NFR-3、BR-U3-4〜BR-U3-7。

10. [x] **CLI E2E で利用者契約を検証する**
    - `tests/e2e/` から `bun scripts/formal-verif/run-model-check.ts` を subprocess 起動し、実際の argv、stderr JSON + human line、exit code、manifest-last consumer 検証までを black-box で確認する。
    - 最低限、完全探索完走 `0`、反例あり `1`、構文エラー・model 不正・環境 drift・部分探索 `2` を検証する。実 provider が必要な success/detected ケースは環境要件を明記し、U4 の Linux CI では固定 digest Docker による real run へ接続できる test target とする。
    - `--provider auto` の OS 選択、明示 provider、1 CLI = 1 model、既存 out 拒否、成果物の runId/digest 整合を外部観測だけで確認する。
    - `run-skeleton-ci.ts` の既存 E2E を併走し、U3 導入前後で回帰がないことを確認する。
    - トレーサビリティ: ストーリー3、FR-3.3〜FR-3.6、FR-6.4、NFR-1、NFR-3。

11. [ ] **性能・セキュリティ受入を実測する（条件付き未完了: Docker実containerはU4必須ゲートへ引継ぎ）**
    - warm cache の FormalElection を、ubuntu 相当 2 vCPU / 7 GiB、warm-up 1 回 + 計測 5 回で実行し、process spawn 120 秒未満、CLI 180 秒未満を全試行で確認する。CI 全体 30 分上限は U4 の責務として、U3 は単発 run の測定値を渡す。
    - 各 run で stdout/stderr が 16 MiB を超えないこと、超過注入時に HARNESS_ERROR となること、child/container が timeout 後に残存しないことを確認する。
    - Darwin は sandbox profile と network-deny、Docker は固定 image digest・jar checksum・`--network=none`・mount の read-only/containment を receipt と実コマンドの双方で照合する。
    - logs、stderr、manifest、failure directory に secret/環境変数全量/不要な host 絶対 path が含まれないことを security test で確認する。
    - Darwinはwarm-up 1回+計測5回を完了済み。Docker amd64のwarm cache、warm-up 1回+計測5回による実container受入はlocal daemon不在のため未完了であり、U4 `ci-integration` のworkflow_dispatch実行におけるmandatory gateとして引き継ぐ。deterministic planner/falling proofのgreenを実container完了の代替とは扱わない。
    - トレーサビリティ: NFR-1〜NFR-3、FR-3.5、FR-6.3、BR-U3-4〜BR-U3-7。

12. [x] **品質ゲートと変更範囲を最終確認する**
    - 変更行を U3 の CLI、planner、planner-neutral toolchain seam、canonical U1 loader 接続、artifact publisher、対応 test、および検出した U1/U5 配布境界違反の修正と必要な mirror 再生成に限定し、無関係な refactor、`run-skeleton-ci.ts` の仕様変更、U4 の CI 配線を含めない。
    - `bun run typecheck`、`bun run lint`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci` を実行し、すべて green にする。
    - project の coverage registry / test-size / purity / complexity gate を実行し、local LCOV で diff 追加行の未カバーを 0 にする。未達分を ignore や broad exclusion で隠さない。
    - public surface、receipt/manifest schema、fixed image/jar digest、exit/outcome table、deadline/stream limit が Functional Design・NFR Design と一致することを差分レビューする。
    - `git diff --check` と対象ファイル一覧を確認し、本計画の各項目に対応しない変更がないことを確認する。
    - トレーサビリティ: FR-6.1〜FR-6.4、NFR-3。

## 完了条件

| 観点 | 完了条件 |
|---|---|
| ストーリー3 | 1 コマンドで可変 model/cfg の単一完全探索を開始し、機械判定可能な結果と検証可能な成果物を得られる |
| FR-3.3 | `run-model-check.ts` が必須引数と provider 選択を受け、`run-skeleton-ci.ts` を保持する |
| FR-3.4 | COMPLETE + marker + statistics の場合だけ NOT_DETECTED、その他の不完全状態は fail-closed |
| FR-3.5 | Darwin sandbox-exec と Linux Docker が planner にのみ分岐し、normalize/outcome は共通 |
| FR-3.6 | exit `0 = NOT_DETECTED`、`1 = DETECTED`、`2 = HARNESS_ERROR` が unit/integration/E2E で一致する |
| NFR-1 / Security | image digest、jar SHA、environment inspection、artifact digest が receipt/manifest で再検証可能 |
| NFR-2 / Performance | spawn 120 秒、CLI 180 秒、各 stream 16 MiB の上限が実装・試験・計測で一致する |
| NFR-3 | 両 planner の falling proof、部分探索、drift、artifact 改竄が成功扱いにならない |
| FR-6 | Comprehensive test、追加行 coverage 100%、全 project quality gate green |

コード生成完了時にのみ各チェックボックスを実績に基づいて更新し、別途 code summary を作成する。本計画承認前は実装、テスト追加、state 更新、チェック完了を行わない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T03:41:14Z
- **Iteration:** 1
- **Scope decision:** approved — FR-3 — scripts/formal-verif/run-model-check.ts — reason: FR-3 の composition root が薄く、exit 0/1/2 と fail-closed artifact publishを正規サービスへ委譲し、責務混在やad-hoc条件分岐を持たないことを確認する — owner: amadeus/spaces/default/intents/260722-tla-plugin/inception/requirements-analysis/requirements.md#- FR-3.3: `scripts/formal-verif/run-model-check.ts` を新設する(run-skeleton-ci.ts は実験資産として無改変保持 — intent Q2)。CLI 契約: `bun scripts/formal-verif/run-model-check.ts --model <path.tla> --cfg <path.cfg> --out <dir>` を最小契約とし、モデル可変・単一 run の完全探索を実行する

実行機能と試験は充実しているが、未実行inspectionの偽failed、artifact予約後の例外漏れ、composition root責務集中、未実施Docker受入の完了扱いが本番安全性を阻害する。

### Findings

- Critical: acquisition/planner failureで未実行inspectionをfailedとして合成し、検証劇場禁止とplanner境界に違反する。
- Critical: artifact予約後のthrowing filesystem APIがfailure/publish境界外にあり、terminal manifestなし・exit1へ漏れ得る。
- Major: 407行composition rootにpath policy、planner別receipt、terminal reporting、artifact publishが混在する。
- Major: Docker実container受入未実施にもかかわらずStep11が完了扱い。U4/CIの必須ゲートへ明示的に引き継ぐ必要がある。

### Iteration 1 対応結果

- [x] `EnvInspection.status`へ`not-run`を追加した。domainのreceipt builderとplannerの固定inspection matrixをcanonicalとし、未実行検査は固定reason付き`not-run`、実行済みdriftだけ`failed`、platform非該当だけ`not-applicable`にした。composition rootのprovider別receipt配列を削除した。
- [x] path/cache filesystem portと予約後の単一execute/publish境界を追加した。予約前canonicalization例外、予約後cache mkdir/toolchain/publisher例外をHARNESS_ERROR/exit 2へ閉じ、可能な場合はfailure directoryへterminal manifest-lastで公開するblack-box回帰を追加した。
- [x] composition rootを407行から189行へ縮小した。path/cache、receipt/matrix、terminal reporter、予約後execution/publishを責務別moduleへ分離し、rootをparse→load→path validate→reserve→execute→reportに限定する静的責務テストを追加した。
- [x] Step 11を条件付き未完了へ戻した。Darwin性能実測は完了、Docker実container受入は未完了と明記し、U4/CI workflow_dispatchのmandatory gateへ引き継いだ。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T04:23:17Z
- **Iteration:** 2
- **Scope decision:** approved — FR-3 — scripts/formal-verif/run-model-check.ts — reason: 前回finding 1〜3が実装で閉包され、root 189行という主張が実質的な責務分離を伴うことを確認する — owner: amadeus/spaces/default/intents/260722-tla-plugin/inception/requirements-analysis/requirements.md#- FR-3.3: `scripts/formal-verif/run-model-check.ts` を新設する(run-skeleton-ci.ts は実験資産として無改変保持 — intent Q2)。CLI 契約: `bun scripts/formal-verif/run-model-check.ts --model <path.tla> --cfg <path.cfg> --out <dir>` を最小契約とし、モデル可変・単一 run の完全探索を実行する

前回4 findingsは閉包された。未実行検査はnot-run、予約後処理は専用境界、composition rootは189行、Docker実受入はU4 mandatory gateへ整合的に引き継いだ。

### Findings

- Minor: 外側catchの固定detailがbefore artifact reservationと断定し、予約後想定外例外では段階不一致になり得る。
- Minor: serial full CIはgreenだが既定parallelでU3外t257性能assertionが2回flaky failure。
