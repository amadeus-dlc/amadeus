# Code Generation Plan — mirror-github-gateway

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`domain-entities.md`、`logical-components.md`、`performance-design.md`、`security-design.md`、`reliability-design.md`、`scalability-design.md`、`unit-of-work.md`、`requirements.md`

## 目的

`mirror-github-gateway` Unit が所有する C5 Mirror GitHub Gateway（設計 G0〜G8）を、既存の TypeScript／ESM／Bun 構成へ実装する。対象は「明示 repository への安全な remote request を行う process 境界」に限定し、次の契約だけを実装する。

- 全 method は検証済み `RepositoryIdentity`（＋ mutation では C6 発行 permit）だけを受け取り、cwd／git remote／`gh` default repository を mutation 先の決定に使わない。
- shell string を作らず immutable argument array で `gh` を `shell:false` 起動し、operation 別の exact argv を組み立てる。
- 全 `gh api` command へ `--include` を付け、反復 HTTP envelope と JSON body を byte 境界で分離する。
- exit status／HTTP status／response shape／repository identity を検証し、失敗を classification・effect certainty・固定 redaction template を持つ `GatewayOutcome.failure` へ正規化する。
- readiness／find／view は mutation command を実行せず、create／edit／close は C6 発行の operation-bound permit を必須にする。
- state、mode、provenance、landing、stage routing、retry、warning、audit は所有しない（Unit 4 `mirror-operation-lifecycle` の C6〜C8 が所有）。

User Stories ステージは SKIP されているため、traceability は `unit-of-work-story-map.md` の Acceptance Slice（AS-02〜05／08）と各 nfr-requirements の GW-* ID を使用する。

## 現状と実装上の前提

- 正本は `packages/framework/core/tools/` である。`dist/`、self-install 面は生成物であり、正本編集後に `bun scripts/package.ts` ＋ `bun run promote:self` で同期する（本 Unit では手編集しない）。
- C0 `packages/framework/core/tools/amadeus-mirror-types.ts` は**コミット済み・凍結**であり、`MirrorGitHubGateway`・`RepositoryIdentity`・`CreateMirrorIssueInput`・`RemoteMirrorIssue`・`GatewayOutcome<T>`・`MirrorMutationPermit`・`MirrorEventIdentity` などを既に所有する。**本 Unit は C0 を再定義せず import のみ行う。**
- **C0 async 化（within-Bolt 修正、裁定 A）**: 凍結 C0 `MirrorGitHubGateway` の各メソッドは元は同期 `GatewayOutcome<T>` を返していたが、reliability/performance-design の termination state machine（SIGTERM→1s grace→SIGKILL→5s budget、leader-first-exit の settle）は同期返却の背後で実現不能。leader 裁定 A により C0 を `Promise<GatewayOutcome<T>>` へ async 化した。これは contract-policy Unit 成果（commit 5cf3c0397）への within-Bolt 修正で、`MirrorExecutionContext.gateway` 消費側（C6=未実装 Unit4、**呼出し元 0 件を grep 実測**）も async 前提になる。C1/C2/既存テストは gateway を使わないため typecheck で無影響を確認した。
- C0 `GatewayOutcome.failure` は `{ classification, summary, retryable, effect }` の 4 field（classification は `not-installed | unauthenticated | permission | rate-limit | network | api | command | invalid-response` に限定）である。nfr-design の "Public Contracts" 擬似コードが列挙する追加 field（operation／repository／exitCode／httpStatus／processPhase／termination）は**凍結された C0 union が正**であり、gateway は C0 の 4-field failure を返す。numeric exit／HTTP は固定 redaction template（`exit={n|none}; http={n|none}`）で summary に符号化して伝達する。C6 側のより詳細な observation／reconciliation は reliability-requirements の "Gateway Observation Contract" が Lifecycle Unit（Unit 4）へ委譲しており、本 Unit の責務外。
- `MirrorProcessRunner` port と `MirrorProcessRequest`／`MirrorProcessResult`／process profile は C0 に存在しない gateway 内部の port である。本 Unit の runner module で新規定義する。runner は非同期（`run(): Promise<MirrorProcessResult>`）で、SIGTERM→grace→SIGKILL→group 消滅確認を event 駆動で settle する。
- C6（guard coordinator）は Unit 4 に属し、本 Unit の capability factory を internal path から import する。本 Unit は capability module（factory＋validator）を提供するが、C6／Gateway の wiring は実装しない。
- runtime dependency は追加しない。`gh` は既存前提、process 実行は Node/Bun 互換 `node:child_process` の injected runner で行う。
- active test strategy は Comprehensive。unit／integration に加え security／performance／scalability 検証を計画する。

