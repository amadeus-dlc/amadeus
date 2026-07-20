# Domain Entities — U1 tie-choice-resolution

上流入力(consumes 全数): requirements.md、component-methods.md、unit-of-work.md — 型の変更有無は requirements.md FR-2(スキーマ不変)と component-methods.md の型設計に従い、配置は unit-of-work.md U1 の変更面に限定。

## 型(変更なし — 参照のみ)

| 型 | 所在 | 本 unit での扱い |
| --- | --- | --- |
| HoldResolution | election.ts(resolution: string) | 無変更 — `choice:<n>` は string の値域内(FR-2) |
| HoldReason | model.ts | 無変更 — "tie" 判別に使用 |
| Choice { internalNo, label } | model.ts | 読取のみ — 実在照合と label 描画 |
| ElectionState | model.ts | 無変更 — resumedTo の型 |

## 新規(election.ts 内部)

| 関数 | シグネチャ | 説明 |
| --- | --- | --- |
| parseChoiceResolution | (resolution: string) => number \| null | module スコープ純関数。`choice:<n>` 形なら internalNo、他は null(判別 union 的 null — 例外を投げない) |

HOLD_RESOLUTIONS.tie は `{}` へ空化(型 Record<string, ElectionState> のまま — 到達しないことを if/else 構造が保証、AD ADR-1)。
