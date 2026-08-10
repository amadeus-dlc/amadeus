# Application Design Questions — CG 観測可能区間と帰属不能残余

## 質問方針

Depth Standard の総質問予算は最大8問である。semi autonomy の質問モード裁定は `Guide me`（AUTO_DECIDED `auto-decision-fbd267c122b3e48162cafc3a7e9e6ab2`）となった。

`requirements.md`、Brownfield の `architecture.md` と `component-inventory.md`、および team-practices から次は確定済みであるため質問しない。

- 単一のBun/TypeScript read-only CLIを維持し、AWS service、network service、database、UIを追加しない。
- 既存measured populationと既存renderer contractは維持し、新規attribution sectionをappend-onlyで追加する。
- journal正規化、candidate decode、interval会計、semantic report、rendererの依存方向は一方向にする。
- 新規runtime dependencyを追加せず、`packages/framework/core/`だけを正本として変更する。

## Q1. attribution実装のmodule boundary

既存`amadeus-stage-stats.ts`の公開関数とCLI entryを維持しながら、candidate decode・interval会計・semantic modelをどの境界で実装しますか。

A. `amadeus-stage-stats.ts`を互換façade/CLI/composerとして残し、attribution domain、candidate decoder、interval accountantを純粋moduleへ分離する（推奨）
B. 新規moduleを作らず、既存`amadeus-stage-stats.ts`内のprivate sectionとして全機能を追加する
C. `amadeus-stage-attribution.ts`を別CLIとして新設し、既存`stage-stats`とは別reportを出す
D. pluginまたはnetwork serviceとしてattribution処理を分離し、`stage-stats`から呼び出す
X. Other (please specify)

[Answer]: A — `amadeus-stage-stats.ts`を互換façade/CLI/composerとして残し、attribution domain、candidate decoder、interval accountantを純粋moduleへ分離する（E-AUTO-AD-2695-Q1、AUTO_DECIDED `auto-decision-6e64324e8746f7ec14cd83cd8fc5f586`）

## 回答後の設計反映

- 選択肢Aなら、既存public importとCLIはfaçadeで保持し、pure moduleはI/Oやrendererに依存させない。
- 選択肢Bなら、既存1,000行級fileの変更理由競合とcomplexity riskを受容する必要がある。
- 選択肢C/Dは3format semantic parity、単一read-only process、新規依存禁止との整合を追加で証明する必要がある。
