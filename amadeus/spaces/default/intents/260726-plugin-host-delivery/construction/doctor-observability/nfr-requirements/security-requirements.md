# セキュリティ要件 — U5 doctor-observability

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 読み取り専用(record・host bytes・state を変更しない)

business-rules の BR-U5-3(読み取り専用)を継承する。business-logic-model のとおり doctor は「services.md どおり単発 CLI 実行・読み取り専用」であり、diagnosePlugins・composition record・U6 判定の戻り値を射影して表示するだけで、record・host bytes・SpecHashState を変更しない。

- 合否: doctor 実行の前後で record / host bytes / SpecHashState の bytes が一致する(BR-U5-3 の検証: 実行前後の bytes 比較)。落ちる実証は不要だが、書込経路が存在しないことを純関数性(BR-U5-1)と bytes 比較の両面で固定する

## 判定の非搬送(再判定・推測の禁止)

business-logic-model の分岐表は「diagnosePlugins の実戻り値(composed | drift | recovery-pending)+DropsRecord+U6 判定からの機械写像であり、doctor 側での再判定・推測を禁止する」と規定する。business-rules の BR-U5-1(射影のみ)/ BR-U5-7(DropsRecord 分界 — doctor は読むだけ)のとおり、doctor は権威ある判定を持たず、認可・整合性に関わる判断を新設しない。これにより doctor が誤った安全表示(false green / false red)を独自に作る経路を排除する。

- 合否: `buildDoctorPluginSection` が新 judgment・新走査を持たず、入力戻り値の射影に閉じる(BR-U5-1)。DropsRecord 不在時は drops 由来行を出さず、未書込と空を混同しない(BR-U5-7)

## silent drop の禁止(degrade の可観測性)

requirements の FR-5(非対応・degrade は必ず観測可能、silent drop 不合格)を継承する。business-rules の BR-U5-2(degrade 可観測)のとおり、drop された未対応 surface は必ず行として現れ、[degraded] は doctor 全体 FAIL へ寄与、[advisory] は PASS(advisory)となる。degrade の無音化はセキュリティ上のリスク(利用者が非対応面に気づかない)であり、可視性を直接 assert する。

- 合否: DropsRecord fixture の各 entry が出力行として **出現すること自体** を文字列 assert する(BR-U5-2 の可視性直接検証)。両 severity の期待 exit の対照テストを置く

## 認証情報の非保持

technology-stack のとおり本フレームワークは HTTP・DB を持たず新規ランタイム依存ゼロで、doctor は資格情報を扱わない。requirements NFR-3(Bun-only)と整合する。
