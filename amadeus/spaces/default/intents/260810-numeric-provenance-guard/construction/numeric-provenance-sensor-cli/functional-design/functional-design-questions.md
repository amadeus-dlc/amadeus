# Functional Design Questions — numeric-provenance-sensor-cli

上流参照: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。本Unitはcanonical kind `service` だが、長時間稼働serviceではなく既存dispatcherから同期起動される短命Bun CLIであり、frontend/UIを含まない。

## Q1. 評価順序

missing、cutoff、適用性、mode、claim、provenance の判定を、順序付きfail-open pipelineと独立rule集合のどちらで固定するか。

[Answer]: E-FDU2-1 `ordered-fail-open-pipeline`。missing → record/cutoff → mechanical exclusion/lightweight → Generated Mapping → claim scan → provenance resolution → mode別verdictの順に短絡する。先行するskipped理由を後続処理で上書きしない。自動裁定: `auto-decision-36ccb0c9d2c5e8a77281da313e0ac133`。

## Q2. Markdown構造境界

外部runtime dependencyを増やさず、paragraph、同階層list item、table row、heading、code fenceの境界をどう表現するか。

[Answer]: E-FDU2-2 `single-pass-region-scanner`。行を1回走査してfence状態とregion identityを付与し、claim/provenance探索は同一region内の論理行だけに限定する。Markdown AST dependencyは追加しない。自動裁定: `auto-decision-25f8dc32cd5e8960f3d31dc73323c7a4`。

## Q3. 相対link検証

相対Markdown linkの安全性と実在性をどの順序で検証するか。

[Answer]: E-FDU2-3 `lexical-then-injected-fs`。fragment除去、URL/absolute拒否、POSIX normalize、record/repository許可root containmentの順にlexical判定し、通過した候補だけを注入I/Oの `fileExists` / `isRegularFile` で確認する。自動裁定: `auto-decision-fe8f7707093d948ae6c94d5924acc8d9`。

## Q4. Verdict構築

enforcement、measurement-only、skippedの出力不変条件をどう構築するか。

[Answer]: E-FDU2-4 `total-verdict-state-machine`。各終端をdiscriminated stateとして構築し、enforcementだけがfindingを持ち得る、measurement-onlyは常にpass、skippedは常に空findingという不変条件をconstructor境界で固定する。自動裁定: `auto-decision-a4d3e8b6ea279496a43bc1224b594746`。

## 対話方式

[Answer]: E-FDU2-0 `guide`。評価順序、構造走査、link検証、verdict状態の順に裁定した。自動裁定: `auto-decision-a40ec1c600b9fd5cde51c790dbc70ede`。

## 曖昧性分析

- U2はU1のschema・fixture・受け入れ条件を変更せず、Design-time Artifact Index、sweep generator/report、Generated Mapping、runtime評価を実装する。runtime評価は同じU2内で生成・承認済みのMappingをreadonlyに消費し、mode、`W`、配線stage集合を再計算しない。
- `single-pass-region-scanner` はCommonMark完全parserを意味せず、FR-PRED-3が要求する構造境界とFR-PRED-1のcode-fence除外だけを決定的に識別する。
- 相対linkの実在確認だけが注入I/Oを必要とし、pure evaluatorはprocess、network、runtime graph、databaseへアクセスしない。
- file-not-foundは起動エラーではない。CLI adapterがmissing stateへ変換し、Evaluatorがskipped verdictを返す。
- UI、長時間process、並行writer、外部APIは存在しない。性能要件は単一process内の線形scanとして検証する。
