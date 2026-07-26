# Business Rules — U5 doctor-observability

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services

## BR 一覧

- **BR-U5-1(射影のみ)**: doctor の plugin 節は diagnosePlugins・composition record・U6 判定の既存戻り値からの射影のみで構成し、doctor 側に新judgment・新走査を作らない(components.md Reuse Inventory。検証: buildDoctorPluginSection が入力引数以外を読まない純関数であること)
- **BR-U5-2(degrade 可観測)**: drop された未対応 surface は必ず行として現れる — [degraded] は doctor 全体 FAIL へ寄与、[advisory] は PASS(advisory)(requirements FR-5 / 上流 t188 #21-22 相当。検証: (a) DropsRecord fixture の各 entry が出力行として**出現すること自体**を文字列 assert(可視性の直接検証 — silent drop 禁止の本体) (b) 両 severity の期待 exit の対照テスト)
- **BR-U5-2b(recovery-pending 可視)**: diagnosePlugins が recovery-pending を返す状態(journal 残存 fixture)は必ず [recovery-pending] 行+FAIL 寄与として現れる(FR-6/NFR-1。検証: journalPending fixture での行出現+exit assert — 既存 t252 の journal fixture 面を再利用)
- **BR-U5-7(DropsRecord 分界)**: DropsRecord の書き手は compose 経路のみ(U2 骨格・U4 エントリ追加)。doctor は読むだけで、DropsRecord 不在時は drops 由来行を出さない(未書込と空を区別しない — fail-open にしない範囲で縮退)
- **BR-U5-3(読み取り専用)**: doctor 実行は record・host bytes・SpecHashState を変更しない(検証: 実行前後の bytes 比較)
- **BR-U5-4(0-plugin 縮退)**: 0-plugin 時は 1 行縮退で既存 doctor 出力の他行に影響ゼロ(検証: 0-plugin baseline の doctor 出力 diff が追加 1 行のみ)
- **BR-U5-5(型正本)**: DoctorLine の基底 3 フィールドは U2 正本の逐語継承で、U5 拡張は追加のみ(cross-unit-type-canonical-lift。検証: U2 domain-entities との文字列一致)
- **BR-U5-6(既存テスト同期)**: 既存 doctor 期待出力テスト(t-print-*-doctor 系)の更新を同一変更で行い、全ハーネス dist / self-install の再生成と drift ガード green を伴う(project.md Mandated)

- **BR-U5-8(未知状態 fail-closed — U5 ND レビュー是正の申告付き追加 2026-07-27)**: 写像に現れない状態値は DoctorLine.state = "unknown" の loud 行として表示し FAIL へ寄与する(無音読み飛ばし禁止。検証: 想定外値 fixture での行出現+exit assert)。分岐の正本は business-logic-model の分岐表(8 行)であり、nfr-design の射影表はそこからの転記

## 検証への trace

BR-U5-1/5 は unit(純関数)、BR-U5-2/3/4/6 は integration(実 doctor 出力・exit・bytes 比較)。落ちる実証は degraded fixture の注入で FAIL 化を実測(corpus-sweep: 正当な既存構成で赤くならないことも両側実測)。
