# Code Summary — U3 u3-runner-gen-plugin(Bolt 3)

上流入力(consumes 全数): code-generation-plan.md 経由で business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、unit-of-work.md、requirements.md を消費(plan 各項と1:1)

## 実装結果(commit 57202639d、branch bolt/u3-runner-gen-plugin、PR #1618)

- amadeus-graph.ts: plugin join 1箇所で `plugin_source: true` stamp(:2216-2218、FIELD_ORDER 追加 — undefined skip で stock バイト不変)。:2140 の不変量コメント改訂
- amadeus-runner-gen.ts: `runnerTargets(stages)` 純関数 export、plugin ノード生成対象化(renderStageRunner 1定義のまま)
- amadeus-plugin.ts(最小接触): `PluginCliDeps.generateRunners`(required seam)+spawnRunnerGen+compose/drop 両側配線(builder 申告: seam 手段は設計未規定だったため in-process 被覆と順序観測のため required 化 — conductor 裁定: BR-U3-3 の対称配線契約の実現手段として受理、既存6テストへの deps 1行伝播込み)
- graph 消費者棚卸し: core 10+テスト群、全てフィールド選択読みで additive non-breaking を実測(0-plugin の stage-graph.json バイト同一)
- テスト: t350(unit 4)/ t351(integration 4、落ちる実証先行)/ t352(integration 6、配線)。allowlist 行ピン2件を自変更シフトで同一コミット更新(意味照合済み — allowlist-line-pin-stale 準拠)

## 検証エビデンス(builder 実測)

package/promote/typecheck/lint/dist:check/promote:self:check/registry/complexity = 全 exit 0。`coverage:ci` フル 622 files / 8545 assertions / 0 fail。patch gate 18/18 covered。新規行 lcov DA 個別直読で全正。stock 面バイト不変(stage-graph diff 空・write 後 skills/ 差分 0・t129 29/3 不変)。落ちる実証は fix コミット後の checkout 限定切替で配線面 5 fail / 焼き込み面 1 fail → 復元後 green(falling-proof-no-stash 準拠)。

## 交差と着地順

Bolt 2(PR #1616)と amadeus-plugin.ts で交差(型1行+spawn 配線 vs install 追加)。後着側がマージ前に rebase+c6 実 diff 再評価で吸収する。
