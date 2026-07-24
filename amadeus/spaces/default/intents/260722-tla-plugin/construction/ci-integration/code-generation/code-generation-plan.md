# U4 ci-integration コード生成計画

## 計画の状態

- Step 1〜14 はローカル実装・検証済み。外部状態を変更する Step 15 の実 `workflow_dispatch` だけが未完了であり、ユーザー承認前には実行しない。
- 対象はU4 `ci-integration`に限定する。現在のdirty worktreeにあるU1/U3/U5および他作業者の変更を戻さない。
- 上流トレーサビリティの正本は、U4 Functional Design / NFR Requirements / NFR Design、FR-5.1〜FR-5.4、FR-6、C-7、BR-U4-1〜BR-U4-7、U3 Step 11引継ぎとする。

## 予定する変更面

- `.github/workflows/ci.yml`: 許容済みの3変更だけを行う（`workflow_dispatch`、独立`formal-model-check` job、`changes`の空`BASE_SHA`分岐）。
- `.github/workflows/formal-verification.yml`: 削除のみ。代替workflowを新設しない。
- `scripts/formal-verif/`: 固定値を複製せず、U3のCLI・Docker planner・artifact契約を実CIで検証するために必要な最小のU4受入ヘルパーだけを追加する。
- `tests/unit/`、`tests/integration/`、`tests/e2e/`、`tests/formal-verif/support/`、`tests/fixtures/`: workflow構造、純粋な判定、実shell境界、回帰用fixtureを追加する。
- `scripts/formal-verif/run-model-check.ts`、planner、artifact publisherの公開契約は変更しない。U3契約に不足が判明した場合はU4内で推測補完せず、設計差戻しとして停止する。

## 実装計画

