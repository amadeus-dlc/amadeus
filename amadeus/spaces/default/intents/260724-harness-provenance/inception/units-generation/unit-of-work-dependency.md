# Unit of Work Dependency — 260724-harness-provenance

上流入力(consumes 全数): components.md, component-methods.md, services.md, component-dependency.md, decisions.md, requirements.md, stories.md

## 依存トポロジー(what can depend on what)

U2(Harness Recorder)は U1(Harness Detector)が公開する `detectHarnessType(): HarnessType` に依存する。U1 は他ユニットに依存しない(既存 `amadeus-lib.ts` シンボルのみ)。したがって依存 DAG は `U1 → U2` の単純な直列。この直列依存は services.md が示す唯一の内部呼出関係(`handleIntentBirthStateBuild → detectHarnessType`、同一プロセス内同期呼出、独立サービスは N/A)をユニット依存へ写したものである。

本ステージは実装順序・critical path を決めない(それは delivery-planning = stage 2.8 の責務)。以下は「何が何に依存しうるか」の記述に留める。

## parseBoltDag 用 YAML edge block

```yaml
units:
  - name: harness-detector
    depends_on: []
  - name: harness-recorder
    depends_on: [harness-detector]
```

## 依存図

```
U1: harness-detector   [amadeus-lib.ts: detectHarnessType/HarnessType/HARNESS_DIR_TO_TYPE]
        |
        | (detectHarnessType() を公開 API 契約として提供)
        v
U2: harness-recorder   [amadeus-utility.ts: handleIntentBirthStateBuild が呼出 + docs + dist]
```

## ファイル交差判定(cid:code-generation:c6)

- U1 の編集正本: `packages/framework/core/tools/amadeus-lib.ts`、`tests/unit/`
- U2 の編集正本: `packages/framework/core/tools/amadeus-utility.ts`、`docs/reference/`、`tests/integration/`、dist/self-install 再生成面
- **交差なし**(正本ファイルが異なる)。ただし U1→U2 の型契約依存があるため、U2 は U1 の `detectHarnessType()` が着地してから実装するのが自然(直列)。dist 再生成は U2 が両ユニット分をまとめて行う(U1 単独では dist を再生成せず、U2 で `amadeus-lib.ts` + `amadeus-utility.ts` の両変更を1回の `bun scripts/package.ts` で反映)