## 対象ファイル

| 種別 | ファイル | 予定 |
|---|---|---|
| Application code | `packages/framework/core/tools/amadeus-mirror-capability.ts` | 新規。G2 module-private WeakSet／factory／validator |
| Application code | `packages/framework/core/tools/amadeus-mirror-runner.ts` | 新規。G4 process runner port＋real runner（detached group、deadline、output cap、termination） |
| Application code | `packages/framework/core/tools/amadeus-mirror-gateway.ts` | 新規。G1 repository validator、G3 argv builder、G5 envelope parser、G6 issue parser／finder、G7 failure normalizer／redactor、G8 gateway orchestration |
| Unit test | `tests/unit/t270-amadeus-mirror-repository.test.ts` | 新規。G1 repository canonicalization／issue number／remote URL の pure test |
| Unit test | `tests/unit/t271-amadeus-mirror-capability.test.ts` | 新規。G2 factory／validator の membership／binding／偽造拒否 runtime test |
| Unit test | `tests/unit/t272-amadeus-mirror-gateway.test.ts` | 新規。fake runner による G8 operation matrix、argv golden、envelope 1／2／100 page、PR 除外、marker 0／1／2、redaction sentinel、cross-repo invalid、permit 強制、effect matrix、capacity byte-cap |
| Integration test | `tests/integration/t273-amadeus-mirror-runner.integration.test.ts` | 新規。fake-spawn／fake-clock による deadline／capacity／termination 決定性＋POSIX 実 process-group termination／descendant fixture |

`t270`〜`t273` は計画時点の次空き番号（実測: 現在最高 t269）である。PART 2 開始時に各 test level を再走査し、並行変更による競合があれば次の空き番号へ変更する。

## 実装手順

### Step 0: C0 `MirrorGitHubGateway` を async 化する（裁定 A）

- [ ] `packages/framework/core/tools/amadeus-mirror-types.ts` の `MirrorGitHubGateway` 6 メソッドを `Promise<GatewayOutcome<T>>` へ変更する（within-Bolt 修正、contract-policy 成果への越境を code-summary に明示申告）。
- [ ] `bun run typecheck` で contract-policy C1/C2・既存テストが壊れないこと、gateway 消費側が 0 件であることを実測確認する。
- [ ] mirror-types.ts は正本なので Step 12 で dist/self-install の C0 コピーを再生成する。

対象: `packages/framework/core/tools/amadeus-mirror-types.ts`
Trace: reliability acceptance #4、termination state machine の非同期要件

### Step 1: G2 Mutation Capability を実装する

- [ ] `amadeus-mirror-capability.ts` を追加し、module-private `WeakSet<object>`、`MirrorPermitBinding`（event／repository／operation／issueNumber）、`createMirrorMutationPermit(binding)`、`validateMirrorMutationPermit(permit, expected)` を定義する。
- [ ] factory は binding を frozen object にして WeakSet へ登録し、`MirrorMutationPermit`（C0 の非 export phantom brand を持つ型）へ cast して返す。永続化・再利用はしない。
- [ ] validator は WeakSet membership、operation 一致、repository canonical 一致、`create` では issueNumber absent／`edit`・`close` では positive number 一致、event identity 一致を検査し、不一致・非 member を拒否する。
- [ ] brand symbol と factory／validator を package barrel へ再 export せず、dependency test で factory=C6・validator=Gateway の import 方向を固定する（本 Unit では負テストを配置）。