1. [x] **既存CIとU3契約を実装前baselineとして固定する**
   - 現在の`.github/workflows/ci.yml`について、既存トリガー、global `env`、7 jobs、`needs`、job条件、step本文を保護対象としてfixture化する。U4で許容された3変更を除去した投影がbaselineと全文一致することを、後続テストの独立オラクルにする。
   - U3のcanonical値を正本として固定する。Docker imageは`FIXED_DOCKER_IMAGE`（`eclipse-temurin:26-jdk@sha256:939e35776c4582f5454276c42a9ca3825df1b4a983ed2edd4cd9b4e130bb0eeb`）、jarは`FIXED_TLC_ARTIFACT_DESCRIPTOR`（TLA+ v1.7.4公式release URL、SHA-256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`）から実行時に読み出し、workflowへ別定義を手書きしない。
   - U3はcheckout配下の`--out`を`OUT_CONFLICT`で拒否するため、出力rootを`${RUNNER_TEMP}/amadeus-formal-model-check`とする。6 runの出力dirを分離し、同一親の`.amadeus-tlc-cache`だけを共有してwarm cacheを成立させる。
   - トレーサビリティ: FR-5.2、FR-5.4、FR-6.3、NFR-1〜NFR-3、BR-U4-2、BR-U4-3、BR-U4-7、U3 C-2/C-3/artifact契約。

2. [x] **テストfixtureと純粋な検証モデルを先に作る**
   - protected CI baseline、dispatch/push/pull_requestのevent入力、成功・bootstrap失敗・HARNESS_ERROR・artifact不整合・upload失敗の証跡fixtureを、各テストが独立して複製・変異できる形で用意する。
   - テスト側の`FormalJobConfig` parser、許容3変更を除去するworkflow投影、terminal-state優先順位reducerを純粋関数として作り、production workflow本文の文字列検索だけに依存しないオラクルを置く。
   - fixtureに意図的な欠陥（event条件変更、可変tag、digest/checksum変更、`ci-success.needs`追加、artifact欠落、旧workflow復活）を1件ずつ注入し、各guardが実際に赤になることを先に確認する。
   - トレーサビリティ: FR-5.1〜FR-5.4、FR-6.4、BR-U4-1〜BR-U4-7、NFR-3。

3. [x] **unit testで設定値・schema・終端判定を固定する**
   - `FormalJobConfig`が、verbatimなevent条件、`ubuntu-latest`、30分timeout、`contents: read`、secret/write/privileged不在、固定Action SHA、Bun 1.3.13、digest形式、公式jar URL/SHA-256だけを受理することを検証する。
   - CI受入証跡schemaを、run種別（warm-up 1件、measured 5件）、runId、CLI/spawn時間、exit/outcome、manifest path/identity、EnvReceipt identity、Docker command receipt、cleanup receiptを持つ判別可能な形にする。各フィールドはfinal verifierまたはartifact consumerが必ず消費し、文書化だけの未使用フィールドを作らない。
   - terminal-stateの優先順位を`bootstrap failure > model-check HARNESS_ERROR > artifact verify failure > upload failure > DETECTED > NOT_DETECTED`に固定し、複合失敗でも最高優先の原因を失わないことをtable testで検証する。
   - トレーサビリティ: U4 Domain Entities、Reliability Design、Security Design、BR-U4-2、BR-U4-5〜BR-U4-7、NFR-3。

4. [x] **workflow構造のintegration testを追加する**
   - 実FS上の`.github/workflows/ci.yml`をYAMLとしてparseし、`on.workflow_dispatch`、job-level `if: github.event_name == 'workflow_dispatch'`、独立job、timeout、permissions、step順、`if: always()`、artifact名を構造で検証する。
   - `formal-model-check`が`changes`へ依存せず、`ci-success.needs`にも含まれないこと、既存7 jobsのcritical pathへedgeを追加しないことを検証する。
   - 許容3変更を除去したworkflow全文がbaseline fixtureと一致し、`.github/workflows/formal-verification.yml`が不在であることを検証する。
   - トレーサビリティ: FR-5.1、FR-5.3、FR-5.4、BR-U4-1、BR-U4-3、BR-U4-4、Logical Components。

5. [x] **dispatch専用の`changes`最小分岐を実装し、push/PR回帰を固定する**
   - `BASE_SHA`が空の`workflow_dispatch`だけで`full=false`、`drift=false`、`coverage=false`を`GITHUB_OUTPUT`へ出し、既存bandを正常skipへ収束させる。
   - pushのzero SHA、通常push、pull_requestの3経路は既存`list_changed_files`分岐と出力をbyte-equivalentに保つ。空SHA判定を既存zero SHA判定へ混同しない。
   - event別shellを一時Git repositoryでblack-box実行し、dispatchでは`git diff "" HEAD`を呼ばずexit 0、push/PRではbaselineと同じchanged-file集合になることをE2Eで確認する。
   - トレーサビリティ: FR-5.4、BR-U4-3、Reliability Requirements、既存band無回帰。

6. [x] **workflow_dispatch限定の独立formal jobと最小権限を追加する**
   - `on.workflow_dispatch: {}`を追加し、`formal-model-check`へverbatimなjob-level条件、`runs-on: ubuntu-latest`、`timeout-minutes: 30`、job-level `permissions: { contents: read }`を設定する。dispatch input、secret、write token、OIDC、privileged containerを追加しない。
   - 新規jobが使う`actions/checkout`、`oven-sh/setup-bun`、`actions/upload-artifact`は、実装時に公式repositoryのtag refを実測した40桁commit SHAへ固定し、人間可読な版コメントを併記する。setup-bunは設計済みSHA`0c5077e51419868618aeaa5fe8019c62421857d6`（v2）とBun 1.3.13を用いる。
   - checkout SHA、Bun version、runner OS/arch、workflow run ID/attempt、head SHAをruntime receiptへ記録する。既存jobsの可変tagは本Unitの変更対象にしない。
   - トレーサビリティ: FR-5.1、FR-5.2、NFR Security Requirements、Security Design、Tech Stack Decisions。

7. [x] **固定供給物をcanonical定義からbootstrapし、cold取得を計測外へ分離する**
   - checkout後にBunを固定setupし、U3 public exportからimage refとjar descriptorを読み出す。値をworkflow内で再定義せず、後続step outputとbootstrap receiptへ渡す。
   - 公式jarを版固定HTTPS URLから取得し、固定SHA-256を`sha256sum -c`で検証する。Docker daemon可用性を確認し、固定digest imageを明示pullしてRepoDigest一致を確認する。これらをwarm cache準備として計測5回の外へ置く。
   - U3 CLI自身のartifact acquisition、jar再読込checksum、Docker plannerのspawn直前再検証は省略しない。CI bootstrap検証をU3検証の代替にしない。
   - checkout、Bun setup、jar取得/checksum、Docker pull/inspectの各失敗をloudなbootstrap failureとして記録し、model checkを成功扱いにしない。
   - トレーサビリティ: FR-5.2、BR-U4-2、NFR-1、Supply Chain、U3 `FIXED_TLC_ARTIFACT_DESCRIPTOR` / `FIXED_DOCKER_IMAGE`。

8. [x] **U3 CLIを実Docker containerでwarm-up 1回・計測5回実行する**
   - production entrypoint `bun scripts/formal-verif/run-model-check.ts --model specs/tla/FormalElection.tla --cfg specs/tla/FormalElection.cfg --out <run固有dir> --provider docker`を、test modeなしで計6回subprocess実行する。
   - 各runのCLI wall timeを単調時計で測る。Docker executableの透過wrapperは`docker run`だけの開始・終了・argv・exitを記録して実`/usr/bin/docker`へshellなしで委譲し、spawn時間を実container境界から測る。inspect/pullとrunを混同しない。
   - warm-up成功後に5計測を行い、全6回`NOT_DETECTED`かつexit 0、計測5回すべてspawn 120,000ms未満、CLI 180,000ms未満を必須とする。1回でも非0、閾値以上、計測欠落ならjobを赤にする。
   - 各run後にrunId由来container名の不存在を`docker ps -a`で確認し、timeout/失敗時は限定された当該containerだけを停止・削除する。広いname filterや全container cleanupを行わない。
   - トレーサビリティ: BR-U4-7、Performance Design、Reliability Design、U3 Step 11、NFR-1、NFR-2。

9. [x] **各runのmanifest・receipt・Docker境界を独立再検証する**
   - `amadeus.model-check-manifest.v1`について、manifest-lastの実在、`partial=false`、`errorCode=null`、outcome `NOT_DETECTED`、exit 0、runId、時刻、`expectedArtifacts`を検証する。列挙artifactを再読込し、bytesとSHA-256をmanifestへ照合する。
   - `completion-marker.json`、`env-receipt.json`、`tlc-stdout.bin`、`tlc-stderr.bin`の実在と共通runIdを検証する。streamはmanifest宣言のbytes/digestと一致し、U3の16 MiB上限内であることを要求する。正常実行時の`tlc-stderr.bin`は0 byteを許容するが、`tlc-stdout.bin`およびJSON artifactの空内容は拒否する。
   - `amadeus.env-receipt.v1`はDocker適用3検査（image-digest、jar-sha256、network-deny）が`passed`、JDK/sandbox 2検査が理由付き`not-applicable`であることをexact matrixで検証する。`failed`、`not-run`、未知inspection、重複inspectionを拒否する。
   - Docker command receiptで固定digest、`--network=none`、workspace/jarのread-only mount、scratchだけのwrite mount、`--rm`、runId由来name、非privilegedを検証する。cleanup receiptと突き合わせ、成功・失敗を問わず残存container 0を要求する。
   - トレーサビリティ: BR-U4-5、BR-U4-7、Reliability Requirements、Security Requirements、U3 artifact/receipt schema。

10. [x] **成功・失敗双方のCI artifact schemaを完成させる**
    - formal evidence rootに、runtime/bootstrap receipt、warm-up 1件、measured 5件、raw CLI/spawn sample、各U3 terminal directory、Docker command/cleanup receipt、総合verification resultを保存する。schema名・version・必須keyを固定し、path traversal、symlink、重複runId、未知artifactを拒否する。
    - bootstrap途中で停止した場合も`bootstrap-failure.json`へschema、失敗step、errorCode、固定image ref、jar descriptor identity、GitHub run identityを保存する。取得できなかった値は成功値で埋めず、明示的な未取得状態にする。
    - artifact名へ`${{ github.run_id }}`と`${{ github.run_attempt }}`を含め、同時dispatch/rerunの上書きを防ぐ。保存対象にsecret、環境変数全量、不要なhost絶対pathを含めない。
    - トレーサビリティ: BR-U4-5、Reliability Design、Scalability Design、Security Design、NFR-3。

11. [x] **always evidence/uploadとterminal-stateの優先順位を配線する**
    - checkout以後のbootstrap/model-check/verifyはstep outcomeと実exitを捕捉し、必要箇所だけ`continue-on-error: true`で後続証跡処理へ進める。検証失敗をgreenへ変換しない。
    - 証跡統合、final verify、artifact upload、terminal-stateは`if: always()`で実行する。uploadは`if-no-files-found: error`とし、upload自身も終端判定へ結果を渡す。
    - terminal-stateはupload後に一度だけ実行し、unit test済み優先順位で元の最高優先exitを再送出する。bootstrap失敗後の未実行run、artifact verify失敗、upload失敗をNOT_DETECTEDへ丸めない。
    - GitHub step summaryへimage/jar identity、6 runのoutcome、5 raw timing、artifact名、最終判定を出すが、summaryを機械証跡の代替にしない。
    - トレーサビリティ: BR-U4-5、BR-U4-7、Reliability Requirements、Reliability Design、Logical Components。

12. [x] **旧formal workflowを削除し、二重実行面を閉じる**
    - `.github/workflows/formal-verification.yml`を削除する。リネーム、deprecated stub、条件付き保持、新しいformal専用workflowは作らない。
    - repository内の旧workflow path参照を棚卸しし、実験履歴を表すfixture/provenance参照は意味を確認して保持する。現行CI入口を指す利用者向け参照だけを`ci.yml`へ更新する。
    - `formal-model-check`の実行面が`ci.yml`のworkflow_dispatchだけであることをintegration testで固定する。
    - トレーサビリティ: FR-5.3、BR-U4-4、Tech Stack Decisions。

13. [x] **unit・integration・E2Eで失敗経路まで検証する**
    - unit: config parser、artifact/receipt verifier、timing閾値、terminal優先順位、artifact name、path containmentをhappy path+複数edgeで検証する。
    - integration: 実workflow YAML、protected baseline投影、固定Action SHA、step順、permissions、旧workflow不在、canonical U3定数との一致、manifest/digest/EnvReceipt fixtureを検証する。
    - E2E: 一時Git repositoryとfake docker/uploader/CLI portを使い、dispatch収束、push/PR無回帰、6 run集約、bootstrap失敗、exit 1/2、artifact欠落、checksum/digest drift、upload失敗、container残存をblack-boxで検証する。fake分岐はテストfixture側にのみ置く。
    - mutation proofとしてjob event条件、`--network=none`、read-only mount、固定digest/checksum、`if: always()`、terminal priority、旧workflow不在の各guardを1件ずつ壊し、対応testが赤になることを確認する。
    - トレーサビリティ: FR-6.3、FR-6.4、BR-U4-1〜BR-U4-7、Comprehensive Test Strategy、NFR-3。

14. [x] **ローカル品質ゲートと通常CI無回帰を確認する**
    - focused unit/integration/E2E、`bun run typecheck`、`bun run lint`、complexity gate、coverage registry/purity、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`を実行する。
    - local LCOVでU4差分追加行の未カバーを0にし、ignore、broad exclusion、未実行real Dockerをdeterministic testのgreenで代替しない。
    - workflow YAML parse、全`run:` blockのshell構文、`git diff --check`、変更ファイル一覧を確認し、既存CIの許容3変更以外とU4最小helper/test以外に差分がないことを確認する。
    - push/PR eventのjob graphとcritical pathがbaseline同一、dispatchだけがformal jobを起動することをfixtureから再確認する。
    - トレーサビリティ: FR-5.4、FR-6.1〜FR-6.4、BR-U4-3、NFR-2、NFR-3。

