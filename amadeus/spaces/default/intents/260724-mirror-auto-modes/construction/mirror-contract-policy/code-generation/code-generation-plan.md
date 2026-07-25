# Code Generation Plan — mirror-contract-policy

## 目的

`mirror-contract-policy` Unit が所有する C0 Mirror Types、C1 Mirror Config Resolver、C2 Mirror Policy を、既存の TypeScript／ESM／Bun 構成へ実装する。対象は次の契約に限定する。

- `auto-mirror` は厳密な文字列 `off | prompt | auto` のみを受理し、未指定時は `prompt` とする。
- Global → Space → Intent の既存優先順位を維持し、boolean を含む無効値は全件診断して fail closed にする。
- Intent UUID、engine-owned boundary instance、operation から安定した event identity／event key を生成する。
- lifecycle／manual、mode、boundary applicability、same-event skip、pending、completion chain を副作用のない policy decision として扱う。
- filesystem write、state mutation、GitHub、lifecycle routing、presentation、配布生成、周辺 core module の refactor は行わない。

User Stories ステージは SKIP されているため、story traceability は `unit-of-work-story-map.md` で要件の受け入れ基準から正規化された Acceptance Slice（AS-01／03／04／05）を使用する。

## 現状と実装上の前提

- 正本は `packages/framework/core/tools/` である。`dist/`、`.codex/tools/` などの生成・self-install 面は本 Unit では直接編集しない。
- `packages/framework/core/tools/amadeus-mirror-config.ts` は既に存在するが、現在は boolean と既定 `false` を扱うため、三モード契約へ置換する。
- `packages/framework/core/tools/amadeus-mirror-types.ts` と `packages/framework/core/tools/amadeus-mirror-policy.ts` は新規作成する。
- 既存 selector は `amadeus-lib.ts` の `workspaceRoot`、`activeSpace`、`activeIntent`／`recordDir` 系を再利用する。selector 自体の一般 refactorは行わない。
- 現在の `amadeus-orchestrate.ts` は旧 `resolve(...)`／boolean 結果を消費している。C7 lifecycle wiring は後続の `mirror-operation-lifecycle` Unit の責務であり、本 Unit では coordinator の決定ロジックを実装しない。PART 2 では typecheck を壊さないために必要な場合だけ、boolean 設定入力を受理しない狭い内部移行 seam を C1 側に置き、C7 側の意味変更や周辺 refactorは行わない。
- runtime dependency は追加しない。C0 は type-only leaf、C2 は C0 のみを importし、C1 だけが read-only filesystem I/O を持つ。
- active test strategy は Comprehensive。NFR があるため unit／integration に加え security／performance 検証を計画する。

## 対象ファイル

| 種別 | ファイル | 予定 |
|---|---|---|
| Application code | `packages/framework/core/tools/amadeus-mirror-types.ts` | 新規。C0 の共有 DTO／判別 union の正本 |
| Application code | `packages/framework/core/tools/amadeus-mirror-config.ts` | 変更。C1 の read-only collector と pure parser |
| Application code | `packages/framework/core/tools/amadeus-mirror-policy.ts` | 新規。C2 の event identity と pure decision |
| Unit test | `tests/unit/t257-amadeus-mirror-config.test.ts` | 変更。旧 boolean 契約を三モード／invalid 契約へ置換 |
| Unit test | `tests/unit/t268-amadeus-mirror-policy.test.ts` | 新規候補。event key、mode、skip、pending、completion chain |
| Integration test | `tests/integration/t257-amadeus-mirror-config.integration.test.ts` | 変更。実 filesystem／selector／read-only 契約 |
| Integration test | `tests/integration/t268-amadeus-mirror-contract-policy.integration.test.ts` | 新規候補。C0→C1→C2 contract、依存境界、security |
| Integration test | `tests/integration/t269-amadeus-mirror-contract-policy-performance.integration.test.ts` | 新規候補。固定 fixture の performance budget |

