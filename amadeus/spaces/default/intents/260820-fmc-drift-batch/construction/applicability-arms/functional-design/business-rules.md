# Business Rules — applicability-arms(U4 / #3186)

上流入力: `business-logic-model.md`(段挿入手順)/ `requirements.md` FR-ARM-1〜7・FR-REG-5・NFR-1/2 / `unit-of-work.md` U4 / `unit-of-work-story-map.md`(#3186 クローズ条件)/ `components.md` C1 / `component-methods.md` C1 / `services.md`(applicability 出力面)。

## 不変条件(実装後に成立していなければならない規則)

- **BR-1(既存判定の不変)**: J1..J6 の分類クラス・revise-model 強制規則・route 語彙・receipt 契約(#3262)・交差契約(#3261)は 1 バイトも変えない。腕は判定 pipeline の**追加段**であり、既存 row の verdict を書き換えない(FR-ARM-7)。
- **BR-2(一般形)**: 腕の検出対象は登録済み**全**モデル。モデル名・ファイル名によるハードコード分岐を持たない(FR-ARM-4)。fixture でも特定モデル名への依存を避け、値集合とクラスタの一般述語でテストする。
- **BR-3(fail-closed、NFR-2)**: 判定不能(.tla/.cfg parse 不能、vocabulary 自己不整合、issue-evidence parse 不能)は明示 halt。素通り・警告付き続行・「検出不能につき合格」を作らない。腕の非発火(交差なし・issue-evidence 不在)と判定不能を同じ結果に潰さない — Result の判別 kind で区別する。
- **BR-4(強制評価の非バイパス)**: drift / 再発検出時の revise-model 明示評価は、terminal-route receipt(既存契約)による裁定でのみ閉じられる。「裁定済み」を記録する新しい宣言ファイル・フラグ・スキップ分岐を新設しない(NFR-1 — 検証されない宣言面の禁止。裁定の正本は receipt のみ)。
- **BR-5(coverageCheck の非再分類)**: 被覆不足は明記 + 裁定提示であり、non-target への再分類・halt を行わない(#3186 完了条件2 禁止節)。`--changed` 未供給は「未実施」を receipt に明記(無音にしない)。
- **BR-6(閾値の観測レンジ内固定)**: defectRecurrence の発火閾値(distinct governed 交差 ≥1)は観測レンジの内側に**両側とも狭義不等号**で固定する(観測最小 0 < 閾値 1 < 観測最大 2 — FR-ARM-2 AC の「観測最小値 < 閾値 < 観測最大値」に整合)。テストは両側(非発火例と発火例)を固定する。閾値・レンジ・発火率(2/3、issue-first のみ)は成果物に記録済み — 変更する場合は再実測を伴う。
- **BR-7(依存方向の維持)**: plugin → core の import を新設しない。issue-evidence・変更ファイル集合は CLI 引数で受ける(conductor 供給)。GitHub 実行時照会なし(RA Q4=A)。
- **BR-8(AUTHORING_ROUTES 1定義の完成)**: U4 着地後、`AUTHORING_ROUTES` の定義は leaf 1 箇所のみ(U1 の BR-1 と合わせて census 完成形: 定義 1 [leaf]・import 2 [registration/applicability]・定義 0 [両ファイル]。discriminator: 定義行 `= new Set(` / import 行 `import {`)。
- **BR-9(two-layer 整合)**: 腕が強制するのは「モデル改訂の要否判定」であり TLC 実行ではない。この整合文は stage 契約と docs 2面(en/ja 同一変更)の両方に明文で存在すること(FR-ARM-6 — 文書面の受け入れ条件)。
- **BR-10(検証劇場禁止、NFR-1)**: 腕の receipt フィールドはすべて後段(裁定提示・監査)が消費する。どのコードも読まないフィールド・status ハードコード・自己参照比較を作らない。新設述語は全て落ちる実証(実 corpus 赤または両側 fixture)を経る。

## エラー処理

- 腕の失敗は `ApplicabilityFailure` 系の既存 Result 経路へ判別 kind で合流させる(新 kind の追加は可、既存 kind の意味変更は不可)。
- 回復可能性: 交差なし・非発火は正常系(retry 不要)。fail-closed halt は入力の修復(モデル/評価対象の整合回復)後に再実行 — 自動 retry は組み込まない。