15. [ ] **ユーザー承認後に実workflow_dispatchでU3/U4受入を閉じる**
    - 実装・ローカル検証完了後、外部状態を変更するworkflow_dispatchは改めてユーザー承認を得て1回実行する。対象commit/refとrun URLを記録する。
    - GitHub上で`changes`がdispatch用skipへ正常収束し、既存bandが赤にならず、formal jobだけが実行され、workflow全体がsuccessであることを確認する。
    - artifactを取得して、warm-up 1回+計測5回、全回exit 0/NOT_DETECTED、spawn/CLI閾値、manifest/EnvReceipt/digest、network/mount、container cleanup、run ID/attemptをローカルの独立verifierでも再照合する。
    - 実container証跡が全条件を満たした場合だけU3 Step 11とU4を完了候補とする。deterministic planner/falling proof、job起動のみ、artifact欠落runを完了根拠にしない。
    - 診断実行 `30071213275`（commit `d60c99ac325cdc65dbda9ad7c5dda109e50fe12a`）では、受入とは分離した300秒上限の1回測定が `NOT_DETECTED` で完走した。Docker/TLC実行は168,319.3693 ms、TLC内部報告は159,592 ms、5,203,730 generated states、529,692 distinct states、探索深度9、queue 0、container残留0だった。したがってCLI 180秒未満は実現可能だが、spawn 120秒未満は現モデル・1 workerの完全探索では未達であり、BR-U4-7は未充足のままとする。
    - トレーサビリティ: FR-5.1〜FR-5.4、BR-U4-7、U3 Step 11、Performance Design、Reliability Design。