`t268`／`t269` は計画時点の次空き番号である。PART 2 開始時に各 test level を再走査し、並行変更による競合があれば次の空き番号へ変更する。

## 実装手順

### Step 1: C0 の閉じた domain contract を追加する

- [ ] `packages/framework/core/tools/amadeus-mirror-types.ts` を追加し、設計済みの `MirrorMode`、`MirrorOperation`、`MirrorBoundary`、`MirrorEventIdentity`、`MirrorStateSnapshot`、receipt、prompt、decision、repository／gateway／repair 関連 DTO を immutable な判別 union として定義する。
- [ ] `MirrorMode` を `off | prompt | auto`、`MirrorOperation` を `create | sync | close` に閉じ、PR／merge／release／publish／deploy へ一般化できる action 型を追加しない。
- [ ] C0 から filesystem、process、GitHub、C1／C2／C7 を import せず、type-only leaf を維持する。
- [ ] config、policy、後続 Unit が同じ DTO を再定義せず C0 から importできる公開 contract にする。

対象: `packages/framework/core/tools/amadeus-mirror-types.ts`  
Trace: FR-1、FR-2、FR-7、FR-10、NFR-1、NFR-3、NFR-4、NFR-5、AS-01、AS-03、AS-04、AS-05

### Step 2: C1 の pure config parser を三モード化する

- [ ] `parseMirrorConfigLayers(layers)` を pure function として実装し、厳密な文字列 `off | prompt | auto` だけを受理する。
- [ ] 全 layer 未指定時は `prompt`、複数指定時は Global → Space → Intent の後勝ちで解決し、寄与した source path を安定順で返す。
- [ ] boolean `true`／`false`、未知文字列、数値、`null`、array、object、unknown property、malformed root を変換せず拒否する。
- [ ] 1件でも invalid があれば resolved configを返さず、layer、workspace-relative path、key、actual type、expected valuesを含む全 issue を layer 順で返す。
- [ ] unknown variantを既定 `prompt` へ丸めず exhaustive に扱う。

対象: `packages/framework/core/tools/amadeus-mirror-config.ts`  
Trace: FR-1、FR-2、FR-6、NFR-1、NFR-3、NFR-4、AS-01、AS-05、CP-C01〜CP-C07、SEC-D-03／04

### Step 3: C1 の read-only collector／selector facade を実装する

- [ ] `readMirrorConfigLayers(projectDir, explicitIntentDir?)` と `resolveMirrorConfig(...)` を、既存 active space／explicit Intent／active Intent selector に委譲する狭い facade として実装する。
- [ ] Global、Space、Intent の候補を各最大1回だけ読み、absent file は `present: false`、selector ambiguity／permission／I/O／不安定file は redacted `read-failure` issue にする。
- [ ] selector が返す root 内への realpath containment、regular file、最大 1 MiB、開始／終了 `fstat` による変更検出、1 MiB + 1 byte で打ち切る bounded read を実装する。
- [ ] symlink escape、device／FIFO、oversize、read 中の変更を成功扱いにせず、raw bytes、absolute home path、credential を diagnosticへ残さない。
- [ ] write API、cache、mutable singleton、background process、network、GitHub 呼出しを追加しない。
- [ ] 既存 C7 consumer の移行が必要な場合も C1 内の狭い seam に限定し、旧 boolean 設定値を受理する互換 shim は作らない。

対象: `packages/framework/core/tools/amadeus-mirror-config.ts`  
Trace: FR-1、FR-6、FR-7、NFR-1、NFR-3、NFR-5、AS-01、AS-05、SEC-CP-01／02／04／05／06／08／09、PERF-CP-01／01A／03／07

### Step 4: event identity／event key を pure に実装する

