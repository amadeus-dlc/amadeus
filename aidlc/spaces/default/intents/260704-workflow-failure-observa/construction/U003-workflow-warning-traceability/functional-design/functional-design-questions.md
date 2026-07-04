# Functional Design Questions: U003-workflow-warning-traceability

## 上流文脈

この functional-design-questions は、`unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`、`bolt-plan` を入力として作成する。

U003 は conductor-independent doctor warning、Requirement evidence、PR readiness traceability を扱う。

U003 は U001 と U002 の evidence を read-only で参照する。

U003 は workflow state を変更しない。

## Questions

### Q1. Conductor-independent warning の対象

doctor warning として最初に検出する失敗候補はどれにしますか。

A. run-stage/report mismatch だけにする。

B. in-flight stage abandonment だけにする。

C. runtime graph/audit contradiction だけにする。

D. すべてを hard error にして workflow を止める。

E. 推奨: run-stage/report mismatch、in-flight stage abandonment、runtime graph/audit contradiction の 3 種を warning として検出し、false positive に備えて non-mutating にする。

X. Other (please specify)

[Answer]: E

### Q2. Evidence の読み取り方向

U003 は U001 と U002 の evidence をどう扱いますか。

A. U001 と U002 から U003 を呼ばせる。

B. U003 が Error Audit と Subagent Status の内部関数を直接操作する。

C. U003 が evidence を修正して traceability に合わせる。

D. U003 が不足 evidence を推測して補完する。

E. 推奨: U003 は audit、state、runtime graph、Intent artifacts を read-only で読み、Error Audit と Subagent Status から U003 への逆依存を作らない。

X. Other (please specify)

[Answer]: E

### Q3. Requirement evidence map の粒度

Requirement evidence map はどの粒度で作りますか。

A. Issue 単位だけでまとめる。

B. Bolt 単位だけでまとめる。

C. test file 単位だけでまとめる。

D. PR description だけにまとめ、Intent artifact には残さない。

E. 推奨: R001-R009 ごとに Issue、Unit、Bolt、test result、validator、parity、stdout JSON、OpenTelemetry no-op default の evidence item を対応付ける。

X. Other (please specify)

[Answer]: E

### Q4. Parity boundary の扱い

parity lock に触れる可能性がある場合、traceability は何を残しますか。

A. parity failure は PR レビューでだけ扱う。

B. `engineFileExceptions` を先に広げてから実装する。

C. locked file の変更理由だけを commit message に書く。

D. adapter と wrapper の検討は省略する。

E. 推奨: adapter または wrapper first の検討結果、locked file diff、upstream contribution か human-approved exception の resolution path、未解決 parity state を Intent artifact または PR checklist に残す。

X. Other (please specify)

[Answer]: E

### Q5. PR readiness checklist の境界

PR readiness checklist には何を含めますか。

A. CI 結果だけを含める。

B. Issue リンクだけを含める。

C. test result と validator だけを含める。

D. collector と dashboard のセットアップ手順まで含める。

E. 推奨: Issue #431、#432、#433、#435、Intent、R001-R009、validator、`npm run test:all`、parity、stdout JSON、OpenTelemetry no-op default、scope-out 境界を含める。

X. Other (please specify)

[Answer]: E
