# Services — 260720-hold-choice-resolution

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## CLI 契約の変更(ユーザー承認済み — E-HCRRA3=B、03:47Z 台)

| verb | 変更 | 契約 |
| --- | --- | --- |
| `report --result hold-resolved --resolution <値>` | tie の受理域置換 | tie hold: `choice:<internalNo>`(実在 internalNo)のみ受理。`adopted`/`rejected`/不正形は `invalid-transition: ... (valid: choice:<internalNo> of ...)` で exit 1。block/quorum-short/discussion-needed: 従来どおり(無変更) |
| `render` | tie 裁定行の表現 | choice resolution の最終裁定は `裁定: <choice label>(choice <n> — tie 裁定)` を描画。他 reason の二値裁定行(採用/不採用)は不変 |
| その他 verb | 無変更 | — |

## 利用者への影響

- hold 裁定者(ユーザー/leader): 多肢 tie の裁定が勝者 choice の直接指定になり、record に勝者が明示される。誤って二値を投入した場合は valid ヒント付きで即時拒否(無音誤裁定の構造排除 — #1261 同族の再発防止)。
- docs: SKILL.md へ使い分け1行(単一提案型 = 二値裁定 / 多肢 tie = choice 指定)を3面同期で追加。