対象: `packages/framework/core/tools/amadeus-mirror-capability.ts`
Trace: FR-3〜5、SEC elevation-of-privilege、GW-P06、TS-GW-05、AS-02〜05

### Step 2: G4 Process Runner port と real runner を実装する

- [ ] `amadeus-mirror-runner.ts` に `MirrorOperationProfile`（`version-auth | single | paginated`）、`MirrorProcessRequest`、`MirrorProcessResult`（`exited | spawn-error | timed-out | capacity-exceeded` と `MirrorTermination`）、`MirrorProcessRunner` port を定義する。
- [ ] profile 別 deadline（version-auth=10s、single=30s、paginated=60s）と stdout hard limit（single/version-auth=1 MiB、paginated=64 MiB）を spawn 前に固定する。
- [ ] `createMirrorProcessRunner(deps)` を real runner として実装し、POSIX は `spawn(exe, args, { shell:false, detached:true })`、positive PID を専用 PGID として保持する。PGID 取得失敗は `spawn-error`（not-started）にする。
- [ ] deadline／capacity trigger は `RunToken` 一致かつ状態 `running` のとき CAS で `terminating` を取得し、negative PGID へ SIGTERM→1s→SIGKILL、close／group 消滅確認を最大 5s。超過は `termination-failed`。leader-first-exit（child close 後に group 存続／判定不能）は再 signal せず即 `termination-failed`＋`residualDescendantPossible=true`。
- [ ] deps（`spawn`、`now`、`setTimeout`／`clearTimeout`、`kill`）を注入可能にし、fake-clock／fake-child での決定的検証を可能にする。domain／C6 を import せず process observation だけ返す。raw stderr は bounded tail のみ保持し gateway へ渡すが outcome/summary へは転記しない。

対象: `packages/framework/core/tools/amadeus-mirror-runner.ts`
Trace: PERF-GW-01〜05、REL-GW-03〜06、termination、TS-GW-02、DoS control

### Step 3: G1 Repository Validator を実装する

- [ ] `amadeus-mirror-gateway.ts` に `parseRepositoryIdentity(owner, name)`、`parseRepositoryUrlIdentity(url)`、`parseIssueNumber(value)` を pure に実装する。
- [ ] owner／name は ASCII 英数字と `-_.` のみ許可、trim せず先頭末尾空白・slash を拒否、canonical は lowercase `owner/name` を一度だけ生成する（表示用 case は保持しない）。
- [ ] remote `repository_url` は HTTPS URL として parse し、path が `/repos/{owner}/{name}` の 2 identity segment だけであることを確認して同じ lowercase canonical へ変換する。
- [ ] Issue number は positive safe integer だけ受理する。

対象: `packages/framework/core/tools/amadeus-mirror-gateway.ts`
Trace: GW-R01／04〜07、SEC spoofing、AS-02〜05

### Step 4: G3 Argv Builder を実装する

- [ ] operation 別 immutable argv builder（readiness×2、create、find、view、edit、close）を business-logic-model の Operation Command Contract の exact argv 形へ実装する。
- [ ] repository は canonical から `repos/{owner}/{name}/issues...` API path を生成し、title／body／labels は独立 argument（`-f key=value`）で shell escaping しない。
- [ ] `--include`（＋ find は `--paginate --slurp`、`-f state=all`、`-f per_page=100`）を固定する。

対象: `packages/framework/core/tools/amadeus-mirror-gateway.ts`
Trace: GW-P01／07、SEC tampering／injection、PERF-GW-05

### Step 5: G5 HTTP Envelope Parser と G6 Issue Parser／Finder を実装する

