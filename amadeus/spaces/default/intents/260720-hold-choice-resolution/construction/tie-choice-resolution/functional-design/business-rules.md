# Business Rules — U1 tie-choice-resolution

上流入力(consumes 全数): requirements.md、component-methods.md、unit-of-work.md — BR は requirements.md の FR 受け入れ条件を実装可能な規則へ具体化し、書式は component-methods.md のスニペット、検証は unit-of-work.md U1 の完成条件と1:1。

## 規則

| # | 規則 | 由来 |
| --- | --- | --- |
| BR-1 | tie hold の resolution は `choice:<internalNo>` 形のみ受理。regex `/^choice:(0|[1-9][0-9]*)$/` で prefix parse(先頭ゼロ・空・非数値は不受理)し、election.choices の internalNo 実在照合の二段 fail-closed | FR-1 |
| BR-2 | tie への adopted/rejected/未知値/非実在 choice は `invalid-transition: resolution "<入力>" is not valid for hold reason "tie" (valid: choice:1/choice:2/…実在列挙)` で exit 1 | FR-1(e4 留保: 二値の曖昧受理を無音で通さない) |
| BR-3 | 非 tie reason(block/quorum-short/discussion-needed)の検証・文言は無変更(現行テーブルの else ブロック移設のみ) | FR-1/E-TCRCG=A |
| BR-4 | 受理済み resolution 文字列はそのまま HoldResolution.resolution へ永続化(スキーマ変更なし)、carry-forward 無変更 | FR-2 |
| BR-5 | tie の choice 裁定の record 描画は `裁定: <label>(choice <n> — tie 裁定)`。二値裁定(他 reason)の描画は無変更 | FR-3 |
| BR-6 | tie 裁定の resumedTo は "tallied" 固定(現行 tie 両値と同一復帰先) | FR-1/AD ADR-1 |
| BR-7 | SKILL.md へ使い分け1行(単一提案型 = 二値 / 多肢 tie = choice:<n>)を3面同一内容で追加(cmp 一致を検証) | FR-4 |
| BR-8 | t238(rulingText)・t241 は非接触。既存 t236 の block 経路テストは無変更 green | FR-5 |
