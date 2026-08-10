# Domain Entities — U2 budget-sensor

**Intent**: 260810-grilling-frontier-resync / **Stage**: functional-design / **Unit**: budget-sensor (library)

上流入力(consumes 全数): `requirements.md`(FR-CONTRACT-4 の語彙)、`component-methods.md`(シグネチャ)、`components.md`(所有ファイル)、`services.md`(advisory 出力契約)、`unit-of-work.md`(U2 境界)、`unit-of-work-story-map.md`(利用者可視の finding 種)。

## 型・値(amadeus-sensor-question-budget.ts 内、既存様式に従う)

| 実体 | 形 | 備考 |
|---|---|---|
| `GrillingMarker` 判定結果 | `{ grilling: boolean; malformed: boolean }` | boolean 2値の小さな判別。無効状態(grilling かつ malformed)は構成不能にする(malformed 時は grilling=false) |
| 超過記録行 parse 結果 | `{ depth: string; questions: number } \| null` | null = 記録行不成立。questions は数値 parse 必須(型不正は null) |
| finding reason 語彙(追加分) | `"malformed-marker" \| "unknown-depth" \| "missing-justification" \| "missing-deferred-list" \| "justified-overrun"` | 既存 `"over-budget" \| "within-budget" \| "no-depth" \| "pre-cutoff"` に加算。既存語彙の意味は不変 |
| 正本トークン(C1 参照) | マーカー行・記録行の verbatim 文字列定数 | **C1(grilling-protocol.md)が正本** — センサー内の定数にはコメントで C1 参照を明記し、独自変形しない |

## 検査面(C4 テスト)の実体

- t415 改訂分: 新契約 pin 群(正本文言)+復活禁止 pin 群。
- 新規センサーテスト(t530 帯): 3態+vacuity guard+回帰(マーカー非検知の判定不変)。fixture はワークフロー中間状態(記入前ドラフト等)も含める(transient-state-fixtures)。
- 対角実測の記録: 改訂前 t415 × 改訂後正本の赤は、fix コミット後の一時 checkout で実測し復元(falling-proof-no-stash — pre-fix 面切替は checkout 限定・fix SHA 明示)。
