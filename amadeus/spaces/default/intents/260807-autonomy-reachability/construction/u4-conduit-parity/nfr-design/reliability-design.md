# Reliability Design — u4-conduit-parity

上流入力(consumes 全数): business-logic-model.md(検査ロジックとエラー分類)。nfr-requirements 系5成果物は SKIP により未生成(設計どおりの不在)。

## 失敗様式と回復

| 失敗点 | 挙動 | 回復 |
|---|---|---|
| glob 0件(面集合 discover 失敗) | 赤(fail-closed — BR-U4-5) | パターン・リポジトリ構造の確認 |
| 面の語彙欠落 | 赤+欠落面パスと語彙の列挙 | 当該面へ追記(本テストの目的どおり) |
| 落ちる実証の注入残渣 | 注入→赤実測→復元→残渣ゼロ確認の1セット(BR-U4-6) | git diff/grep の機械確認 |

- ドキュメント drift の再発防止が本 unit の信頼性寄与そのもの — blocking CI 化により「導線ゼロ」状態(finding 8)への回帰を構造的に遮断
- docs 対訳の同期(BR-U4-7)は同一 PR 内更新で担保 — 片言語 drift はレビュー観点+パリティテスト(両ファイルを固定面に含む)で検出

## 一貫性

stage-protocol の semi 段落は :131 契約・:135 full 段落・u2 確定仕様の3点と整合(BR-U4-3 — CG 起草時に :135 の parked/fail-closed 逐語区別と unreviewed キュー/milestone gate の概念分離を反映: FD Review iteration 1 NIT 2件の是正指示)。
