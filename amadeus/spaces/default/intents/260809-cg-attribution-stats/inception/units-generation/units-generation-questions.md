# Units Generation Questions — CG 観測可能区間と帰属不能残余

## 質問方針

Depth Standardの総質問予算は最大8問である。semi autonomyの質問モード裁定は`Guide me`（AUTO_DECIDED `auto-decision-cb2c14836d2deca1c7bc32a4f3f45277`）となった。

`components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`から、deployment target、integration contract、禁止edge、既存CLI互換は確定済みである。公開成果を変えるmaterial decisionはUnit境界だけであり、他の設問は上流契約を執行する。

## Q1. Unit boundary strategy

既存CLIへの単一feature deliveryを保ちつつ、pure moduleの独立テスト性と依存DAGをどのUnit境界で表現しますか。

A. domain contracts、candidate inventory、population accounting、stage-stats service integrationの4つへ変更理由で分ける（推奨）
B. pure coreとCLI surfaceの2 Unitへまとめる
C. Issue #2695全体を単一feature Unitにする
D. C-01〜C-05を1 component = 1 Unitとして5分割する
X. Other (please specify)

[Answer]: A — 4つの変更理由Unitへ分ける（E-AUTO-UG-2695-Q1、AUTO_DECIDED `auto-decision-37c9d3e7001a3bcda9e5164d6b6ff218`）

## Q2. Unit granularity

Unit granularityはどの水準にしますか。

[Answer]: 中粒度。type contractだけを所有するfoundation、candidate evidence、population accounting、既存service統合の4 Unitとする。file単位の過分割はせず、各Unitをpublic seamから独立検証できる大きさにする（E-UG-2695-Q2、根拠: `components.md` C-01〜C-06、`decisions.md` ADR-1/3）。

## Q3. Dependency and parallelism policy

Unit依存と独立Unitの扱いをどうしますか。

[Answer]: strictな非循環DAGとし、domain contractsを共有provider、candidate inventoryとpopulation accountingを相互edgeのない独立枝、stage-stats service integrationを合流点とする。独立枝の並行可能性は記録するが、単一の推奨実装順やcritical pathは決めない（E-UG-2695-Q3、根拠: `component-dependency.md`）。

## Q4. Integration points and contracts

Unit間をどの契約で接続しますか。

[Answer]: C-02のreadonly判別unionと`AttributionResult`、C-03の`CandidateInventory`、C-04の`AttributionPopulationAccounting`、C-01のtyped orchestrationを使う。shared mutable state、network API、database、runtime projection、rendererからdomainへの逆依存は作らない（E-UG-2695-Q4、根拠: `component-methods.md`と`component-dependency.md`）。

## Q5. Deployment model and canonical kind

各Unitのdeployment modelとcanonical kindをどう分類しますか。

[Answer]: domain contracts、candidate inventory、population accountingはstandalone runtimeを持たないembedded `library`、stage-stats service integrationは既存one-shot CLI executableを変更する`service`とする。新規deployable service、AWS resource、daemon、別CLIは作らない（E-UG-2695-Q5、根拠: `services.md` S-01と`decisions.md` ADR-1）。

## Decomposition plan approval

4 Unit、依存edge `candidate/accounting → domain` と `service → domain/candidate/accounting`、canonical kind `library/library/library/service`のplanを承認する。

[Answer]: Approve Plan（E-AUTO-UG-2695-PLAN、AUTO_DECIDED `auto-decision-f7f1e9b3e56f6345ac52ba27f3344c4c`）

## Ambiguity analysis

- 「service」はteamやnetwork serviceではなく、canonical kind定義の「deployed executable」として既存Stage Statistics CLIを指す。
- U-02/U-03のparallelismはDAG上edgeがない事実だけを示し、Stage 2.8の経済的順序を先取りしない。
- user-stories stageはscopeで未生成のため、story mapは`requirements.md`のFR/NFRを実装ナラティブとして全数写像する。
- 未解消のmaterial ambiguityはない。
