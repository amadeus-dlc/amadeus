# Frontend Components — election-record(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## N/A 宣言(反証可能根拠付き)

U3 は render/verify の純関数群で UI・CLI 面なし(CLI 配線は U5 の verify/render verb — component-methods C6)。ui-less の出力契約は U5 側で確定。

## 出力契約(型のみ)

| 消費側 | U3 が返すもの |
|---|---|
| U5 CLI(render verb) | GoA 行・タイムライン行・persist 素案の文字列群 |
| U5 CLI(verify verb) | VerifyResult(finding 列挙) |
| 蒸留ラウンド下流 | parseGoaLine byte 互換の GoA 行(C-08) |
