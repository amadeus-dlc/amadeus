# Scope Document — 260720-hold-choice-resolution

上流入力(consumes 全数): intent-statement.md、feasibility-assessment.md、constraint-register.md

## スコープ種別

`amadeus`(ディスパッチ要件(1))。

## Must(Should/Could は置かない — scope-definition:c2)

| # | 項目 | 由来 |
| --- | --- | --- |
| M-1 | choice tie 由来の hold に対する勝者 choice 指定 resolution の受理(CLI 構文は design 裁定)+HOLD_RESOLUTIONS 系の型整合 | #1267、C-2、R-1 |
| M-2 | 指定 choice の resolutions 配列への永続化と record.md 裁定行への勝者 choice 描画(rulingOverride 合成 election.ts:390-392 の拡張 — human-ruling-persist-through で閉包テスト固定) | #1267、C-5、feasibility 実測 |
| M-3 | 既存二値経路(adopted/rejected)の扱い確定 — E-TCRCG=A を変更しない範囲での共存形(design 裁定。t236:309-310 既存ピンとの整合) | C-2 |
| M-4 | ユーザー可視契約変更該当性の RA 判定 — 該当なら正準リスト(4)エスカレーション | C-3、要件(3) |
| M-5 | 検証 green 維持(typecheck / lint / --ci)+deslop+lcov | C-6 |

## Won't(明示除外)

| # | 除外 | 根拠 |
| --- | --- | --- |
| W-1 | GoaLineCode(record.ts :26-49)・renderGoaLine・handleOpen(:241)・norm-metrics・t238 | e4 バッチ面(並行合意 C-1) |
| W-2 | tally 自動集計・resolveBallots・classifyLate の変更 | #1268/#1273 で確定済みの別面 |
| W-3 | 配布面(dist/self-install) | scripts/ は投影 0 |
| W-4 | hold の発生条件・GoA 成立判定の変更 | E-TCRRA1/2 既決 |
| W-5 | timeline/receivedAt 面 | #1262(着地済み)の管轄 |

## 境界判定規則

「hold-resolution の受理→永続化→描画の経路の内側か」で判定。外側は Issue-first。