## 完了判定

- workflow構造、供給網固定、既存push/PR経路不変、旧workflow退役、失敗時artifact、terminal-stateがすべて自動テストで固定されている。
- 実GitHub Actionsの固定digest Dockerでwarm-up 1回+計測5回が完走し、全受入条件とartifact schemaを満たす一次証拠が保存されている。
- 全品質ゲートがgreenで、U4に対応しない変更がなく、ユーザー承認前の外部dispatch・state更新・完了チェックが行われていない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T05:11:57Z
- **Iteration:** 1
- **Scope decision:** approved — FR-5 — .github/workflows/ci.yml — reason: U4実装のjob-level dispatch限定、最小permissions、Action SHA固定、既存job graphからの独立、if:always()による失敗時artifact uploadとterminal-state配線を1ファイルで確認するため — owner: amadeus/spaces/default/intents/260722-tla-plugin/inception/requirements-analysis/requirements.md#- FR-5.1: `.github/workflows/ci.yml` に `workflow_dispatch` トリガーを追加し、formal-model-check ジョブは `if: github.event_name == 'workflow_dispatch'` 条件でのみ実行する。push / pull_request イベントでは formal ジョブが絶対に走らないこと(二層検証態勢の既決)

CI workflow の制約は満たすが、空 stderr 契約の衝突と実 workflow_dispatch 未実施により未準備。

