# 信頼性設計 — U5 doctor-observability

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## 射影表(状態 → 表示 → exit の全列挙写像)

reliability-requirements の中心要件(recovery-pending 可視・degrade 可観測・射影のみ)を、business-logic-model 分岐表からの転記による **全列挙写像表** として設計に固定する。この表は functional-design/business-logic-model.md の分岐表(8 行 — 正本)からの転記であり、`buildDoctorPluginSection` の分岐は FD 正本のみを源とする(security-design の判定非搬送):

| 入力状態(投影元) | 表示行 | exit 寄与 |
|---|---|---|
| composition record: 0-plugin | `Plugins: 0 installed` 1 行 | pass |
| diagnosePlugins: composed(健全) | `- <name> composed@<rev> [ok]` | pass |
| diagnosePlugins: drift | `[drift: <detail>]` | pass(表示のみ — 既存 drift ガードの責務と重複させない) |
| diagnosePlugins: recovery-pending(journal 残存) | `[recovery-pending: run compose to recover]` | **fail** |
| DropsRecord: degraded entry | `[degraded: <surface>]` | **fail** |
| DropsRecord: advisory entry | `[advisory: <surface>]` | pass(PASS(advisory)) |
| U6 ActivationJudgment: changed | `(activation) formal-model-check: spec-hash CHANGED` | pass(advisory 扱い) |
| 写像外の未知状態値 | 未知状態の loud 行 | **fail**(fail-closed 縮退 — 無音読み飛ばし禁止) |

- recovery-pending 行は requirements FR-6 / NFR-1 の安全パス(reliability-requirements「recovery-pending の可視」)。journalPending fixture(既存 t252 の journal fixture 面を再利用)で出現+FAIL 寄与を assert する

## 検証設計(両側実測と可視性の直接 assert)

- **可視性**: DropsRecord fixture の各 entry の出力行出現を文字列 assert(security-requirements の可視性合否と同一テストを security-design と共有 — 二重設計しない)
- **両側実測**(corpus-sweep): degraded fixture 注入で FAIL 化を実測し、正当な既存構成(composed・健全)では FAIL しない対照テストを置く(reliability-requirements 合否)。performance-requirements の 0-plugin 下限(performance-design)・scalability-requirements の 0-plugin 縮退合否(scalability-design の diff 1 行テスト)が「正当構成で赤くならない」側の一部を兼ねる
- **型正本**: DoctorLine の基底 3 フィールドは U2 正本の逐語継承+U5 拡張は追加のみ(BR-U5-5)。検証は U2 domain-entities との文字列一致 assert

## 既存テスト同期と drift 防止

reliability-requirements「既存テスト同期と drift 防止」のとおり、既存 doctor 期待出力テスト(t-print-*-doctor 系)の更新と全ハーネス dist / self-install 再生成(`dist:check` / `promote:self:check` green)を同一変更で行う(BR-U5-6)。DropsRecord の書き手分界(compose 経路のみが書き、doctor は読むだけ — BR-U5-7)により、doctor 側の変更が record 整合性を退行させる経路は存在しない。
