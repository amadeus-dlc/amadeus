# Frontend Components — answer-evidence-sensor(UI-less — 出力契約モック)

上流入力(consumes 全数): `../../inception/units-generation/unit-of-work.md`(単一 Unit)、`../../inception/units-generation/unit-of-work-story-map.md`、`../../inception/requirements-analysis/requirements.md`(FR-1〜7)、`../../inception/application-design/components.md`(C-1〜C-5)、`../../inception/application-design/component-methods.md`、`../../inception/application-design/services.md`(二層防衛)。

UI を持たない sensor のため、ui-less-mockups-as-output-contract に従い verdict 別の stdout JSON+dispatcher 側可視化をモックとして固定する。

## 出力モック(受け入れ基準とテスト文言の導出元)

- fail(先取り記入検知): `{"pass":false,"findings_count":1,"reason":"no-evidence","skipped":null}` → dispatcher が SENSOR_FAILED 監査行+ `.amadeus-sensors/<stage>/answer-evidence-<fireId>.md` finding を生成
- fail(TS 不正): `{"pass":false,"findings_count":1,"reason":"unparseable-timestamp","skipped":null}`
- pass(証跡あり): `{"pass":true,"findings_count":0,"reason":"evidence-present","skipped":null}`(SENSOR_PASSED 行のみ)
- pass(0問様式): `{"pass":true,"findings_count":0,"reason":"no-answer-tag","skipped":null}`
- skip(非 questions): `{"pass":true,"findings_count":0,"reason":"skipped","skipped":"not-questions"}`
- skip(cutoff 前): `{"pass":true,"findings_count":0,"reason":"skipped","skipped":"pre-cutoff"}`
- CLI 誤用: stderr にエラー+exit 1(JSON なし — required-sections :112 前例様式)

様式は既存兄弟 sensor(required-sections)の JSON 契約に揃え、新規発明しない。

## 可視化面(dispatcher 委譲)

FAILED 時の人間可視面は finding md(Timestamp/Fire id/Output path/Findings JSON)と統合 statusline — 本 Unit は JSON 契約のみを所有し、レンダリングは dispatcher 既存実装に委譲する(新規 UI なし)。
