# Intent Capture — 明確化質問(canonical-settings)

> 回答方式: エージェント間選挙(ユーザー指示による逸脱)。Issue #623 本文が既に確定している事項(canonical settings を1形式で定義する・TypeScript 型+validation・既定値定義・ハーネス別重複禁止 等)は質問にかけない。以下は intent の枠組みに関わる真に未決の点のみ。

## Q1. 主たる受益者(ターゲット顧客)

canonical settings の主たる受益者は誰と位置づけるか?(価値の優先順位・成功指標の重み付けに影響)

- A. フレームワーク開発チーム(設定ドリフトの保守コスト削減が主目的。導入チームの体験改善は副次)
- B. amadeus 導入チーム(エンドユーザー)(どのハーネスでも同じ設定が同じ場所にある体験が主目的。保守コスト削減は副次)
- C. 両方を対等に扱う(受け入れ条件も両視点で立てる)
- X. Other (please specify)

[Answer]: C — 両方を対等に扱う(選挙結果 3:2:1 の相対多数)。受け入れ条件は保守者視点(ドリフト削減)と導入チーム視点(同一設定体験)の両方を持つ

## Q2. この intent の完了境界(Initial Scope Signal)

Issue #623 は「後続 Issue(#622)で interaction mode 表示制御を実装できる」ことを受け入れ条件にしている。この intent の完了境界はどこか?

- A. 設定基盤のみ: canonical settings のパス・形式・型・validation・既定値・エラー方針・doctor 検出を出荷し、interactionModes はスキーマ上のキーとして定義するだけ(表示制御の消費側実装は #622 に委ねる)
- B. A + 最小の消費実証: 少なくとも1箇所の実コード(例: stage-protocol の質問モード提示)が canonical settings を読むところまで実装し、E2E で「設定が効く」ことを実証する
- C. A + #622 の表示制御実装まで本 intent に含める(#622 をクローズする)
- X. Other (please specify)

[Answer]: A — 設定基盤のみ(選挙結果 4:2)。interactionModes はスキーマ定義まで、消費側実装は #622。少数派 B の『消費者ゼロの検証劇場化』懸念は doctor 検出+validation 自動テストが実消費者になる点で緩和するが、requirements 以降で consumer 配線の実在を意識する

## Q3. 既存設定の移行スコープ

「ハーネス別設定は起動・hooks・権限・env bridge に限定する」という期待設計に対し、既存のハーネス別設定に今ある項目の canonical への移行はどう扱うか?

- A. 新規キー(interactionModes 等)のみ canonical に置く。既存ハーネス別設定の移行は行わない(棚卸しだけ実施し、移行候補は Issue 起票)
- B. 棚卸しの結果、明らかに Amadeus 機械的挙動に属する既存項目があれば本 intent で移行する
- C. 移行は一切スコープ外。棚卸しもしない
- X. Other (please specify)

[Answer]: A — 新規キーのみ canonical へ(全会一致)。既存項目は棚卸しのみ実施し、移行候補は Issue 起票

## Q4. 成功指標の検証形態

「設定不備を doctor で検出できる」等の成功指標をどの強度で検証するか?

- A. 受け入れ条件ごとに自動テスト(bun test)で検証。doctor 検出は失敗ケース注入で「落ちる実証」まで行う(team.md の Mandated と整合)
- B. 自動テスト + 手動確認の併用(doctor はテスト困難なら手動確認記録で可)
- X. Other (please specify)

[Answer]: A — 受け入れ条件ごとに自動テスト(多数決)。doctor 検出は失敗ケース注入の『落ちる実証』まで行う
