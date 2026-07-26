# 信頼性要件 — U5 doctor-observability

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## recovery-pending の可視(中断状態の放置防止)

business-rules の BR-U5-2b(recovery-pending 可視)を継承する。business-logic-model の分岐表のとおり、diagnosePlugins が recovery-pending を返す状態(compose 途中失敗で journal が残存する fixture)は必ず `[recovery-pending: run compose to recover]` 行+FAIL 寄与として現れる。これは requirements FR-6 / NFR-1 の安全パスであり、中断状態を無音で放置しないことが本 Unit の中心的信頼性要件である。

- 合否: journalPending fixture での doctor 出力に recovery-pending 行が出現し、exit が FAIL 寄与になる(BR-U5-2b。既存 t252 の journal fixture 面を再利用)

## degrade の可観測性(silent drop 禁止)

requirements の FR-5(silent drop 不合格)を継承する。business-rules の BR-U5-2(degrade 可観測)のとおり、drop された未対応 surface は必ず行として現れ、[degraded] は FAIL 寄与、[advisory] は PASS(advisory)となる。可視性を直接 assert し、正当な既存構成では赤くならないことも両側で実測する(corpus-sweep)。

- 合否(可視性): DropsRecord fixture の各 entry が出力行として出現することを文字列 assert する(BR-U5-2)
- 合否(両側実測): degraded fixture の注入で FAIL 化を実測し、正当な既存構成(composed・健全)では FAIL しないことを対照テストで固定する(BR-U5 検証節の corpus-sweep)

## 射影のみ(判定の非搬送)による整合

business-rules の BR-U5-1(射影のみ)/ BR-U5-7(DropsRecord 分界)を継承する。business-logic-model のとおり分岐は diagnosePlugins・DropsRecord・U6 判定からの機械写像であり、doctor 側での再判定を禁止する。DropsRecord の書き手は compose 経路のみ(U2 骨格・U4 エントリ追加)で、doctor は読むだけである。これにより doctor 表示と実状態の乖離(独自判定による false 表示)という信頼性リスクを構造的に排除する。

- 合否: DropsRecord 不在時は drops 由来行を出さない — 不在と空は同一の縮退挙動(区別しない)とし、fail-open な行生成をしない(BR-U5-7 の verbatim 準拠 — U5 ND レビュー Major 是正 2026-07-27)
- 合否(型正本): DoctorLine の基底 3 フィールドは U2 正本の逐語継承で、U5 拡張は追加のみ(BR-U5-5。検証: U2 domain-entities との文字列一致)

## 既存テスト同期と drift 防止

business-rules の BR-U5-6(既存テスト同期)を継承する。既存 doctor 期待出力テスト(t-print-*-doctor 系)の更新を同一変更で行い、全ハーネス dist / self-install の再生成と drift ガード green を伴う(project.md Mandated)。technology-stack のとおり再生成は既存機構で、配布面の不整合を決定的ガードで封じる。

- 合否: 既存 doctor テストの期待出力更新と `dist:check` / `promote:self:check` green を同一変更で行う(BR-U5-6)
