# Application Design Questions — 成果物数値の provenance ガード

上流参照: `requirements.md`、`architecture.md`、`component-inventory.md`。本 intent は full autonomy のため、以下は intent grant 内の agent recommendation として自動裁定した。

## Q1. コンポーネント境界と既存機構への統合

新しい検査責務を複数の共有モジュールへ分割するか、1つの sensor tool module 内へ閉じるか。既存 dispatcher と manifest 駆動の配線契約は変更するか。

[Answer]: E-AD1 `single-tool-module`。`packages/framework/core/tools/amadeus-sensor-numeric-provenance.ts` を唯一の実装モジュールとし、内部を純粋評価・Markdown走査・provenance解決・分類・CLI adapter の論理責務へ分ける。既存 `amadeus-sensor.ts` は変更せず、manifest と stage frontmatter だけで統合する。自動裁定: `auto-decision-dfb01af9128d4462b96a5312a472d896`。

## Q2. corpus sweep と実行時 mapping の所有

設計時に確定する成果物種別別の mode と近傍窓 `W` を、実行時に再走査するか、JSONとして読むか、TypeScript定数へ生成するか。

[Answer]: E-AD2 `generated-ts-constant`。Construction 配下の機械生成 sweep 成果物を根拠の正本とし、同じ内容を新規 tool module 内の型付き TypeScript 定数へ生成する。runtime は再走査も外部データ読込もしない。自動裁定: `auto-decision-9317a5883ca2a35868676cfeb48c5f80`。

## Q3. テスト seam、通信、永続化、UI

CLI実行だけをテストするか、純粋評価APIを公開するか。また、サービス間通信、永続ストレージ、AWS資源、UI構造を設計対象に含めるか。

[Answer]: E-AD3 `exported-pure-evaluator-with-injected-io`。純粋 evaluator を named export し、ファイル実在確認などだけを依存注入する。CLIは同期的な短命プロセスとして evaluator を呼ぶ薄い adapter とする。本 intent に長時間稼働サービス、ネットワーク通信、永続ストレージ、AWS資源、UIはない。自動裁定: `auto-decision-9f2d5f269bf45f79d528749589dc9df`。

## 対話方式

[Answer]: E-AD0 `guide`。既存要件を一問ずつ設計判断へ写す方式を採用した。自動裁定: `auto-decision-faaf86a0633493edc358fc93d6768b8d`。

## 曖昧性分析

- 「コンポーネント」はソースファイル数ではなく、単一tool module内の論理責務と既存機構との境界を指す。
- 「mapping の正本」は sweep 成果物、「runtime が読む投影」は生成済み TypeScript 定数であり、二重の裁量ある編集面を作らない。
- services.md は該当なしで空にせず、短命CLIのプロセス境界と非該当面を明記する。
- Functional Design で詳細化すべきregex、Markdown構造判定、verdict JSONのフィールド実装は、この段階では requirements の契約を越えて追加しない。