- [ ] envelope parser を「先頭から P 個の HTTP block（`HTTP/<ver> <3桁status> <reason> CRLF *(header CRLF) CRLF`）＋単一 slurped JSON outer array（要素数 P）＋末尾 LF＋EOF」grammar で実装する。単一 Issue operation は HTTP block 1 個＋JSON object。header block を raw bytes で消費し、最終 header 終端後だけを JSON bytes とする。status 非 2xx、page count 不一致、outer 非 array、途中 JSON、extra bytes は `invalid-response`。
- [ ] parse 前に各 `body` token の escape-decode 後 UTF-8 bytes ≤ 256 KiB を byte-level scanner で検証し、invalid／未完／超過は全体 failure（JSON.parse 呼ばない）。
- [ ] Issue parser は positive number、string title、nullable body（null→empty string 正規化）、closed union state（`open|closed`→`OPEN|CLOSED`）、canonical repository URL を検証する。find は `pull_request` property を持つ page element を Issue DTO parse 前に除外し、残りに完全 marker の body substring 一致で local filter する。0／1／複数を丸めない。page shape 不正は search 全体 failure（候補 0 へ変換しない）。

対象: `packages/framework/core/tools/amadeus-mirror-gateway.ts`
Trace: GW-R04、REL-GW-07／08、SCAL page／body、SEC disclosure、PR 除外

### Step 6: G7 Failure Normalizer／Redactor を実装する

- [ ] classification 判定を優先順位 `spawn ENOENT → readiness auth failure → HTTP 429 → 401 → 403 → timeout／DNS／connection → HTTP API error → generic command → success` で固定し、最初の一致だけ使う。
- [ ] effect certainty を read-only failure=`no-effect-confirmed`、mutation の spawn 前／spawn 失敗／readiness 失敗=`not-started`、mutation の process 開始後の全失敗=`outcome-unknown` に固定する。
- [ ] termination failure の effect は read-only=`no-effect-confirmed`、mutation=`outcome-unknown`。
- [ ] summary を `GitHub unavailable ({classification}; {effect}; exit={number|none}; http={number|none})` 固定 template で classification／effect／numeric exit／HTTP からのみ再構成する。未知値・非 numeric は `none` に正規化し、raw stderr／stdout／exception／header／token／path を一切転記しない。DNS/connection の network 判定は bounded stderr の allowlist 部分文字列で行い、summary へは転記しない。

対象: `packages/framework/core/tools/amadeus-mirror-gateway.ts`
Trace: 全 classification、REL-GW-02〜06、SEC information-disclosure、redaction

### Step 7: G8 Gateway orchestration を実装する

- [ ] `createMirrorGitHubGateway(runner)` を実装し、C0 `MirrorGitHubGateway` interface（readiness／createIssue／findIssuesByMarker／viewIssue／editIssue／closeIssue）を返す。
- [ ] readiness は `--version`→`auth status` の順で mutation なし。create／edit／close は `validateMirrorMutationPermit` を spawn 前に通し、不一致・偽造 permit を拒否（fail-fast throw）する。単一 `gh api` command で Issue object を返し、成功のための追加 view を行わない。
- [ ] 各 method は G1→G3→runner→G5→G6→G7 を経て C0 `GatewayOutcome<T>` を返す。C6／state／workflow engine を import しない。
- [ ] response repository 不一致は `invalid-response`。read-only の capacity/timeout は `no-effect-confirmed`、mutation は `outcome-unknown`。

対象: `packages/framework/core/tools/amadeus-mirror-gateway.ts`
Trace: FR-3〜7、REL-GW-01、GW-P02〜07、AS-02〜05／08

### Step 8: pure unit test（G1／G2）を作成する

