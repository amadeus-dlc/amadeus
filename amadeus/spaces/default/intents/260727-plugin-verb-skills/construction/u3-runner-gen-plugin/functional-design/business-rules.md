# Business Rules — U3 u3-runner-gen-plugin

上流入力(consumes 全数): requirements.md(FR-4)、components.md(C4)、component-methods.md(C4)、services.md、unit-of-work.md(U3)、unit-of-work-story-map.md(GWT)

## BR-U3-1: 識別は compile 焼き込みが正(ADR-1)

plugin stage の識別子は compile が graph ノードへ焼く(`plugin_source` 相当のフィールド — 名称は既存 graph フィールドの命名様式に揃えて実装時確定し、申告する)。runner-gen 側での path 推測をしない。graph 変更が過大なら ADR-1 の縮退先(CompositionRecord.ownedPaths 由来)へ、申告のうえ切り替える。

## BR-U3-2: テンプレート1定義

runner の生成は renderStageRunner(amadeus-runner-gen.ts:118-163)の既存1テンプレートのみ。plugin 用の別テンプレート・条件分岐コピーを作らない。

## BR-U3-3: compose⇔drop の対称配線

handleCompose と handleDrop の**両方**が spawnRecompile 成功後に runner-gen write を spawn する(片側実装禁止 — symmetric-pair-review、component-dependency.md の対称性節)。spawn 失敗は loud(failure 系)。

## BR-U3-4: stock 面の不変(FR-4c)

- repo(plugin 不在)での write/check/t129 は出力・verdict ともに不変 — 変更前後の機械比較(write の dry 出力 diff、t129 実行)を実装の完了条件に含める
- t129 の硬い数値(29/3)には触れない

## BR-U3-5: 検証は compose 済みホスト模擬 fixture が先(FR-4d)

実装より先に「compose 済みホストを模した fixture(staging+composed stage+recompile 済み graph)」を作り、#1598 の現行欠陥(runner 不在)を**落ちる実証**として固定してから修正を入れる(regression-first)。E2E は t341 系の拡張で install→compose→runner 実在→drop→残存なしの縦断を1本(U2 の install を前提にするため、E2E 拡張の着地は U2 マージ後)。

## BR-U3-6: テスト層配置

fixture テストは integration 層(実 FS tmp ホスト)。graph 焼き込みの純粋判定(ノード → 生成対象集合)は exported 純関数化して unit 層(fs-tests-integration-first / in-process 被覆)。
