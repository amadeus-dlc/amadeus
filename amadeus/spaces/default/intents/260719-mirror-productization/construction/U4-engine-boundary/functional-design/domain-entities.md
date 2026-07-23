# Domain Entities — U4-engine-boundary(260719-mirror-productization)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

## 新規エンティティ(amadeus-orchestrate.ts 内部)

### `MirrorBoundaryDecision`(phase 境界での分岐結果)

```
type MirrorBoundaryDecision =
  | { kind: "ask"; includeCreate: boolean }   // auto off/未設定、または auto on×ミラー未作成(E-MPRRA2 降格)
  | { kind: "auto-sync" };                     // auto on×ミラー作成済み → sync print(run-then-continue)
```

> 2値のみ(reviewer i1 M1 の是正): 冪等ケース(本境界で発火済み)は**導出関数を呼ぶ前の外側ガード**(business-logic-model の早期リターン)で処理し、型には現れない — 2入力(resolve 結果+state 読取)の純関数契約と一致。config invalid も導出前の loud エラー(BR-U4-3)で型に現れない。

- `includeCreate` = ミラー未作成(state に Mirror Issue フィールド不在)のとき true(S-05)
- 決定入力: (a) U3 `resolve()` の MirrorConfig(autoMirror)(b) state の Mirror Issue フィールド有無(getField 読取)— いずれも決定的読取のみ

### `MirrorBoundaryReceipts`(phase 境界処理のruntime Receipt)

```
type MirrorBoundaryPhase = "ideation" | "inception" | "construction";
type MirrorBoundaryReceiptStatus = "pending" | "completed";
type MirrorBoundaryReceipts =
  Partial<Record<MirrorBoundaryPhase, MirrorBoundaryReceiptStatus>>;
```

- canonical phase順は `ideation → inception → construction` とし、phase-check対象の単一定義から導出する。
- `pending`はauto-sync専用である。ask経路は回答と選択操作の成功確認後、`absent → completed`へ直接遷移し、`pending`を使用しない。
- 複数の`pending`が存在する場合、1回の`next`はcanonical順で最古の1件だけを再発行する。成功した対象だけを`completed`へ遷移し、残件は次回以降へ残す。
- field不在は空集合として扱う。未知phase、未知status、重複key、JSON構文破損はfail-safeに拒否し、`completed`を推測しない。
- stateのruntime-only `Mirror Boundary Receipts`フィールドが単一正本であり、値はphaseごとの`pending | completed`だけとする。

### 既存語彙の再利用(新 kind なし — C-04)

ask 分岐は既存 `ask` directive、auto-sync は既存 `print`(run-then-continue)を発行する。新しいdirective kindや既存workflow stageの状態値は追加しない。境界検出は `PHASE_CHECK_REQUIRED_PHASES` のcanonical参照とする。追加する状態は上記runtime-only Receiptの`pending | completed`に限定する。

## エンティティ間関係

MirrorBoundaryDecision は next の phase boundary 経路で1回だけ導出される純関数の結果(resolve 結果+state 読取 → 決定)。MirrorBoundaryReceipts はその決定の実行済み/再試行状態をruntimeで保持し、外側guardとpending回復経路が参照する。close は本決定空間に**現れない**(ADR-3 — SKILL/手動が唯一の close 導線)。
