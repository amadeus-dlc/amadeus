# D001: Functional Design scope

## 背景

Construction の開始にあたり、Unit の Functional Design の必要性と、Inception から引き継いだ引数体系、更新規則の確定が必要だった。

## 判断

U001（state.json 雛形生成契約）の Functional Design を `requirement: required` とし、UI 構成なし（`frontendSurface: absent`）として core 3 文書を作る。

遷移は 7 識別子（`intent-capture`、`inception-start`、`inception-complete`、`construction-start`、`functional-design`、`bolt-preparation`、`finalization`）でモデル化する。Issue #311 の「Inception 開始と完了」は開始と完了の 2 識別子に分ける。

更新規則は「対象遷移が定義する項目だけを設定し、既存値を保持し、冪等」（BR002、BR003）、必須成果物配列と evidence は「実在ファイルの走査」（BR004）で確定する。

## 理由

- 完了系の遷移（inception-complete、finalization）は必須成果物配列の確定を伴い、開始系と設定項目が異なるため、識別子を分けると各遷移の責務が単純になる。
- 実在ファイルの走査を値の根拠にすると、雛形が存在しないパスを書く事故を構造的に防げる（validator は path の実在を検査する）。

## 影響

- B001 の Task 生成は、この遷移モデルと更新規則を設計根拠として参照する。
- 引数体系の詳細（フラグ名）は実装で確定するが、遷移種別と補助引数（Unit、Bolt）の構成はこの判断に従う。
