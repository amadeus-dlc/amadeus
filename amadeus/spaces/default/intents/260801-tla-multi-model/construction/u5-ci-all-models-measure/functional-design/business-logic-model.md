# Business Logic Model — u5-ci-all-models-measure

**Intent**: 260801-tla-multi-model / **Stage**: functional-design / **Unit**: u5-ci-all-models-measure(C6+C9+C10)

上流入力(consumes 全数): unit-of-work(u5 節・AC1〜4, テスト割当節), unit-of-work-story-map(FR→Unit 写像 — FR-4 / FR-5 の u5 帰属), requirements(FR-4 / FR-5, NFR-1〜4, Assumptions D3, Constraints), components(C6 / C9 / C10), component-methods(C6 節), services(S1 / S4), decisions(ADR-4 / ADR-8 / ADR-10), u2-loader-generalization functional-design(VerifiedTlaSources / selectVerifiedModel 契約), u3-vocabulary-supply functional-design(§3.5 frozen binding スコープ / §5.2 byte-pin 一般化 / §9.2 引き渡し), u4-mirror-declaration-drift functional-design(D-U4-1 配置裁定 / §8 引き渡し), 実測ソース(`plugins/formal-model-check/tools/node-ci-model-check-port.ts` 全文 :200-202 固定含む, `run-model-check-ci.ts` 全文, `run-model-check-diagnostic.ts` 全文 :208-209 固定含む, `run-skeleton-ci.ts` 全文 :82-83 固定含む, `ci-model-check-runner.ts` 全文, `ci-model-check-artifacts.ts` 全文, `ci-model-check-domain.ts` 全文, `run-model-check.ts` 全文, `fs-tlc-toolchain.ts` :1642-1690 #parseExploration / :1457-1470 normalize, `tlc-toolchain.ts` :492-496 hasFrozenModelOutputBinding / :533-549 parseTlcOutput174, `.github/workflows/ci.yml` :508-607, `plugins/formal-model-check/stages/formal-model-check.md` :12 / :35-36 / :42-43, `tests/formal-verif/support/tla-mutation-probe.ts` / `tla-real-toolchain-probe.ts` / `tla-toolchain-harness.ts`)

unit-of-work-story-map は存在する(user-stories ステージがスコープ外で stories 未生成のため、FR-1〜FR-6 → Unit の写像をストーリー代替として保持する)。本 Unit は FR-4(CI ポート面)と FR-5 の帰属先として写像済み。フロントエンド要素はなく frontend-components.md は生成しない。

## 0. 変更の輪郭

現行の CI 実行系は「FormalElection 単一固定」である:

- `NodeCiModelCheckPort.run` が `run-model-check.ts --model specs/tla/FormalElection.tla --cfg specs/tla/FormalElection.cfg` を固定 spawn(node-ci-model-check-port.ts:200-202)。
- `run-model-check-ci.ts` の `run` は `executeCiModelCheckAcceptance` へ model 非対応で委譲し、runner は warm-up 0 + measured 1-5 の6 run を1モデル分だけ回す(ci-model-check-runner.ts:93-100)。
- `run-model-check-diagnostic.ts` は model/cfg パスを `FormalElection.tla/.cfg` 固定で直接 docker TLC 実行する(:207-209)。
- `run-skeleton-ci.ts` は frozen モデル書出し名を `FormalElection.tla/.cfg` 固定(:82-83)。
- ci.yml の formal-model-check ジョブ(:508-607)はステップ名・サマリが単一モデル前提。
- stage doc(:12 / :35-36)は「デフォルト対象 = FormalElection ペア」と記述。

本 Unit はこれを **全登録モデル駆動**(既定 = loader の全登録モデル逐次、`--model <name>` で単一絞り込み — SD Q1=A / ADR-4)へ一般化し、**MirrorLifecycle AsIntended 完全探索の実測証跡**(completion marker + state 統計、基準 208,628 / 89,099 / depth 18、Assumptions D3)を CI green として固定する(ADR-8 measure-first)。骨子:

1. `run-model-check-ci.ts` の CLI を `run|verify --root <abs> [--model <name>]` へ拡張。既定は全登録モデル、未登録名は明示失敗(NFR-2)。
2. runner/domain/artifacts の evidence 構造を per-model(`<root>/<model-name>/runs/<kind>-<index>/`)へ拡張(§2)。
3. port のモデル別 dispatch: **frozen binding を持つ FormalElection は従来経路(run-model-check.ts 正規化)、それ以外のモデル(MirrorLifecycle)は verified-source 直接実行経路**(§3、u3 §3.5 引き渡しの確定裁定 D-U5-1)。
4. diagnostic / skeleton の引数化(§4 / §5)。
5. ci.yml はステップ名・サマリの複数モデル追随のみ。permissions / if / timeout 30 分は**不変**(C2 / FE Q1=A、§6)。
6. 実測計画と timeout 超過時のエスカレーション(§7 / §8)。

## 1. 前提となる上流契約(消費のみ、本 Unit は変更しない)

- **loader(u2)**: `loadVerifiedTlaSources()` が全登録モデルの検証済みソース配列を返す。`selectVerifiedModel(sources, name)` で選択、未登録名は MODEL_MAP_INVALID 明示失敗。モデルの反復順は map の `models` 配列宣言順(= FormalElection → MirrorLifecycle)をそのまま採用する(順序の新規裁定はしない)。
- **語彙(u3)**: `traceVocabularyFor(model)` が `TraceVocabulary`(moduleName / traceStateVariables / namedInvariants)を供給。vocabulary 省略モデルは明示失敗。登録2モデルはともに vocabulary 宣言済み(u3/u4)。
- **byte-pin(u3 §5)**: 要求モデルの bytes はそのモデルの verified source と照合済みであることが実行の前提。MirrorLifecycle の model/cfg/aux identity は u4 の宣言 pin が担保する。
- **frozen binding(u3 §3.5 / ADR-10)**: `parseTlcOutput174` の入口は `validateFrozenTlaModelReceipt` + `hasFrozenModelOutputBinding` の2ゲートを持ち、後者は FormalElection にスコープされる。**本 Unit はこの入口を一般化しない**(tlc-toolchain.ts / fs-tlc-toolchain.ts / run-model-check-execution.ts は u5 の所有外かつ ADR-10 の保護面)。MirrorLifecycle の TLC 証跡は別経路で検証する(§3)。

## 2. run|verify の全モデル化(C6 主面)

### 2.1 CLI 引数の拡張(run-model-check-ci.ts)

```
usage: run-model-check-ci.ts run|verify --root <absolute-path> [--model <registered-name>]
```

- `parseRoot`(:11-21)を拡張し、optional `--model <name>` を受理する。`--root` 直後の位置制約は維持し、`--model` は末尾の1組のみ許可(重複・未知フラグは usage 失敗 exit 2 — 現行の厳格パーサ流儀に揃える)。
- モデル名の検証は **loader 経由のみ**で行う: `loadVerifiedTlaSources()` → `selectVerifiedModel`。未登録名は loader の明示失敗をそのまま exit 2 の HARNESS_ERROR 系 stderr JSON へ写す(silent fallback なし、NFR-2)。CLI パーサ自体は文字列を素通しし、登録判定をパーサに複製しない(判定源の単一化)。
- `--model` 省略時の既定 = **全登録モデル**(SD Q1=A)。ci.yml からの呼出しは引数を変えない(既定が全モデルに変わるだけ — §6)。

### 2.2 実行マトリクス(ci-model-check-runner.ts)

- モデル反復の責務は runner に置く: `executeCiModelCheckAcceptance(options, port)` の options に `models: readonly CiModelTarget[]`(名前 + 検証済みパス + frozen binding 有無)を追加し、**モデル外側ループ × 既存6 run マトリクス(warm-up 0 + measured 1-5)内側**で逐次実行する。並列化はしない(ADR-4 の却下案 (b) どおり — reservation 機構への侵襲回避)。
- run の一意キーは `(modelName, kind, index)`。`CiAcceptanceRunRequest` に `model: CiModelTarget` を追加する。
- 失敗時の短絡 semantics は不変: いずれかの run が失敗した時点で `run-failure.json` + `verification.json`(pass:false)を書いて exit 2(現行 :111-127 と同型。failure レコードに `model` フィールドを追加し、どのモデルで落ちたかを証跡化する)。

### 2.3 evidence 構造の per-model 化(ci-model-check-domain.ts / ci-model-check-artifacts.ts)

- `CiModelCheckRunEvidence` に `model: string` を追加し、`artifactDirectory` を `runs/<kind>-<index>` → **`<model>/runs/<kind>-<index>`** へ変更する。acceptance.json の runs 配列はモデル反復順 × run index 順のフラット配列(2モデルなら 12 要素)とし、スキーマ `amadeus.ci-model-check-acceptance.v1` は据え置き(配列長と identity 規則の変更のみ — domain validator の `runs.length !== 6` チェック(:158-159)は `6 × モデル数` へ一般化)。
- `validateRun` の identity 規則(:122 `runs/${kind}-${index}`)を `<model>/runs/<kind>-<index>` へ追随。cliMs / spawnMs / docker receipt / cleanup の検査 semantics は**一字不変**。
- `verify` 側(verifyCiAcceptanceArtifacts)は acceptance.json の runs を全件検査する構造のまま、per-model ディレクトリを辿るだけで成立する(containedPath の canonical 検査は不変)。
- **per-model 追加検査(MirrorLifecycle の完全探索証跡)**: ModelTlcEvidence(domain-entities.md §2)として、各 run の `tlc-stdout.bin` から抽出した completion marker + state 統計(generatedStates / distinctStates / statesLeftOnQueue / searchDepth)を run evidence に載せる(§3.4)。verify は MirrorLifecycle の measured run について「completion marker 存在 + 統計非 null」を必須とし、**基準値(208,628 / 89,099 / depth 18)との完全一致を pin する**(§7.3 — 抽出器は diagnostic の `extractDiagnosticStatistics` を共有し、実装の複製を置かない)。

### 2.4 所有ファイルの前提解決(要裁定事項 D-U5-4)

unit-of-work u5 所有ファイルには `ci-model-check-runner.ts` / `ci-model-check-artifacts.ts` / `ci-model-check-domain.ts` が列挙されていない。しかし C6 の「run 既定=全モデル逐次 / per-model evidence / verify 全モデル検査」は run-model-check-ci.ts 単独では実現不能で、反復・evidence 構造・検査の本体はこの3ファイルに住む(u4 D-U4-1 と同型の「unit 策定時点で未解決だった配置」のケース)。本 Unit は次の**追加所有**を宣言し、code-generation の code-summary に記録する:

- `plugins/formal-model-check/tools/ci-model-check-runner.ts`(モデル反復・モデル別 dispatch 結線)
- `plugins/formal-model-check/tools/ci-model-check-domain.ts`(evidence スキーマの per-model 拡張 + ModelTlcEvidence)
- `plugins/formal-model-check/tools/ci-model-check-artifacts.ts`(verify の per-model 追随 + 統計 pin)

ツリー横断 import の禁止規則(D-U4-1 §1.1)には抵触しない — 全て同一 `plugins/formal-model-check/tools/` 内の変更である。

## 3. MirrorLifecycle の TLC 証跡検証経路(u3 §3.5 引き渡しの確定 — D-U5-1)

### 3.1 問題の確定

MirrorLifecycle を現行の run-model-check.ts 経路に流すと、正規化の入口 `parseTlcOutput174` で次のいずれかで fail-closed される:

1. `validateFrozenTlaModelReceipt(input.modelReceipt)` — receipt は generateFrozenTlaModel(FormalElection 語彙固定、ADR-10)由来であり、対象モデルと一致しない。
2. `hasFrozenModelOutputBinding`(tlc-toolchain.ts:492-496)— `expectedModuleName === "FormalElection"` 固定のため、MirrorLifecycle の `expectedModuleName` は GRAMMAR 赤(「TLC output module path is not bound to the frozen model」)。

ADR-10 は frozen 生成・receipt・binding を FormalElection スコープに固定しており、本 Unit はこれらに手を入れない(u3 §3.5 の確定)。したがって **MirrorLifecycle の検証は frozen-receipt 入口を通らない別経路**で構成する。

### 3.2 裁定(D-U5-1): 二層検証 — frozen 層(FormalElection)と verified-source 層(それ以外)

モデルごとに検証層を dispatch する。**層の選択根拠はモデルの宣言的性質(frozen binding の有無)であり、実行時の成否で切り替わる経路は作らない**(fail-closed)。

- **frozen 層(FormalElection)**: 従来どおり port → `run-model-check.ts --model … --cfg … --provider docker` → FsPlannedTlcRuntime → parseTlcOutput174(frozen receipt + binding ゲート)。**この層の挙動は byte 不変**(成功 (iii) / FR-6 — 本 Unit が FormalElection の検証結果を変えないことの設計上の保護)。
- **verified-source 層(MirrorLifecycle、および将来の非 frozen モデル)**: frozen receipt の代わりに **loader の宣言 pin が完全性(integrity)を担保**する。構成要素:
  1. **integrity binding** = loader byte-pin: 実行対象の model/cfg bytes は u2/u3 の verified source(identity 照合済み、aux は u4 の MirrorLifecycleCore pin を含む)そのものであり、drift は loader が既に赤化している。frozen receipt が果たしていた「実行対象 = 検証済み宣言」の binding は、verified source の `moduleIdentity` / `cfgIdentity` / `auxIdentities` が担う(ADR-10 と整合: receipt の入力列挙を変更せず、receipt の外側で binding を構成する)。
  2. **semantics 検証** = completion marker + state 統計: 直接 docker TLC(diagnostic と同じ argv 構成、:210-223)を実行し、stdout を `extractDiagnosticStatistics`(run-model-check-diagnostic.ts:141-170、**共有・複製しない**)で抽出する。完全探索の成立条件は (a) completion marker 存在、(b) exit code 0、(c) stderr 空、(d) state 統計 4 値が非 null、(e) 基準値との一致(§7.3)。
  3. **反例検出(red 面)** = marker 不在 + exit ≠ 0: TLC が invariant 違反を検出した場合、completion marker は出力されず TLC は非 0 で終了する。verified-source 層の red surface は「completion marker 不在 or exit ≠ 0 or stderr 非空」であり、frozen 層の「exit 1 DETECTED(反例 identity 付き)」とは**意図的に非対称**である(business-rules BR-M2 に固定)。反例 identity の正規化(counterexampleIdentity 計算)は verified-source 層では**行わない** — FR-5 が要求する証跡は completion marker + state 統計であり、反例 identity は要件にない(最小変更)。将来 MirrorLifecycle の反例 identity が要件化された場合は frozen 同等の per-model binding(u3 §3.5 のもう一方の選択肢)を別 intent の裁定事項とする。

### 3.3 却下案(Alternatives Rejected)

- **(a) parseTlcOutput174 / fs-tlc-toolchain の binding 一般化(frozen 同等の per-model binding)**: 検証の一様性は高いが、u3 所有の toolchain 3 ファイル(tlc-toolchain / fs-tlc-toolchain / run-model-check-execution)への侵入 + receipt 変種 + manifest 変種が必要で、ADR-10 の保護面に隣接する変更になる。FR-5 の要求証跡(completion marker + stats)に対して過剰(AGENTS.md「Simplicity First」)。reversibility は高いため将来の要件化時に再裁定可能。
- **(b) MirrorLifecycle を CI 対象から外し diagnostic のみで計測**: FR-5「CI ジョブが全登録モデルを実行」に反する(#1920 の本質を残す)。
- **(c) frozen receipt を MirrorLifecycle にも生成**: ADR-10 直接違反。

### 3.4 port の dispatch 実装(node-ci-model-check-port.ts)

- `CiAcceptanceRunRequest.model` の frozen binding 有無で層を分岐する。frozen 層は現行 :195-216 の spawn argv をモデルの paths へ引数化するだけで構造不変(`--model specs/tla/<Name>.tla --cfg specs/tla/<Name>.cfg`)。
- verified-source 層は diagnostic の argv 構成(:210-223)をモデル paths へ一般化した直接実行として port 内に実装する(docker wrapper trace・cleanup・remainingContainers の仕組みは port 既存のものを共有)。timeout は diagnostic と同じ 300 秒ではなく、**port の run 予算として現行 190 秒を据え置き**、超過は timeout 系失敗として証跡化する(§8 のエスカレーション起点 — ここで勝手に緩めない)。
- run evidence への統計の載せ方: 両層とも run 完了後に `<outDir>/tlc-stdout.bin` を `extractDiagnosticStatistics` で抽出し、`CiModelCheckRunEvidence.stats`(ModelTlcEvidence、domain-entities.md §2)へ格納する。frozen 層(FormalElection)でも統計を載せることで evidence 形状を一様に保つ(検証層の非対称は verdict 経路のみ、証跡形状は対称)。
- manifest 照合(:239-242)は frozen 層のみの検査として層内に残す(verified-source 層には run-model-check の manifest が存在しない — 層非対称を verify 側へ漏らさず、port が層ごとの terminal 検査を完結させる)。

## 4. diagnostic の引数化(run-model-check-diagnostic.ts)

- CLI を `--root <abs> [--model <name>]` へ拡張。既定 = 全登録モデル逐次、未登録名は明示失敗(§2.1 と同一規則 — モデル名検証は loader 経由のみ)。
- per-model の出力先を `<root>/diagnostic/<model-name>/` へ変更(現行の `<root>/diagnostic/` 直下を1段深くする)。result.json / completion-marker.json / tlc-stdout.bin / tlc-stderr.bin の4点セットは不変。
- :207-209 の modelRoot/modelPath/cfgPath 固定を、選択モデルの verified source 由来パスへ置換する。argv 構成・timeout 300 秒・cleanup semantics は不変。
- diagnostic は引き続き **非 acceptance の計測プロファイル**(`profile: "non-acceptance-diagnostic"` 不変)。本 Unit における役割は (i) ローカルでの MirrorLifecycle 事前実測(ADR-8 の measure-first 手段)、(ii) `extractDiagnosticStatistics` の canonical 置き場(§3.4 の共有元)の2つ。
- DiagnosticResult に `model: string` を追加する(schema `amadeus.model-check-diagnostic.v1` 据え置き、フィールド追加のみ)。

## 5. skeleton の引数化(run-skeleton-ci.ts)

- CLI を `<output-directory> [--model <name>]` へ拡張し、`--model` は登録モデル名として検証する(loader 経由、未登録は明示失敗)。
- **frozen 生成は FormalElection 語彙のまま不変**(components C6 留意 / ADR-10): skeleton の D4 注入二連 DETECTED semantics は frozen receipt 機構に本質的に依存するため、`--model` に FormalElection 以外が指定された場合は**明示失敗**(「skeleton requires the frozen-bound model」系、exit 1)とする。これは一般化漏れではなく意図的な fail-closed であり、コメントで明示する(business-rules BR-S1)。現行の無引数動作(= FormalElection)は byte 不変。
- :82-83 の書出し名固定は、選択モデルが FormalElection に確定した後の導出として残る(結果的に同じ文字列だが、出所が「選択の確定」であることをコード上明確にする)。

## 6. ci.yml ジョブ更新(C9 — 差分最小化)

変更は**ステップ名・サマリ表示のみ**。以下は一切触れない(NFR-3 / D-制約 C2 / FE Q1=A):

- `if: github.event_name == 'workflow_dispatch'`(:511)
- `timeout-minutes: 30`(:513)
- `permissions: contents: read`(:514-515)
- runs-on / ステップ id / outcome 伝播の shell 構造 / upload artifact 設定 / U4 マーカーコメント

具体的な差分:

1. ステップ名の複数モデル追随: 「Run fixed Docker model-check acceptance」→「Run fixed Docker model-check acceptance (all registered models)」、「Verify terminal evidence」→「Verify terminal evidence (all registered models)」等、表示層のみ。
2. `run` / `verify` のコマンド行は**不変**(既定が全モデルになったため `--model` は不要 — §2.1)。
3. Publish terminal state の最終 echo(:606「formal model check completed with NOT_DETECTED」)にモデル一覧を含める程度の表示変更のみ。exit code 判定ロジック(0/1/2 マッピング)は不変。
4. ジョブ構造・ステップ数の変更なし。diff は `git diff` で上記3点のみであることを code-generation の PR で目視確認する(business-rules BR-C1)。

## 7. 計測計画(ADR-8 measure-first — FR-5 AC の証跡化)

### 7.1 計測シーケンス

1. **ローカル事前計測**: 一般化した diagnostic(§4)で MirrorLifecycle AsIntended を走らせ、completion marker・統計・所要時間(elapsedMs / totalElapsedMs)を採取する(docker + tla2tools 固定 jar、Assumptions A1)。
2. **per-run 予算との整合**: 採取した所要時間が port の run 予算 190 秒(§3.4)に収まるか確認。6 run マトリクス総量 + bootstrap(image pull + jar download、最大 300 秒)の見積りを 30 分ジョブ timeout と突き合わせる。
3. **CI 実測**: workflow_dispatch で実走し、acceptance.json の per-model evidence(統計 + cliMs/spawnMs)を取得。
4. **record への固定**: 実測値を本 intent record へ証跡として固定する(置き場所は business-rules BR-E1 — code-generation ステージの e2e 証跡ファイルに実測 JSON を貼り、本 functional-design には基準値と判定規則のみ残す)。

### 7.2 期待値(u7 基準、Assumptions D3)

- generatedStates = **208,628**、distinctStates = **89,099**、searchDepth = **18**、completion marker 存在、statesLeftOnQueue = **0**、exit 0、stderr 空。

### 7.3 判定規則(pin の強度)

- verify は MirrorLifecycle の measured run について統計の**基準値完全一致**を要求する(TLC は固定 jar・workers 1・同一 cfg で決定的 — u7 実測の再現が期待)。不一致が出た場合は **verify 赤**とし、値を黙って更新しない(§8 のエスカレーションへ送る)。
- warm-up run は統計 pin の対象外とし、completion marker のみ要求する(warm-up の役割は環境暖機であり、現行 FormalElection 側でも計測意味を持たせていない設計の踏襲)。

### 7.4 所要時間が判明した後の分岐

- **収まる場合**: 本設計のまま完了(成功 (i) 達成、#1920 verdict 留保を閉じる — requirements Constraints)。
- **収まらない場合**: §8 のエスカレーション。**本 Unit で timeout 値・run 予算・マトリクスを勝手に緩めない**(unit-of-work u5 AC2 但し書き / ADR-8)。

## 8. timeout 超過時のエスカレーション(FE Q1=A)

30 分ジョブ timeout(ci.yml:513)との不整合が実測で判明した場合の裁定経路をあらかじめ固定する:

1. **検出**: 次のいずれか — (a) diagnostic 事前計測で MirrorLifecycle 1 run が port 予算 190 秒超過、(b) 6 run 総量見積りが bootstrap 込みで 30 分に収まらない、(c) CI 実走で timeout 打ち切り。
2. **証跡化**: 実測値(各 run の cliMs/spawnMs/elapsedMs、打ち切り位置)を record へ固定し、code-summary へ「timeout 超過、再裁定要」と記録する。
3. **エスカレーション先**: 要件側の再裁定(requirements FR-5 / ADR-8 の time-box 後続裁定)。候補は探索深さ制限・worker 数・マトリクス縮小等の **time-box 化**であり、その場合は成功 (i) の定義(完全探索)との整合を要件レベルで再審する(ADR-8 Consequences どおり)。
4. **禁止事項**: 本 Unit の差分に ci.yml の timeout / if / permissions 変更、port の 190 秒予算の緩和、統計 pin の緩和(exact → 下限等)、マトリクスの暗黙縮小を含めない(business-rules BR-T1)。これらは全て再裁定の結果としてのみ許容される。
5. 部分的成功(「統計は一致したが 30 分に収まらない」等)の場合でも同じ経路 — 設計を緩めて green を取りにいかない。

## 9. stage doc 整合(C10 — 実装追随)

実装先行・doc 追随の順序を守り、code-generation での実装確定後に `plugins/formal-model-check/stages/formal-model-check.md` を更新する:

- **:12(inputs)**: 「the externalised TLA+ model + config under specs/tla/ (FormalElection.tla / FormalElection.cfg)」→ 全登録モデル(model-map.json の models 配列)前提の記述へ。
- **:35-36(Step 1)**: 「The default target is … FormalElection.tla + FormalElection.cfg」→ 「既定は全登録モデルの逐次実行。`--model <name>` で単一モデルへ絞り込める(未登録名は明示失敗)」旨へ。frozen 層 / verified-source 層の2層構成(§3)を1〜2文で説明する(FormalElection = frozen receipt 正規化、それ以外 = completion marker + state 統計検証)。
- **:42-43(CLI 例)**: 例示コマンドを `--model` 引数の使用例として残し、既定(引数なし)が全モデルであることを追記。
- doc 記述と実装 semantics の一致は u5 AC4 の検査対象 — doc 更新後に該当行を実装と突き合わせる確認を t406 系の doc ガード(既存の ci-workflow 契約テストと同型の文字列検査)で固定する(business-rules BR-D1)。

## 10. 不変性の固定(FR-6 / NFR-1)

- **FormalElection 側は end-to-end で不変**: frozen 層の spawn argv は引数化後も FormalElection に対して同一文字列を生成する。acceptance.json の runs 配列形状は変わる(per-model 化)が、FormalElection 分の各 run evidence の内容(outcome / exitCode / docker argv / cleanup)は不変。frozen receipt identity・parseTlcOutput174 の semantics には一切触れない(§3.1)。
- **既存 CI 契約の不変面**: exit code マッピング(0/1/2)、bootstrap の supply-receipt、docker isolation 引数検査(validateDockerReceipt)、EnvReceipt 検査行列(verifyReceipt)は不変。変更は「モデル次元の追加」のみ。
- **skeleton / diagnostic の無引数動作**: skeleton 無引数 = FormalElection で不変(§5)。diagnostic は既定が全モデルへ変わるが、FormalElection 分の出力内容は不変。

## 11. テスト計画(u5 所有面)

unit-of-work テスト割当節どおり: 新規 **t406** + 統合5ファイル改訂 + support 3ファイル一般化 + (§2.4 の追加所有に伴う) ci-model-check-artifacts 系テストの追随。

### 11.1 新規 t406(`tests/integration/t406-ci-all-models-measure.integration.test.ts` — 統合、u5 AC1/AC2/AC3)

- **both-models injection red(AC1、落ちる実証)**: scratch fixture(workspace コピー + 補正済み model-map)上で各モデルに意味論破壊を注入し、CI 経路(runner + port の結線、docker / TLC 実行部は support probe のシームで制御)が**赤**になることをモデルごとに実証する:
  - **FormalElection**: mutation-probe 一般化版(§11.3)で invariant 破壊(例: 既存 `resolution` 変異)を注入 → frozen 層は exit 1 DETECTED(反例)で赤。除去 → green 復帰。
  - **MirrorLifecycle**: MirrorLifecycle 専用の注入 anchor(§11.3)で invariant 破壊を注入(例: `NoDuplicateCreate` を名実ともに壊す重複 Create 許容変異、または `TypeOK` 破壊)→ verified-source 層は「completion marker 不在 + exit ≠ 0」で赤。除去 → green 復帰(completion marker + 基準統計が出る)。
  - 両モデルで「注入 → red、除去 → green」の**往復**を assert する(片方向だけの red は検査の空洞化を許すため)。
- **全モデル CI 駆動(AC2)**: 既定(引数なし)run が2モデル × 6 run の evidence を `<root>/<model>/runs/…` へ生成し、verify が12 run 全件を検査して green になること。MirrorLifecycle measured run の統計が基準値(208,628 / 89,099 / 18 / queue 0)と一致することの assert(実測証跡の assert 含む — unit-of-work t406 定義どおり。TLC 実走が前提のため、real toolchain 環境がない場合は support の real-toolchain-probe 系と同じ self-skip 規約に従う)。
- **`--model` 絞り込み(AC3)**: `run --model MirrorLifecycle` が MirrorLifecycle 分のみの evidence を生成すること。未登録名(`--model NoSuch`)が exit 2 の明示失敗で、evidence ディレクトリを汚染しないこと(silent fallback なしの pin)。per-model evidence ディレクトリ構造(`<root>/<model>/runs/<kind>-<index>/` + 4点セット)の pin。
- **ci.yml 差分ガード(AC4)**: ci.yml のテキストから `timeout-minutes: 30` / `permissions:` ブロック / `workflow_dispatch` 条件行が不変であることの文字列 pin(既存 t-formal-verif-ci-workflow 系と同型)。

### 11.2 既存統合テストの改訂(u5 仕分け、期待値不変原則)

- `t-formal-verif-node-ci-model-check-port.integration.test.ts`: port の run 呼出しに model 引数が増える追随。FormalElection 分の既存ケースは「引数化後も同一 argv が生成される」ことを assert する形へ書き換え(期待値不変の実証)。層 dispatch(frozen / verified-source)の分岐ケースを追加。
- `t-formal-verif-run-model-check-diagnostic.integration.test.ts`: per-model 出力先・`--model` 引数・DiagnosticResult.model の追随。FormalElection 分の抽出統計の期待値は不変。
- `t-formal-verif-ci-workflow.integration.test.ts`: ci.yml のステップ名変更への文字列追随 + §11.1 の差分ガード取り込み。コマンド行・permissions・timeout の期待は不変。
- `t-formal-verif-run-model-check.integration.test.ts` / `t-formal-verif-ci-model-check-runner.integration.test.ts`: runner の options.models・evidence 形状(model フィールド・12 run)への追随。既存の失敗分類・短絡 semantics の期待値は不変(モデル次元を足した同型ケースとして拡張)。
- **再仕分けの運用**: 「維持」仕分けの実走系(t-formal-verif-run-model-check-real 等)が port/runner の変更で落ちる場合は「維持」ではなく u5 改訂へ再仕分けし code-summary に記録(unit-of-work テスト割当節の但し書き運用と同じ)。
- **追加所有に伴う追随(§2.4)**: `t-formal-verif-ci-model-check-artifacts.integration.test.ts` は unit-of-work の u5 列挙にないが、verify の per-model 追随が必要になる。改訂対象として code-summary に記録する(D-U5-4 の連動)。

### 11.3 support プローブの dual-model 一般化(u5 仕分け)

- `tla-mutation-probe.ts`: `--model <name>` 引数を追加し、FormalElection は既存4変異を維持、MirrorLifecycle 用の注入 anchor を追加する(MirrorLifecycle.tla / MirrorLifecycleCore.tla の意味論破壊 — anchor は t406 設計時に spec 実測で1箇所ずつ一意性を確認)。出力は選択モデルの model/cfg 名で書き出す。frozen 生成を使うのは FormalElection 分のみ(ADR-10)、MirrorLifecycle 分は verified source の bytes をコピーしてから変異を適用する。
- `tla-real-toolchain-probe.ts`: モデル選択の引数化(frozen 経路は FormalElection 固定のまま — 本 probe の責務は frozen toolchain 実走のため、MirrorLifecycle の実走は diagnostic 系に委ねる。一般化は引数の受口とバリデーションに限定)。
- `tla-toolchain-harness.ts`: MODULE_NAME / MODULE_PATH 等の合成定数(:38-41)をモデル引数から構築できる形へ最小限の引数化。frozen receipt 前提のシナリオ(counterexample 系)は FormalElection 固定のまま維持し、MirrorLifecycle は complete シナリオ(completion marker + 統計 envelope)のみ対象とする(§3.2 の層非対称と一致)。

### 11.4 patch gate

変更行 0-hit 不許容(team-practices Testing Posture)。上記テストは修正と同 PR で運ぶ(u5 AC4)。`bun run typecheck` / `bun run lint` / 既存テスト green。

## 12. 設計上の留意(下流への引き渡し・27 ファイル仕分け)

### 12.1 本 Unit が触るファイル

| 区分 | ファイル | 変更内容 |
|---|---|---|
| 所有(実装) | `plugins/formal-model-check/tools/node-ci-model-check-port.ts` | :200-202 引数化 + 層 dispatch(§3.4) + 統計抽出の載格 |
| 所有(実装) | `plugins/formal-model-check/tools/run-model-check-ci.ts` | `--model` パーサ拡張(§2.1) |
| 所有(実装) | `plugins/formal-model-check/tools/run-model-check-diagnostic.ts` | 引数化 + per-model 出力(§4) |
| 所有(実装) | `plugins/formal-model-check/tools/run-skeleton-ci.ts` | `--model` 受口 + fail-closed(§5) |
| 所有(CI) | `.github/workflows/ci.yml` | ステップ名・サマリのみ(§6) |
| 所有(doc) | `plugins/formal-model-check/stages/formal-model-check.md` | :12 / :35-36 / :42-43 の実装追随(§9) |
| 追加所有(§2.4、要裁定) | `plugins/formal-model-check/tools/ci-model-check-runner.ts` | モデル反復 + dispatch 結線(§2.2) |
| 追加所有(§2.4、要裁定) | `plugins/formal-model-check/tools/ci-model-check-domain.ts` | evidence per-model 拡張 + ModelTlcEvidence(§2.3) |
| 追加所有(§2.4、要裁定) | `plugins/formal-model-check/tools/ci-model-check-artifacts.ts` | verify per-model 追随 + 統計 pin(§2.3) |
| テスト新規 | `tests/integration/t406-ci-all-models-measure.integration.test.ts` | §11.1 |
| テスト改訂(u5 仕分け) | 統合5ファイル(node-ci-port / diagnostic / ci-workflow / run-model-check / ci-model-check-runner) | §11.2 |
| テスト追随(連動) | `t-formal-verif-ci-model-check-artifacts.integration.test.ts` | §11.2 末尾 |
| support 一般化 | `tests/formal-verif/support/` 3ファイル | §11.3 |

### 12.2 code-generation Bolt が最初に知るべきこと

1. **D-U5-1(§3)**: MirrorLifecycle は frozen-receipt 入口を通らない。port の層 dispatch が設計の中核。toolchain 3 ファイル(tlc-toolchain / fs-tlc-toolchain / run-model-check-execution)には触れない。
2. **D-U5-4(§2.4)**: runner / artifacts / domain の3ファイルは追加所有。code-summary への記録必須。
3. **計測が完了条件に含まれる**(§7): MirrorLifecycle の実測証跡(completion marker + 統計一致)がないと AC2 を閉じられない。timeout 不整合が出たら §8 のエスカレーションで立ち止まる — 緩めて閉じない。
4. **ci.yml は表示層のみ**(§6): permissions / if / timeout の diff が1行でも出たら設計違反。
5. **統計抽出は `extractDiagnosticStatistics` 共有**(§3.4 / §4): 複製実装を port に置かない。
6. 生成ツリー(dist/ 等)は本 Unit の最後に `bun scripts/package.ts` 再生成で追随(手編集禁止)。plugin tools が self-install 配布対象かは code-structure.md 現在節で確認(requirements Constraints)。
7. コメント・doc は日本語、コミットは英語 conventional(unit-of-work 共通契約)。

### 12.3 決定事項一覧

- **D-U5-1**: MirrorLifecycle の TLC 証跡検証は verified-source 層(loader byte-pin = integrity、completion marker + state 統計 = semantics、marker 不在 + exit≠0 = red surface)で構成し、frozen-receipt 入口は一般化しない(§3)。反例 identity 正規化は verified-source 層では行わない。
- **D-U5-2**: モデル反復は runner 責務、モデル名検証は loader 経由のみ、CLI パーサは素通し(§2.1/§2.2)。
- **D-U5-3**: MirrorLifecycle measured run の統計 pin は基準値完全一致(208,628 / 89,099 / depth 18 / queue 0)。warm-up は marker のみ(§7.3)。
- **D-U5-4**: ci-model-check-runner / artifacts / domain の3ファイルを追加所有として宣言(§2.4)。
- **D-U5-5**: skeleton の `--model` は FormalElection 以外を明示失敗とする意図的 fail-closed(§5)。
- **D-U5-6**: timeout 超過時は要件再裁定へエスカレーション。本 Unit で timeout・予算・pin・マトリクスを緩めない(§8)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T21:43:40Z
- **Iteration:** 1
- **Scope decision:** none

u5 design satisfies owned files/ACs, both-models injection red, rulings (SD Q1=A/ADR-6/ADR-10/FE Q1=A), fail-closed, FormalElection invariance; 3 advisory minors recorded for implementation.

### Findings

- None
