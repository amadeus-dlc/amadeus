# Domain Entities — u3-lifecycle-integration

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

U3 は新しいエンティティを導入しない — unit-of-work の U3 定義は既存 boundary(services のプロセス境界)と U1/U2 の型(component-methods C0 が verbatim 正)の**配線**である。ここでは U3 が消費・評価する型と、completion ゲートの判別結果だけを定義する。story-map ジャーニー3の状態面。

## 消費する型(component-methods 正本 — 新設なし)

| 型 | U3 での消費 |
|---|---|
| `MirrorBoundary`(既存5種) | boundary 別挙動表(business-logic-model)のディスパッチキー。新 variant を追加しない(requirements FR-1b) |
| `ExpectedProjectStatus` | parked(keep)/ 完了(done 名)/ フェーズ名の3分岐を boundary 文脈で消費(BR-U3-1〜3) |
| `MirrorProjectSyncEntry`(U2 完全形) | completionProjectGate の入力(state と lastAppliedStatus) |

## completionProjectGate の判別結果(component-methods のシグネチャを verbatim 採用)

```ts
{ ready: boolean; blocking: readonly string[] }  // component-methods.md:72 のシグネチャそのまま(blocking は常時存在)
// ready=true  → 全同期対象が synced かつ lastAppliedStatus = done 名(blocking は空配列)
// ready=false → blocking に阻止要因の Project 列("owner/number: pending" 等) — 警告・診断文言の材料
```

- `blocking` は close 保留の説明責任を担う(requirements FR-8b の「close しない」を無音にしない — services の loud 原則)。
- 判定は台帳のみから決定的に導出(BR-U3-8)— Project API 再照会をしないため、gate 評価自体は障害の影響を受けない。

## 不変条件

- `Done` 名の導出は `expectedProjectStatus`(canonical 1定義)の done 分岐のみ — gate 側で独自に文字列を持たない(FR-9c の複製導出禁止と同根)。
- close 実行後の台帳は変更しない(close は Issue 面の操作 — projectSync 台帳は最終同期結果の記録として残る)。
