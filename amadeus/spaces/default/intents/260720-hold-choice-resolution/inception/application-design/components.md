# Components — 260720-hold-choice-resolution

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

新規コンポーネントなし。既存2ファイル+docs 面の内側修正。

## 変更一覧(数値見積り)

| コンポーネント | ファイル | 変更 | 見積り(行) |
| --- | --- | --- | --- |
| election-cli | scripts/amadeus-election.ts | (1) HOLD_RESOLUTIONS.tie から adopted/rejected を除去(FR-1、承認済み置換) (2) handleHoldResolved に tie 専用の choice parse 分岐(prefix parse+choices 実在照合の fail-closed 二段、valid ヒント文言) (3) rulingOverride 合成の choice 形拡張(FR-3) | +38 |
| election-cli(型) | 同上 | HoldResolution.resolution は string のまま(FR-2 — スキーマ変更なし)。choice parse の戻りは判別 union(parsed choice or null) | +8 |
| docs | .claude/skills/amadeus-election/SKILL.md(+.agents/contrib の3面同期) | 二値語彙(単一提案型)と choice 指定(多肢 tie)の使い分け1行(e4 留保) | +1×3面 |
| tests | tests/unit or integration(層は NFR-2)+t236 追記 | tie hold-resolved 閉包・loud 拒否・render 貫通・落ちる実証 | +110 |

合計 ≒ 見積り 160 行(SKILL 3面込み)。

## Reuse Inventory

- 検証様式: handleHoldResolved の既存 fail 経路(invalid-transition+valid ヒント — :201-207 様式)を choice 分岐でも踏襲。新エラー機構なし。
- 描画: renderPersistDraft の rulingOverride param(record.ts:149/:159 — #1268 既設 seam)をそのまま使用。record.ts は無変更。
- 永続化: HoldResolution(string)+writeStoreFile 経路そのまま。store.ts 無変更。
- 検証実行: 既存4コマンド。SKILL 3面同期は既存の contrib/.agents/.claude 配置に倣う(t89 級の同期検査があれば従う — CG で実測)。

## 非変更

model.ts(tally/tie 判定不変)、store.ts、record.ts、e4 バッチ面(GoaLineCode/renderGoaLine/handleOpen/norm-metrics/t238)、t241。
