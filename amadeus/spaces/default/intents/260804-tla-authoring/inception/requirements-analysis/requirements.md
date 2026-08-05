# Requirements Analysis: TLA+ Model Authoring

## 1. Intent分析

本initiativeは、[Issue #2161](https://github.com/amadeus-dlc/amadeus/issues/2161)を正本として、現在の要求・設計とTLA+モデルの間にある供給工程の断線を解消する`self-feature`である。利用者が必要としているのはTLC実行器の追加ではなく、形式検証の適用判定、モデルの新規作成または改訂、要求との全数対応、proof、独立レビュー、人間承認、登録、既存`formal-model-check`実行までを一続きの監査可能な契約にすることである。

上流の`intent-statement.md`と`scope-document.md`が定義したM1〜M8をすべてMustとする。既存モデルの無関係な`NOT_DETECTED`、文書だけの存在、または単発の例示モデル作成では完了とみなさない。

### 1.1 分析結果

- 種別: 既存Amadeus workflowへの機能追加
- 範囲: stage graph、plugin projection、形式検証evidence、全配布harnessにまたがる複数component
- 複雑度: Standard depthで扱う高リスクの横断変更
- 成功境界: M1〜M8、Comprehensive検証、全配布面のsource-only/reproducibility契約がgreenで、未解決BLOCKERが0件

## 2. 利用者と主要シナリオ

### 2.1 利用者

- 状態機械、プロトコル、ワークフローを設計・変更する開発者
- 要求と設計の矛盾を実装前に検出するプロダクト、アーキテクチャ、品質担当者
- 適用判定、モデル鮮度、proof、承認履歴を監査するAmadeusメンテナー

### 2.2 正常シナリオ

1. 未知の新規プロトコル要求を検出し、新規モデルauthoringへ分岐する。
2. requirement、FR、cid、裁定、design identityからnamed invariantを導出する。
3. `.tla`、`.cfg`、reduction manifest、trace evidenceを作成し、proofとレビューを完了する。
4. 人間承認後に`model-map.json`へ登録し、既存`formal-model-check`へ引き渡す。
5. 現在のrequirements/design identityに相関したverdict receiptを得る。

### 2.3 代替シナリオ

- 登録済みモデルに関係する意味変更はモデル改訂へ分岐する。
- 意味不変の実装変更は既存`--impl-only`契約へ分岐する。
- 形式検証の非対象変更は、理由と人間承認を持つ非対象receiptへ分岐する。

### 2.4 失敗シナリオ

- 適用判定、trace coverage、proof、独立レビュー、人間承認のいずれかが欠ける場合は登録またはhold解除を拒否する。
- requirementsまたはdesign identityが変化した場合は旧evidenceをstaleとして拒否する。
- composed runtimeで必要moduleが欠ける場合はcanonical source直実行の成功で代替せず、配布契約違反として失敗させる。

## 3. 機能要件

### FR-001 形式検証の適用判定

システムはRequirements Analysisで、現在の対象identityに対して形式検証の適用可否を明示判定し、次のいずれか一つへ決定論的に分岐しなければならない。

1. 未知対象の新規authoring
2. 登録済み対象のモデル改訂
3. 意味不変変更の`--impl-only`
4. 形式検証の非対象

判定結果は、対象identity、理由、選択経路、判定主体を監査可能なevidenceとして永続化しなければならない。判定不能または必要証拠不足はfail-closedとし、無関係な既存モデルの成功で代替してはならない。

### FR-002 未知対象の新規authoring

システムは、未知の状態機械、プロトコル、またはワークフローが形式検証対象と判定された場合、現在の要求・裁定からnamed invariantを導出し、少なくとも`.tla`、`.cfg`、reduction manifest、trace evidenceを供給する実行可能なownerへ処理を渡さなければならない。

### FR-003 意味変更時のモデル改訂

システムは、登録済みモデルに関係するguard、transition、status、operation、load-bearing fieldの意味変更を検出した場合、既存evidenceをstale化し、モデル改訂と再proofを完了するまでhold解除を拒否しなければならない。

### FR-004 意味不変変更の`--impl-only`

システムは、実装変更がモデル化された意味を変更しないと証明・承認された場合に限り、既存`--impl-only`契約へ分岐できる。receiptは対象identity、根拠、承認、参照するmodel/verdict identityを含まなければならない。

### FR-005 非対象判定

システムは、純粋関数など形式検証の非対象と判定された変更について、理由、対象identity、人間承認を永続receiptへ記録しなければならない。理由または承認が欠ける非対象判定は完了として扱ってはならない。

### FR-006 要求からinvariantへの全数トレーサビリティ

システムは、対象となるrequirement、FR、cid、裁定、design identityのすべてを、登録モデルと1件以上のnamed invariantへ追跡可能にしなければならない。対象項目の未対応、孤立したinvariant、重複または解決不能なidentityはcoverage failureとしてfail-closedにしなければならない。

### FR-007 identity変更によるstaleness

システムは、proofまたはverdictが参照するrequirements identityまたはdesign identityが変化した場合、旧evidenceを自動的にstaleとして扱わなければならない。旧verdictの存在だけでadvisory holdまたはauthoring gateを解除してはならない。

### FR-008 proofの完了条件

新規作成または改訂したモデルは、登録前に次をすべて満たさなければならない。

- TLC完全探索が成功する。
- 各named invariantについてfalling proofが成立する。
- vacuity proofが成立する。
- reductionが元要求の意味を失わないことを示すevidenceがある。
- proof evidenceが対象requirements/design/model identityへ結び付く。

### FR-009 独立レビューと人間ゲート

システムは、モデル作成主体とは独立したreviewerによる、reduction、invariant、trace coverage、proof evidenceのレビューを必須としなければならない。レビューが承認された後も、人間ゲートの明示承認がなければ登録またはhandoffを完了してはならない。

### FR-010 原子的な登録とhandoff

システムは、適用判定、trace coverage、鮮度、proof、独立レビュー、人間承認がすべてcurrentである場合に限り、`model-map.json`登録と既存`formal-model-check`へのhandoffを成功させなければならない。部分更新をcompleteとして観測させてはならず、失敗時は未登録または明示的な失敗状態を維持しなければならない。

### FR-011 plugin import closureの修復

システムは、`run-model-check.ts`の実行推移閉包に含まれる`plugins/formal-model-check/tools/tla-model-receipt.ts`と`tla-module-deps.ts`をplugin manifestおよび全配布harnessへ投影し、composed runtimeから解決可能にしなければならない。この修復はIssue #2161のM7/M8を成立させる前提として同一initiative内で扱う。

### FR-012 未知題材E2E

システムは、`FormalElection`および`MirrorLifecycle`とは別の未知題材を使い、要求入力から適用判定、新規authoringまたは改訂、trace、proof、レビュー、承認、登録、既存`formal-model-check`実行、相関verdictまでをE2Eで実測しなければならない。

### FR-013 既存モデル互換

システムは、`FormalElection`と`MirrorLifecycle`の既存利用者向け実行契約、source byte identity、verdict identityを意図せず変更してはならない。

## 4. 非機能要件

### NFR-001 決定性と再現性

同一のcanonical inputs、requirements/design/model identity、toolchain条件に対するroute、coverage判定、staleness判定、登録可否、verdict identityは再現可能でなければならない。LLMが生成するモデル本文のbyte決定性は要求しない。

### NFR-002 監査性

適用判定からhandoffまでの各evidenceは、対象identity、生成主体、レビュー主体、人間承認、生成時刻、直前evidenceへの参照を持ち、後から一連の判断を復元できなければならない。

### NFR-003 fail-closed reliability

必要evidenceの欠落、identity不一致、stale evidence、projection欠落、partial registration、review未承認は、成功や非対象へ暗黙変換せず、typed failureとして観測可能でなければならない。

### NFR-004 保守性

authoring責務と既存`formal-model-check`の決定論的実行責務を分離しなければならない。stage配置、schema、component境界の具体方式はApplication Designで決定するが、一方の変更が他方の責務を重複実装する構造は避ける。

### NFR-005 配布整合性

canonical sourceからplugin manifest、bundle/ownedPaths、全配布harnessのcomposed runtimeまでimport closureが成立しなければならない。生成`dist/`やself-install面を正本として手編集してはならず、source-only checkとreproducible buildを通過しなければならない。

### NFR-006 検証可能性

各FRはunit、integration、projection/conformance、E2Eのいずれかでpass/failを自動判定できなければならない。Comprehensive test strategyとして、正常、欠落、stale、改竄、部分成功、既存互換を含むfixtureを持たなければならない。

## 5. 受け入れ基準

### AC-001 未知対象のauthoring強制（M1）

Given 未登録の新規プロトコル要求が形式検証対象である
When Requirements Analysisからauthoring経路を実行する
Then 新規モデル、設定、reduction、trace、proof、review、承認が揃うまでholdを解除しない
And `FormalElection`の既存成功だけでは完了しない

### AC-002 意味変更時の改訂（M2）

Given 登録済みモデルに対応するguard等の意味変更fixtureがある
When identityと影響を評価する
Then 旧evidenceをstale化する
And モデル改訂と再proofまで完了を拒否する

### AC-003 `--impl-only`（M3）

Given モデル化された意味を変えない実装変更がある
When 根拠と人間承認を記録する
Then 対象identity付き`--impl-only` receiptを生成する
And モデル改訂を要求しない

### AC-004 非対象receipt（M4）

Given 形式検証対象外のpure function fixtureがある
When 非対象理由を人間が承認する
Then 理由と対象identityを持つ永続receiptを生成する
And 理由または承認の欠落時は失敗する

### AC-005 全数coverage（M5）

Given 対象requirementまたはdesign identityの一部がnamed invariantへ未対応である
When trace coverageを評価する
Then coverage failureとして登録を拒否する

### AC-006 staleness（M6）

Given current verdict生成後にrequirementsまたはdesign identityが変化した
When 旧verdictでhold解除を試みる
Then stale evidenceとして拒否する

### AC-007 未知題材E2E（M7）

Given `FormalElection`と`MirrorLifecycle`以外の未知題材がある
When 要求から登録済みモデルの実行までを全配布対象runtimeで実行する
Then authoring、proof、review、承認、登録、`formal-model-check`、相関verdictを実測できる
And composed runtimeでmissing importが発生しない

### AC-008 既存互換（M8）

Given 既存の`FormalElection`と`MirrorLifecycle`がある
When authoring工程とimport closure修復を導入する
Then 既存回帰テストが成功する
And 既存source byte identityとverdict identityが不変である

## 6. 制約

- scopeは`self-feature`、depthはStandard、test strategyはComprehensiveとする。
- canonical変更は`packages/framework/core/`およびplugin sourceへ置く。
- 生成`dist/`、`.claude/`、`.codex/`、`.agents/`、`.cursor/`、`.opencode/`、`.kimi-code/`の非allowlist成果物をコミットしない。
- 既存advisory correlation、source byte identity、model receipt、`--impl-only`契約を再利用する。
- `formal-model-check`は登録済みモデルの決定論的実行責務を維持する。
- team-practicesに従い、要求はtestableかつ上流sourceへtrace可能にし、walking skeletonとdependency/risk-firstで検証する。

## 7. 前提

- TLA+とTLCは、状態遷移を持つ対象の安全性・活性性を検証する手段として継続利用できる。
- 形式検証の適用対象は全コード変更ではなく、状態機械、プロトコル、ワークフローとそれらの意味変更である。
- authoring ownerの物理配置、新規stageか既存stage overlayか、identity粒度、receipt schemaは、本要件を弱めない範囲でApplication Designが決定する。
- 外部期限は指定されていない。

## 8. 対象外

- TLC実行器、verdict normalization、既存model receipt処理の全面再実装
- 全コード変更へのTLA+適用強制
- LLMによるTLA+生成本文そのものの決定論化
- `FormalElection`と`MirrorLifecycle`の既存verdict identityの意図的変更
- deployment、長期運用、監視機能の追加
- Issue #2161を規模だけで複数Intentへ分割すること

## 9. 設計へ送る未決事項

次は要求の未確定ではなく、Application Designで比較・決定する設計事項である。

1. authoring ownerを独立stageにするか、既存stageへfail-closed overlayとして配置するか。
2. requirement/design identityの正規化単位とdigest構成。
3. applicability、trace、proof、review、approval receiptのschemaと保存場所。
4. evidence一式と`model-map.json`登録を原子的に観測させるcommit protocol。
5. plugin projection時にimport closureを静的検証する境界。
6. `FormalElection`と`MirrorLifecycle`以外で使用する未知題材fixture。

## 10. トレーサビリティ

| Requirement | Scope outcome | 主な検証 |
|---|---|---|
| FR-001, FR-002 | M1 | AC-001 |
| FR-003 | M2 | AC-002 |
| FR-004 | M3 | AC-003 |
| FR-005 | M4 | AC-004 |
| FR-006 | M5 | AC-005 |
| FR-007 | M6 | AC-006 |
| FR-008〜FR-012 | M7 | AC-007 |
| FR-011, FR-013 | M8 | AC-008 |

### 上流source

- `ideation/intent-capture/intent-statement.md`
- `ideation/scope-definition/scope-document.md`
- `codekb/amadeus/business-overview.md`
- `codekb/amadeus/architecture.md`
- `codekb/amadeus/code-structure.md`
- `amadeus/spaces/default/memory/team.md`
- `amadeus/spaces/default/memory/project.md`
- `amadeus/spaces/default/memory/phases/inception.md`
- [Issue #2161](https://github.com/amadeus-dlc/amadeus/issues/2161)

## 11. Open Questions

Requirements Analysisとしての未回答事項はない。第9節の項目はApplication Designの明示的な判断対象として引き継ぐ。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-04T14:02:05Z
- **Iteration:** 1
- **Scope decision:** none

M1〜M8はFR・AC・トレーサビリティへ全数反映され、Issue #2161の境界逸脱と未解決BLOCKERはなく、質問回答AもFR-011、AC-007/008、NFR-005へ一貫して反映されている。

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260804-tla-authoring/inception/requirements-analysis/requirements.md:135 — Comprehensive fixtureの改竄を、Application Designのテスト表でidentity不一致またはevidence integrity failureとしてNFR-003へ対応付ける。
- NIT | amadeus/spaces/default/intents/260804-tla-authoring/inception/requirements-analysis/requirements.md:231 — 後続工程でFRとM1〜M8の多対多の補助対応を示すとレビューしやすい。
- NIT | amadeus/spaces/default/intents/260804-tla-authoring/inception/requirements-analysis/requirements.md:119 — evidence価値鎖の先頭はroot markerまたはnullable predecessorとしてschema設計する。
- NIT | amadeus/spaces/default/intents/260804-tla-authoring/inception/requirements-analysis/requirements-analysis-questions.md:20 — 回答AはFR-011、AC-007/008へ過不足なく反映され、追加scopeはない。
