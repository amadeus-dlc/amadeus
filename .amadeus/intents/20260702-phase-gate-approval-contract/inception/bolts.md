# ボルト

## 一覧

| 識別子 | 概要 | ユニット | 設計 | 依存 | 詳細 |
|---|---|---|---|---|---|
| B001 | 実装ゲートの契約を変更し、promote で同期する。 | U001 | [design.md](units/U001-phase-gate-skill-contract/design.md) | なし | [B001-implementation-gate-contract.md](bolts/B001-implementation-gate-contract.md) |
| B002 | grilling トリガーと scaffold-only 条件の契約を変更し、promote で同期する。 | U001 | [design.md](units/U001-phase-gate-skill-contract/design.md) | B001 | [B002-trigger-and-scaffold-contract.md](bolts/B002-trigger-and-scaffold-contract.md) |
| B003 | validator の approval evidence 検査と eval を実装し、promote で同期する。 | U002 | [design.md](units/U002-approval-evidence-validation/design.md) | B001 | [B003-approval-evidence-check.md](bolts/B003-approval-evidence-check.md) |

## 依存関係

| ボルト | 依存 | 理由 |
|---|---|---|
| B001 | なし | 実装ゲートの契約変更は他の Bolt に依存せず実施できるため。 |
| B002 | B001 | 同じ skill 群への変更が重なるため、実装ゲートの契約文言を確定させてからトリガー記述を重ねるため。 |
| B003 | B001 | 検査が要求する approval evidence の追加手順は、B001 の契約文言で確定するため。 |
