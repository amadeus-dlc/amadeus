# Refined Mockups — eoc1-gate-check(確定出力契約)

## 上流入力(consumes 全数)

`../requirements-analysis/requirements.md`(FR-1〜5)、`../user-stories/stories.md`(US-1〜3)、`../../ideation/rough-mockups/wireframes.md`(粗モック)、`../../ideation/rough-mockups/user-flow.md`(3フロー)。

## 確定契約(文言・exit code はテスト期待値の導出元 — ui-less-mockups-as-output-contract)

### M-1: 拒否(証跡なき記入 — US-1/AC-3a)

```
{"error":"Refusing to gate-start \"<slug>\": <slug>-questions.md has a filled [Answer] but no ruling reference (E-code) or leader-approval timestamp line. Record the E-OC1 evidence in the questions header, then retry."}
```
exit 1(STAGE_AWAITING_APPROVAL 非 emit・checkbox 非遷移)

### M-2: 拒否(承認行の型不正 — US-3/AC-3b)

```
{"error":"Refusing to gate-start \"<slug>\": the approval evidence line in <slug>-questions.md does not carry a parseable ISO timestamp. Fix the E-OC1 evidence header, then retry."}
```
exit 1

### M-3: 通過(US-2/AC-3c — 3形: 証跡付き記入 / [Answer] タグ不在の0問様式 / questions 不在)

既存 gate-start 出力のみ(検査由来の出力なし・exit 0):
```
{"slug":"<slug>","new_state":"awaiting-approval","timestamp":"..."}
```
