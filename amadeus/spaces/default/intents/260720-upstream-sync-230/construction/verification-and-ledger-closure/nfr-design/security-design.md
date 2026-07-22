# Security Design — verification-and-ledger-closure

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Evidence integrity

各approved itemは既存dispositionとEvidenceRefへtraceし、partial evidenceをEQUIVALENTへ昇格させない。24 itemの一件でも欠落すればcompleteを拒否する。U12は機能成果物を変更せず、U01〜U11の既存test/docs evidenceだけを集約する。

FR23は採用contractだけを再著作し、filesystemを触る検査をintegration-firstに置き、SKIP項目testを持ち込まない。FR24は英語正本/日本語pair、Amadeus path/namespace、6 harness、generated/hand-edit境界、legacy path 0を検査する。

## Verification・transition integrity

必須gateの未実施、非0、別SHA、patch未カバー、generic waiverをgreenへしない。waiverは既決条件を満たす明示証拠がある残余行だけに限定する。

単なる進行中または三条件欠落をBLOCKED/APPLIEDへ変換しない。accepted terminal evidenceは対象SHAと反証可能根拠を持つ構造化`verification-failure`または`abandon`だけである。曖昧自由文、新failure evidence language、新transition variantを受理しない。

## Supply-chain controls

既存CI、coverage、docs gate、atomic ledger writerを再利用する。新credential、dependency、service、database、network、UI、distributed ledger、audit event、retentionを追加しない。

## トレーサビリティ

本設計は`security-requirements.md`のSEC-U12-01〜05を中心に、`performance-requirements.md`の全数/same-SHA、`scalability-requirements.md`の固定集合、`reliability-requirements.md`のterminal evidence、`tech-stack-decisions.md`の既存writer、`business-logic-model.md`のCoverage/Verification/Ledger workflowsへ対応する。