### Findings

- Critical: U4 verifier の tlc-stderr.bin 非空要件が、正常実行時の空 stderr を許容する U3 publisher 契約と衝突する。ファイル実在、manifest の bytes と SHA-256 一致、上限内を検証し、bytes === 0 を許容すること。
- Major: BR-U4-7 が完了条件とする実 GitHub workflow_dispatch、固定 digest Docker の warm-up 1 回と計測 5 回、artifact 回収が未実施。空 stderr 修正後、ユーザー承認を得て一次証拠を取得すること。
- Minor: code-generation-plan.md 冒頭の「全項目は未着手」が Step 1〜14 完了と矛盾するため、現状へ更新すること。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T05:18:33Z
- **Iteration:** 2
- **Scope decision:** approved — FR-5 — scripts/formal-verif/run-model-check-ci.ts — reason: 前回Criticalの修正が、manifest-boundな0-byte tlc-stderr.binのみを許容しつつ、実在・manifest bytes/SHA-256一致・stdout非空・両stream 16MiB上限を維持していることを実装で確認するため — owner: amadeus/spaces/default/intents/260722-tla-plugin/inception/requirements-analysis/requirements.md#- FR-5.2: formal ジョブは ubuntu ランナー + Docker コンテナで `scripts/formal-verif/run-model-check-ci.ts` を実行する。コンテナは **公式 eclipse-temurin イメージ(digest 固定)+ 公式 tla2tools.jar(GitHub Releases、版+チェックサム固定)**〔更新 2026-07-22T12:32:22Z: 設計段実測で権威ある既成 TLC イメージの不在を確定し、ユーザー再裁定 — feasibility Q5 の具体化。application-design decisions.md ADR 参照〕

Code Generation実装はREADY。空stderr契約と計画状態は是正済みだが、U4全体は実workflow_dispatchによる外部受入待ち。

### Findings

- Resolved Critical: manifest-boundな0 byte tlc-stderr.binを許容し、stdout非空、両streamの実在・bytes/SHA-256一致・16 MiB上限を維持。空stderr成功と16 MiB超stderr拒否のテストを追加。
- Open external acceptance: 実GitHub workflow_dispatch、固定digest Dockerのwarm-up 1回と計測5回、artifact回収は未実施。BR-U4-7に従いU4全体を完了扱いしないこと。
- Resolved Minor: 計画冒頭をStep 1〜14完了、Step 15未完了へ更新。
- Observation: 許可読取したrun-model-check-ci.tsは薄いentrypointであり、空stderr判定本体の閉包判断はconductorの独立テスト結果と成果物にも依拠する。
