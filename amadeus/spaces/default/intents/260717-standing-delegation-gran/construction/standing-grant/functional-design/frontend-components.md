# Frontend Components — standing-grant

上流入力(consumes 全数): `../../../inception/units-generation/unit-of-work.md`(単一 Unit)、`../../../inception/units-generation/unit-of-work-story-map.md`(FR トレース)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜8)、`../../../inception/application-design/components.md`(C-1〜C-6)、`../../../inception/application-design/component-methods.md`、`../../../inception/application-design/services.md`(三経路の権限フロー)

## 該当なし(根拠付き最小充足)

本 Unit は CLI verb+検証層のみで UI を持たない。ユーザー可視面は (a) verb の stdout JSON+stderr 人間可読行(フラグ名+既定=除外の明文 — e1/e2 留保)(b) doctor の DoctorCheck 行(C-4)— いずれも CLI 出力契約として component-methods.md に確定済み。UI-less intent の mockup/frontend 面は出力契約で充足する(ui-less-mockups-as-output-contract の FD 面適用)。

## 出力契約の所在(参照)

verb 出力契約(JSON フィールド+stderr 人間可読行の文言)と doctor 行の様式は `../../../inception/application-design/component-methods.md` C-1/C-4 を正とし、本ファイルでは重複定義しない(canonical 1定義)。
