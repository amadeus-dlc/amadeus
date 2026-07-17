# Wireframes — eoc1-gate-check(出力契約モック)

## 上流入力(consumes 全数)

`../intent-capture/intent-statement.md`、`../scope-definition/scope-document.md`、`../scope-definition/intent-backlog.md`(単一ユニット)(成功基準)、`../feasibility/feasibility-assessment.md`(fail-closed 経路実測)。

## 方式

UI を持たない CLI ガードのため ui-less-mockups-as-output-contract に従い「verdict 別の出力文言+exit code のモック」で充足。様式は既存 `error()` 系(amadeus-state.ts の既習 fail-closed 文言)に揃え、新規発明しない。

## verdict 別出力モック

### 拒否(承認証跡なき [Answer] 記入 — fail-closed)

```
{"error":"Refusing to gate-start \"requirements-analysis\": requirements-analysis-questions.md has a filled [Answer] but no ruling reference (E-code) or leader-approval timestamp line. Record the ruling/approval evidence in the questions header (E-OC1), then retry."}
exit 1(STAGE_AWAITING_APPROVAL 非 emit・checkbox 遷移なし)
```

### 拒否(承認行の型不正 — verification-numeric-parse 同族)

```
{"error":"Refusing to gate-start \"requirements-analysis\": the approval evidence line in requirements-analysis-questions.md does not contain a parseable timestamp. Fix the E-OC1 evidence header, then retry."}
exit 1
```

### 通過(正常系 — 裁定/承認証跡あり、または [Answer] 未記入、または questions 不在)

```
{"slug":"requirements-analysis","new_state":"awaiting-approval","timestamp":"..."}
exit 0(既存出力に変更なし — 検査は無音通過)
```
