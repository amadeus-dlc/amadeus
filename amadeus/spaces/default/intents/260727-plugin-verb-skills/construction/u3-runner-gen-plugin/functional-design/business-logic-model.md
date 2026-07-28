# Business Logic Model — U3 u3-runner-gen-plugin

上流入力(consumes 全数): unit-of-work.md(U3 境界)、unit-of-work-story-map.md(plugin stage 実行ジャーニー)、requirements.md(FR-4a〜4d)、components.md(C4)、component-methods.md(C4 変更点)、services.md(入口3系統)

## 処理フロー(3層 — compile 焼き込み → runner-gen 生成/prune → CLI 配線)

```
[compile 層] amadeus-graph.ts compile
  → plugin stage の join 時(既存の buildGraphStage 経路)にノードへ plugin_source: true を焼く(ADR-1 確定主案)
  → stock stage のノードは**フィールド不在**(明示 false は書かない — 既存 optional フィールドの codebase 規約は全て `if (parsed.x !== undefined)` 形で不在を既定とする(buildGraphStage、amadeus-graph.ts:2298-2360 の reviewer 実測)。false 分岐を作ると FR-4c のバイト不変が壊れる)
  → 注: 本フィールド追加は amadeus-graph.ts:2143 の既存コメント「a plugin stage is indistinguishable from a core stage once on the graph (BR-U2-1 generic)」の不変量を改訂する — 実装時に同コメントを更新する(コメント前提の陳腐化を残さない)

[生成層] amadeus-runner-gen.ts write
  → isRunnableStage(phase !== "initialization")は不変
  → plugin_source ノードも runner 生成対象(renderStageRunner の1テンプレート — 複製しない)
  → check: 集合等価判定は不変(plugin runner 生成済みなら green)
  → prune: compiled 集合から消えた plugin slug の runner dir(両マーカー持ち)は既存 pruneOrphanRunners 経路で除去

[配線層] amadeus-plugin.ts
  → handleCompose / handleDrop の両方: spawnRecompile 成功後に spawn(["bun", <tools>/amadeus-runner-gen.ts, "write"])
  → 失敗時は failure(stage:"apply")系で loud(runner 生成失敗を無音にしない)
```

## 観測可能契約(FR-4a/4b/4c への対応)

| 契約 | 観測点 |
|---|---|
| compose 後に `/amadeus-<slug>` runner 実在(FR-4a) | `<hostRoot>/skills/amadeus-<slug>/SKILL.md` が生成され `--stage <slug> --single` マーカーを持つ |
| drop 後に残存なし(FR-4b) | 同 dir が prune 済み |
| stock 面の不変(FR-4c) | repo(plugin 不在)で write/check の出力・verdict がバイト不変。t129 の 29/3 も不変 |

## stock runner への冪等性

write の再生成は同一 graph+同一テンプレートからバイト同一を再出力する(ホストの出荷済み stock runner を意味的に置換しない)。この冪等性は fixture でピンする(component-methods.md C4 テスト行)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T22:37:32Z
- **Iteration:** 1
- **Scope decision:** none

ADR-1 主案への忠実な写像・全 file:line 実測一致・t129 不変主張の構造的妥当性を確認し READY。Minor 2件(stock ノードの false 分岐禁止の明文化 / amadeus-graph.ts:2143 の既存不変量コメント改訂の実装タスク化)は conductor が受領後に BLM へ反映済み。

### Findings

- [Minor] stock ノードのフィールド表現が2成果物間で確度不一致 → BLM を「不在のみ・false 禁止(buildGraphStage の codebase 規約 :2298-2360)」へ是正済み
- [Minor] amadeus-graph.ts:2143 の BR-U2-1 generic 不変量コメントが本設計で陳腐化 → 実装時のコメント更新義務を BLM に追記済み
