# Intent Backlog — standing-delegation-grant

上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../feasibility/feasibility-assessment.md`(GO・A-1 仮説・FQ1/FQ2)、`../feasibility/constraint-register.md`(C-1〜C-10)

## バックログ(単一 intent 完結 — 分割不要の見立て)

| # | 項目 | 受け皿ステージ |
|---|---|---|
| B-1 | grant/revoke verb+受理側第2経路+監査 taxonomy(Must 全数) | requirements→design→code-generation |
| B-2 | 落ちる実証4種+白側 sweep+一時状態 fixture(E-SDG-IC C1 適用: TTL 境界・撤回直後・未取込ツリー) | code-generation / build-and-test |
| B-3 | doctor 可視化(Should) | code-generation(同一 Bolt 内) |
| B-4 | docs 同期(audit-format.md ほか参照面の棚卸し) | code-generation |
| B-5 | design 選挙2件(FQ1 保存・配送形態 / FQ2 撤回伝播モデル)+FQ4(session 失効)+TTL 値確定 | application-design / requirements |
| B-6 | 着地後: Issue #1125 クローズ(close-after-landing-verification)+停滞解消の運用観測(A-1 仮説の確認) | 運用(FR 化は requirements) |

## 規模見立てと導出元

単一 Bolt(検証器分岐+verb 2本+テスト)— #922(sensor 1本+29 stage 伝播)と同級かやや大。B-5 の選挙2件は feasibility-assessment の FQ1/FQ2、B-6 の運用観測は同 assessment の A-1 仮説から導出。