- [ ] `mirrorEventIdentity(intentUuid, boundary, operation)` を追加し、呼出し時刻、session、呼出し回数、表示用 phase／stage detail を identity に含めない。
- [ ] `mirrorEventKey(event)` を versioned tuple `["mirror-event", 1, intentUuid, boundary.kind, boundary.instance, operation]` の標準 JSON → UTF-8 → paddingなし base64url として実装し、`mirror-event:v1:` をprefixする。
- [ ] 同じ boundary instance／operation は同じ key、異なる instance／operation は別 keyになることを固定する。
- [ ] receipt keyの生成経路をこの関数へ集約し、object key順や locale に依存させない。

対象: `packages/framework/core/tools/amadeus-mirror-policy.ts`  
Trace: FR-10、NFR-2、NFR-3、NFR-4、AS-03、AS-04、AS-05、CP-E01〜CP-E08、SEC-D-05、PERF-D-03

### Step 5: mode／boundary／skip／pending の pure policy decision を実装する

- [ ] `decideMirrorAction(input)` を lifecycle／manual の判別 union 入力として実装する。
- [ ] lifecycle は `off` を pending／既存Issueより先に抑止し、`prompt` は event単位の確認、`auto` は同じ eventの execute を返す。
- [ ] manual は modeを持たず、明示された単一operationを execute にする。ただし安全guard通過を表現せず、後続 C6 の責務を型／コメントで明確にする。
- [ ] operationが boundary に非適用なら `not-applicable`、同じ event keyに `skipped-for-event` receipt があれば再質問せず抑止する。
- [ ] pending／attempted／prepared の同一operationは同じ event／operation を retry／reconcile 対象として返し、別 eventのskip／warningを誤参照しない。
- [ ] `approveMirrorPrompt(...)` で保存済み expected event／operation と回答の完全一致を要求し、別event／別operationの注入を拒否する。
- [ ] C2 から filesystem、state write、GitHub、question文字列、warning文字列、安全guard、orchestrator routingを排除する。

対象: `packages/framework/core/tools/amadeus-mirror-policy.ts`  
Trace: FR-2、FR-6、FR-7、FR-10、NFR-1、NFR-2、NFR-3、NFR-5、AS-01、AS-03、AS-04、AS-05

### Step 6: workflow completion の単一operation selector を実装する

- [ ] `nextCompletionOperation(input)` を current workflow completion instance に限定した pure selector として実装する。
- [ ] Issueなし／create receiptなしは `create`、create成功または既存Issueありは `sync`、sync成功は `close` の順だけを返す。
- [ ] current receipt が `prepared | attempted | pending` なら同じoperationを返し、`skipped-for-event | safety-blocked | abandoned` なら後続を返さない。
- [ ] phase、manual、別completion instance の receipt を除外し、1回のcallで複数operationやloopを返さない。
- [ ] corrupted／未知 statusを暗黙にterminalやpromptへ丸めず fail fast にする。

対象: `packages/framework/core/tools/amadeus-mirror-policy.ts`  
Trace: FR-5、FR-10、NFR-1、NFR-2、NFR-3、NFR-4、AS-04、AS-05、CP completion rules、PERF-D-04

### Step 7: Comprehensive unit testsを作成する

- [ ] `tests/unit/t257-amadeus-mirror-config.test.ts` の旧 boolean／既定off assertionを削除し、三モード、既定prompt、8通りのlayer存在組合せ、優先順位、boolean拒否、未知値／root／key、全issue集約、決定的sourceを10〜15件以上で検証する。
- [ ] `tests/unit/t268-amadeus-mirror-policy.test.ts` を追加し、event key golden vector、同一／別instance、off／prompt／auto、manual、not-applicable、same-event skip、distinct-event再評価、pending retry、prompt回答照合、completion create→sync→closeと前段terminalを10〜15件以上で検証する。
- [ ] C0 の型契約は専用runtime APIをテスト都合で増やさず、C1／C2 test fixtureの `satisfies`、exhaustive helper、`tsc` で closed union と readonly shapeを検証する。
- [ ] property/table test の期待値は実装関数を再利用して算出せず、独立した golden／decision table にする。
- [ ] 各 test fileに `// covers:` と実測 substrateに合う `// size: small` を付ける。