- [ ] `tests/unit/t270-amadeus-mirror-repository.test.ts` に owner/name 許可・拒否（空白／slash／非 ASCII／大文字→canonical lowercase）、issue number（positive／0／負／非整数）、remote URL parse（一致／余分 segment／別 host）を golden で 12 件以上検証する。
- [ ] `tests/unit/t271-amadeus-mirror-capability.test.ts` に factory 生成 permit の validator 成功、operation／repository／issueNumber binding 不一致拒否、object literal／`as` cast／別 WeakSet 由来の偽造 permit 拒否、frozen 性を 8 件以上検証する。
- [ ] property/table test の期待値は被検実装を再利用せず独立 golden にする。各 file に `// covers:` と `// size: small` を付ける。

対象: `tests/unit/t270-*`, `tests/unit/t271-*`
Trace: GW-R05〜07、SEC elevation、REL identity

### Step 9: fake-runner gateway test（G3／G5／G6／G7／G8）を作成する

- [ ] `tests/unit/t272-amadeus-mirror-gateway.test.ts` に fake runner を test helper として置き、create/find/view/edit/close/readiness の operation matrix を検証する: exact argv（metacharacter を含む title/body が単一 argument）、repository API path 1 回、mutation command 回数（追加 view 0）、envelope 1／2／100 page、PR element 除外、marker 0／1／2 件を丸めない、cross-repo response=`invalid-response`、unauthenticated/permission/rate-limit/api/command/network classification と effect、固定 summary の sentinel 非露出、permit 欠落／偽造の拒否、64 MiB＋1／1 MiB＋1／256 KiB＋1 の capacity failure。
- [ ] fake runner は本番分岐を作らず port を実装するだけ（GW-P04）。golden 期待値は独立に定義する。`// covers:`、`// size: small`（fs／process 不使用）。

対象: `tests/unit/t272-*`
Trace: FR-3〜7、REL-GW-01／02／07／08、SEC spoofing／tampering／disclosure、PERF-GW-05、SCAL capacity、AS-02〜05／08

### Step 10: real runner integration test（G4）を作成する

- [ ] `tests/integration/t273-amadeus-mirror-runner.integration.test.ts` に fake-spawn／fake-clock を注入し、10／30／60s deadline と timer cleanup、capacity（1 MiB＋1／64 MiB＋1）trigger、SIGTERM→SIGKILL→settle 順序、leader-first-exit の `termination-failed`＋`residualDescendantPossible`＋reap 後 signal 0 を決定的に検証する。
- [ ] POSIX で実 child（`sleep` と descendant を spawn する fixture）を起動し、deadline 後に child／descendant 残存 0、cleanup ≤5s を実測する。Windows は skip し理由を明記する。
- [ ] fs／process を使うため integration suite に置き `// size: medium` を付ける。

対象: `tests/integration/t273-*`
Trace: PERF-GW-01〜04、REL termination、DoS、Iteration 2 leader-first-exit

### Step 11: E2E 非適用と既存 test configuration を維持する

- [ ] 本 Unit は利用者が直接起動する CLI、engine boundary wiring、実 GitHub mutation、配布物を所有しないため、偽 subprocess probe を E2E として追加しない。利用者可視の三モード journey・実 GitHub 面は Unit 4／`mirror-distribution-docs` へ trace する。
- [ ] 既存 Bun runner は `tests/{unit,integration,e2e}/t*.test.ts` を自動検出するため、`tests/run-tests.sh`、`package.json` を変更しない。
- [ ] 新規 test の `// covers:` を付け、coverage registry に差分が必要な場合だけ `bun tests/gen-coverage-registry.ts` で再生成する（`tests/.coverage-registry.json` は手編集しない）。
- [ ] PART 2 開始時・完了時に対象 test path の実在数を runner の `Ran ... across M files` と照合する。

対象: test configuration は原則変更なし
Trace: NFR-4、NFR-5、AS-06〜08 の後続 owner 明記

### Step 12: 正本→配布同期と品質 gate を実行する

