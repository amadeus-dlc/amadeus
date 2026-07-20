# Security Requirements — U1 tie-choice-resolution

上流入力(consumes 全数): requirements.md、business-logic-model.md、business-rules.md、technology-stack.md(brownfield 条件付き consumes — codekb) — 入力検証境界は business-logic-model.md の検証境界節、fail-closed 規則は business-rules.md BR-1/BR-2、秘匿情報の非関与は technology-stack.md(credential 非保存方針)と requirements.md の修正面宣言から導出。

## 要求

| # | 要求 | 根拠 |
| --- | --- | --- |
| S-1 | システム境界(handleHoldResolved の resolution 引数)で全入力を検証 — prefix parse+実在照合の二段 fail-closed、失敗は loud(exit 1) | BR-1/BR-2(construction ガードレール「システム境界で入力検証」) |
| S-2 | 検証済み resolution のみ永続化(parse-don't-validate — 無効値が tally.json へ到達する経路を構造排除) | business-logic-model.md 検証境界 |
| S-3 | 認証情報・秘匿情報は非関与(ローカル CLI、store は repo 内ファイル — technology-stack.md の credential 非保存方針の範囲内)。新規外部境界ゼロ | technology-stack.md |
| S-4 | エラーメッセージは入力値と valid 列挙のみを含み、内部状態・パスを漏らさない(既存様式踏襲) | BR-2 |

## 検証対応

S-1/S-2 は FR-1/FR-4 の loud 拒否テスト・閉包テストが検証面。S-3/S-4 は変更面の構造(新規外部境界ゼロ・既存様式踏襲)で担保し、専用テストを追加しない。