対象: `tests/unit/t257-amadeus-mirror-config.test.ts`、`tests/unit/t268-amadeus-mirror-policy.test.ts`  
Trace: FR-1、FR-2、FR-7、FR-10、NFR-3、NFR-4、AS-01、AS-03、AS-04、AS-05

### Step 8: filesystem／contract／security integration testsを作成する

- [ ] `tests/integration/t257-amadeus-mirror-config.integration.test.ts` を三モードへ更新し、実 filesystemで absent→prompt、Global／Space／Intent precedence、explicit Intent、non-default space、invalid layer全体fail、read-only byte snapshotを検証する。
- [ ] `tests/integration/t268-amadeus-mirror-contract-policy.integration.test.ts` を追加し、selector→collector→parser→event→decision の一方向flowを検証する。
- [ ] symlink escape、directory／FIFO等のnon-regular file、permission failure、1 MiB超、TOCTOU相当のunstable read、secret sentinel／absolute path非露出を検証する。
- [ ] C2 の import graphに `node:fs`、`node:child_process`、network、GitHub adapter、process environment readerがなく、module importとpolicy callでI/Oが0件であることを検証する。
- [ ] filesystemを使う test は project ruleどおり integration suiteへ置き、`// size: medium` を付ける。

対象: `tests/integration/t257-amadeus-mirror-config.integration.test.ts`、`tests/integration/t268-amadeus-mirror-contract-policy.integration.test.ts`  
Trace: FR-1、FR-6、FR-7、FR-10、NFR-1、NFR-4、NFR-5、AS-01、AS-05、SEC-CP-01〜09

### Step 9: performance NFRを固定fixtureで検証する

- [ ] `tests/integration/t269-amadeus-mirror-contract-policy-performance.integration.test.ts` を追加し、pure policy p95 ≤ 1 ms、selector＋最大3 read＋policy p95 ≤ 50 ms を上流指定のwarm-up／測定回数／3 run中央値／nearest-rank p95で検証する。
- [ ] 3 layer各1 KiB以下、receipt最大3件、warning 1件、mode=`auto`、completion `sync` の固定fixtureを使用する。
- [ ] missing measurement、timeout、非数値を fail closed にし、relative baselineやmain artifactとの比較は使わない。
- [ ] repeated input 100回の decision canonical JSON bytes一致、selector 1回、read最大3回、write 0回を合わせて検証する。

対象: `tests/integration/t269-amadeus-mirror-contract-policy-performance.integration.test.ts`  
Trace: NFR-2、NFR-4、NFR-5、PERF-CP-01〜07、PERF-D-01〜05

### Step 10: E2E適用性と既存test configurationを維持する

- [ ] 本 Unit は利用者が直接起動する CLI、engine boundary wiring、GitHub mutation、配布物を所有しないため、偽のsubprocess probeをE2Eとして追加しないことを確認する。
- [ ] built CLI startup込みの PERF-CP-08、manual／lifecycle双方のguard、利用者可視の三モードjourneyは、実行面を所有する `mirror-operation-lifecycle` Unit の E2E／integration testへtraceする。6ハーネス配布journeyは `mirror-distribution-docs` Unitのownerとする。
- [ ] 既存 Bun runnerは `tests/{unit,integration,e2e}/t*.test.ts` を自動検出するため、`vitest.config`／`jest.config`、`tests/run-tests.ts`、`tests/run-tests.sh`、`package.json` を変更しない。
- [ ] 新規testの `// covers:` headerを追加し、coverage registryの生成結果に差分が必要な場合だけ `bun tests/gen-coverage-registry.ts` で再生成する。`tests/.coverage-registry.json` は手編集しない。
- [ ] PART 2開始時と完了時に対象test pathの実在数を確認し、runnerの `Ran ... across M files` と照合する。