- [ ] `packages/framework/core/tools/` を編集したため `bun scripts/package.ts` と `bun run promote:self` を実行し、`bun run dist:check`／`bun run promote:self:check` を green にする。
- [ ] unit／integration 対象ファイルを直接実行し、予定した全ファイルが実在・全件実行されたことを確認する。
- [ ] `bun run typecheck`（source／tests の strict 契約）、`bun run lint`（Biome、formatter/import organizer は実行しない）を通す。
- [ ] `bash tests/run-tests.sh --ci` は最終収束確認として実行し、本 Unit 外の既存 failure（t257 status-registry-migration = worktree loose-ref、Issue #1455）は baseline と分離報告する。
- [ ] diff を確認し、変更が本計画の対象ファイル＋生成物同期に限定され、state／GitHub／docs／周辺 refactor を含まないことを確認する。

対象: 上記 application code／test files＋生成物
Trace: 全対象要件、Comprehensive test strategy、project testing posture、Mandated dist/self-install sync

## 要件／Acceptance Slice トレーサビリティ

| 要件／Slice | 実装 Step | 主な検証 Step |
|---|---|---|
| GW-R01〜07（repository） | 3、4、5、7 | 8、9 |
| GW-P01〜07（process／permit） | 1、2、4、7 | 8、9、10 |
| REL-GW-01〜08（outcome／effect） | 2、6、7 | 9、10 |
| SEC STRIDE | 1、4、5、6、7 | 8、9、10 |
| PERF-GW-01〜05（deadline／single mutation） | 2、4、7 | 9、10 |
| SCAL（page／body／sequential／mutation） | 4、5、7 | 9、10 |
| AS-02〜05 | 1、3〜7 | 8、9、10 |
| AS-06（runtime 表示／CLI） | 本 Unit は C5 契約のみ | `mirror-operation-lifecycle` |
| AS-07（6 harness 配布） | C5 を後続配布 Unit へ提供 | `mirror-distribution-docs` |
| AS-08（境界限定通信） | 2、6、7 | 9、10。C6→C3／C8 統合は Unit 4 |

## 明示的な非対象

- API endpoint、web UI、database、repository／DAO、migration、Dockerfile、IaC、deployment artifact
- state codec／write（C3）、provenance／landing guard（C4）、operation executor／lifecycle coordinator（C6／C7）、status／prompt renderer（C8）
- `amadeus-mirror.ts`（既存 intent-first mirror CLI）、`amadeus-orchestrate.ts`、`amadeus-state.ts`、`amadeus-lib.ts` の一般的分割・整理
- `dist/`（同期を除く直接編集）、self-install tree、6 harness manifest、skill、Guide／Reference 文書
- C0 型の追加・再定義、boolean 設定互換 shim、generic external action、daemon／poller／scheduler、新規 runtime dependency
- 10,000 Issue×20 run の実 RSS 512 MiB ベンチマークハーネス自体（p95/RSS の CI ベンチジョブは Lifecycle/配布面の実行所有に委ねる）。本 Unit は memory を有界化する byte-cap 機構（64 MiB／1 MiB／256 KiB）を実装し、その enforcement を決定的 test で検証する

## 完了条件

- [ ] G1〜G8 の公開 contract が設計どおり実装され、G0（C0 型）は再定義せず import、runner は process observation だけ返し、gateway は C6／state／workflow を import しない。
- [ ] 全 operation が exact argv・explicit repository API path で 1 mutation・追加 view 0、response repository 不一致が `invalid-response`、marker 0／1／複数を丸めない。
- [ ] failure が classification／effect certainty／固定 redaction summary を持ち、raw diagnostic／sentinel を露出しない。permit 偽造・binding 不一致を spawn 前に拒否する。
- [ ] Comprehensive 戦略に対応する unit／integration／security／performance／scalability test が追加され、E2E 非適用と後続 owner が明記される。
- [ ] typecheck、Biome lint、focused tests、dist:check、promote:self:check が green。本 Unit 外の application code／tests／生成物／state を不要に変更していない。
