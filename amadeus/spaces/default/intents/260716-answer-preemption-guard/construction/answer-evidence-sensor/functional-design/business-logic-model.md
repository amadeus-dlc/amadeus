# Business Logic Model — answer-evidence-sensor(Unit)

上流入力(consumes 全数): `../../inception/units-generation/unit-of-work.md`(単一 Unit)、`../../inception/units-generation/unit-of-work-story-map.md`、`../../inception/requirements-analysis/requirements.md`(FR-1〜7)、`../../inception/application-design/components.md`(C-1〜C-5)、`../../inception/application-design/component-methods.md`、`../../inception/application-design/services.md`(二層防衛)。

## ロジック構成(functional-domain-modeling-ts 準拠)

中核は**純関数2段**(class-free、判別ユニオン Result):

1. `evaluateAnswerEvidence(outputPath): AnswerEvidenceResult` — 判定パイプライン:
   - 段1(対象選別): basename が `*-questions.md` に一致しない → `{pass:true, findings_count:0, skipped:"not-questions", reason:"skipped"}`
   - 段2(cutoff): outputPath 中の `intents/<dir>/` セグメントから先頭6桁 YYMMDD を parse。`< QUESTIONS_EVIDENCE_CUTOFF_YYMMDD`(または parse NaN・セグメント不在)→ `skipped:"pre-cutoff"`
   - 段3(述語写像): `checkQuestionsEvidence(outputPath)` の判別ユニオンをそのまま写像 — fail 2種 → pass=false・findings_count=1・reason=述語 reason、pass 4種 → pass=true・findings_count=0・reason=述語 reason
2. `main(argv)` — CLI 契約: --stage/--output-path 必須(不備は exit 1 — CLI 誤用のみ)、evaluate 結果を stdout JSON。

parse-don't-validate: 述語の判別ユニオンを再検査せず型で運ぶ。無効状態(pass=false かつ findings_count=0 等)は構成不能。

## エラー処理方針

CLI 誤用 = 回復不能(フェイルファスト exit 1)。検査 fail = 回復可能な advisory シグナル(型付き Result で伝播、exit 0)。error-classification: 検査 fail は defect でなく検査対象データの状態報告。