対象: test configurationは原則変更なし。必要時のみ generator出力  
Trace: NFR-4、NFR-5、AS-05。PERF-CP-08→`mirror-operation-lifecycle`、AS-06／AS-08 E2E→`mirror-operation-lifecycle`、AS-07 E2E→`mirror-distribution-docs`

### Step 11: focused verificationと品質gateを実行する

- [ ] unit対象ファイルを直接実行し、予定した全ファイルが実在して全件実行されたことを確認する。
- [ ] integration対象ファイルを直接実行し、予定した全ファイルが実在して全件実行されたことを確認する。
- [ ] `bun run typecheck` で source／tests双方の strict TypeScript contractを検証する。
- [ ] `bun run lint` で Biome違反がないことを検証する。formatter／import organizerは実行しない。
- [ ] `bash tests/run-tests.sh --unit --filter "t257|t268"` と `bash tests/run-tests.sh --integration --filter "t257|t268|t269"` を実行し、ファイル数とrunner summaryを照合する。
- [ ] `bash tests/run-tests.sh --ci` は後続 Unitとの統合後の最終収束確認として実行し、本 Unit外の既存failureはbaselineと分離して報告する。
- [ ] diffを確認し、application codeとtestsの変更が本計画の対象ファイルに限定され、`dist/`、self-install面、state、GitHub、docs、周辺refactorを含まないことを確認する。

対象: 上記 application code／test files  
Trace: 全対象要件、Comprehensive test strategy、project testing posture

## 要件／Acceptance Slice トレーサビリティ

| 要件／Slice | 実装Step | 主な検証Step |
|---|---|---|
| FR-1、AS-01 | 1〜3 | 7、8 |
| FR-2、AS-01／03／04 | 1、5 | 7、8 |
| FR-5、AS-04 | 1、6 | 7、8 |
| FR-6、AS-05 | 2、3、5 | 7〜9 |
| FR-7、AS-05 | 1、3、5 | 7、8 |
| FR-10、AS-03／04／05 | 1、4〜6 | 7、8 |
| NFR-1 | 1〜5 | 7、8 |
| NFR-2 | 4〜6 | 7〜9 |
| NFR-3 | 1〜6 | 7、8、11 |
| NFR-4 | 1〜6 | 7〜11 |
| NFR-5 | 3、5 | 8〜10 |
| AS-06 | 本 UnitはC0 contractのみ。runtime表示／CLIは後続Unit | `mirror-operation-lifecycle` のintegration／E2E |
| AS-07 | C0 contractを後続配布Unitへ提供 | `mirror-distribution-docs` のdistribution／E2E |
| AS-08 | pure C2／背景I/Oなしを保証 | 8、9。境界限定通信は後続Unit |

## 明示的な非対象

- API endpoint、web UI、database、repository／DAO、migration、Dockerfile、IaC、deployment artifact
- GitHub Gateway、state codec／write、provenance／landing guard、operation executor、lifecycle coordinator、status／prompt renderer
- `amadeus-orchestrate.ts`、`amadeus-state.ts`、`amadeus-lib.ts` の一般的な分割・整理
- `dist/`、self-install tree、6ハーネスmanifest、skill、Guide／Referenceの日英文書
- boolean設定の互換shim、generic external action、daemon、poller、scheduler、新規runtime dependency

## 完了条件

- [ ] C0／C1／C2 の公開contractが設計どおり実装され、C0はleaf、C2はpure、C1はread-onlyである。
- [ ] `off | prompt | auto`、既定`prompt`、Global < Space < Intent、boolean拒否、invalid全件診断がテストで固定される。
- [ ] event keyが同一boundary再入で安定し、skip／pending／completion chainがcurrent eventだけを参照する。
- [ ] Comprehensive戦略に対応するunit／integration／security／performance testが追加され、E2E非適用と後続ownerが明記される。
- [ ] focused tests、typecheck、Biome lintが成功し、既存Bun test configurationを不要に変更していない。
- [ ] 本 Unit外のapplication code、tests、生成物、stateを変更していない。
