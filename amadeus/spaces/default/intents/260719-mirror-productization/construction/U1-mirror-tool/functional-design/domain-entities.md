# Domain Entities — U1-mirror-tool(260719-mirror-productization)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

> スタイル: functional-domain-modeling-ts(既存 mirror.ts の判別ユニオンを正本とし、U1 は追加型のみ定義。既存型 ArgsOutcome/SnapshotOutcome/GhResult は挙動不変で不変)

## 既存エンティティ(移設・不変 — 変更禁止面)

| 型 | 定義所在(移設後) | 契約 |
|---|---|---|
| `ArgsOutcome` | amadeus-mirror.ts(移設) | verb+--intent の parse 結果。`status` verb を合法集合へ追加(構造は不変) |
| `SnapshotOutcome` | 同上 | intents.json+amadeus-state.md からの決定的スナップショット(buildSnapshot :111-156 相当) |
| `GhResult` | 同上 | GhRunner シームの結果(注入可能) |

## 新規エンティティ(U1 追加分)

### `StatusFinding`(乖離1件)

> 命名の意図的相違(申告): component-methods.md C1 の確定形が `Finding[]` と略記した要素型を、本書で `StatusFinding` として正式命名する(グローバルな Finding との取り違え防止 — ddd-when-to-wrap-primitives の命名面)。**正本名は StatusFinding** とし、code-generation はこちらを使う。

```
type StatusFindingKind = "stale-status-line" | "mirror-missing" | "issue-drifted";
type StatusFinding = { kind: StatusFindingKind; detail: string };
```

- `stale-status-line`: record 側の節目状態(state の Status/Lifecycle)と Issue 本文の状態行の不一致
- `mirror-missing`: state に `Mirror Issue` フィールド不在、または番号の Issue が `gh issue view` で取得不能
- `issue-drifted`: Issue 本文が「現 record から create/sync と同一レンダラで再生成した期待本文」と不一致

### `StatusOutcome`(status verb の結果 — component-methods C1 の確定形)

```
type StatusOutcome =
  | { kind: "clean" }
  | { kind: "diverged"; findings: StatusFinding[] }   // findings は非空
  | { kind: "precondition"; reason: string };          // gh 不在/未認証/record 不在
```

- exit 写像(ADR-2/E-MPRRA3): clean→0 / diverged→1 / precondition→2
- 不変条件: `diverged` の findings は1件以上(空 diverged は表現不能 — parse-don't-validate)

## エンティティ間関係

StatusOutcome は SnapshotOutcome(record 側)+GhResult(Issue 側)の**読取専用比較**から導出される純関数の結果。書込系エンティティへの参照を持たない(FR-2 書込ゼロ)。
