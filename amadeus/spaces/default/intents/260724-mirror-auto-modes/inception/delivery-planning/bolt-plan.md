# Bolt Plan

> 上流入力（consumes 全数）: `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`

## Planning Contract

`team-practices.md`のwalking-skeleton-first方針、`requirements.md`の重複防止・safe close、`components.md`のC0〜C9、`unit-of-work.md`の5 Unit、`unit-of-work-dependency.md`のcycle-free DAG、`unit-of-work-story-map.md`のAS-01〜08を2 Boltへ束ねる。

BoltはConstruction stagesを一巡するdeployable sliceである。本Intentにアプリケーション配備基盤はないため、ここでの「deployable」は、正本・tests・配布対象を一つのreviewable changeとして統合できることを意味する。Bolt間は逐次実行し、各Unitは正確に1 Boltへ所属する。

## Bolt 1 — Runtime Walking Skeleton

- **Walking skeleton:** Yes
- **Gate:** 必須。Bolt 2開始前に人間が明示承認する
- **Units:** `mirror-contract-policy`、`mirror-state-provenance`、`mirror-github-gateway`、`mirror-operation-lifecycle`
- **Internal parallelism:** `mirror-state-provenance`と`mirror-github-gateway`はC0 contract確定後に並行作業可能
- **Mob:** AI Runtime Mob

### Definition of Done

- `off | prompt | auto`を厳密に解決し、未指定は`prompt`、booleanはinvalidになる。
- Intent Capture承認後のcreate、phase／park sync、workflow completionのfinal sync／safe closeが実装される。
- `prepare → attempted → remote → complete`とprovenance／repository／landing guardが成立する。
- remote create成功後のlocal write失敗を注入し、再入で同じIssueへ収束し新規Issue作成件数が0件である。
- config、policy、state、marker、Gateway、lifecycleのunit／integration／failure-injection testsが通る。
- statusはresolved mode、Issue、provenance、pending、warningを表示し、read-only操作でmutationしない。
- live smoke以外はfake GitHub runnerだけで完結する。

### Confidence Hypothesis

「最大の不可逆リスクである部分失敗を発生させても、operation identityとmarker再発見により正準Issue 1件へ収束し、AI-DLC workflowを止めない」を検証する。

### Expected Demo

1. `auto`のIntent Capture approvalでIssueを1件作成しprovenanceを保存する。
2. remote成功直後のlocal complete writeを失敗させる。
3. 次boundaryで既存Issueを再発見し、2件目を作らずstateを修復する。
4. `off`が操作を抑止し、`prompt`がoperationごとに確認し、`auto`がbounded chainを実行することをfake runnerで示す。
5. 許可された環境では明示repositoryへのlive smokeを別gateで実行する。

## Bolt 2 — Distribution and Documentation

- **Walking skeleton:** No
- **Gate:** 通常のBolt gate／Construction autonomy modeに従う
- **Units:** `mirror-distribution-docs`
- **Depends on:** Bolt 1のruntime contract
- **Mob:** AI Distribution Mob

### Definition of Done

- core正本、skill、必要なharness manifest／emit、package／promote対象が同期される。
- `claude | codex | cursor | kiro | kiro-ide | opencode`の6面へ同じruntime contractが生成される。
- Guide／Referenceの日英ペアとCLI helpが三モード、既定`prompt`、boolean拒否、boundary、retry、safe closeを同じ意味で説明する。
- source layoutとself-install layoutでworkspace rootを正しく解決する。
- `dist:check`、`promote:self:check`、distribution tests、docs parity checkが通る。
- `dist/`とself-install生成物に手編集由来のdriftがない。

### Confidence Hypothesis

「完成runtime contractを正本から投影すれば、6ハーネスと日英文書が同じ挙動を説明・提供し、生成物driftをblocking gateで検出できる」を検証する。

### Expected Demo

6つのdistribution layoutでMirror tool／skillを検出し、同じ三モードhelp／status contractを確認する。日英Guide／Referenceの対応項目と生成drift checkのgreenを提示する。

## DAG Validation

Bolt 1内のUnit DAGは`mirror-contract-policy → {mirror-state-provenance, mirror-github-gateway} → mirror-operation-lifecycle`である。Bolt 2の`mirror-distribution-docs`は`mirror-operation-lifecycle`に依存するため、Bolt 1→Bolt 2は`unit-of-work-dependency.md`と一致する。Unitを依存元より前へ配置する例外は0件である。
