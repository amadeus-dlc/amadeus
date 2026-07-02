# D001: Functional Design scope

## 背景

U001 並行運用ポリシー契約は、Inception の Unit Design Brief で設計戦略（観察根拠主義、肯定形の判断基準、既存記録構造の踏襲、責務分担の相互参照）まで確定しており、Construction の入口で policy 本文の見出し構成、判断基準の文言、根拠リンクの対象、validator 検査追加の要否、相互参照の位置が未確定として残っていた。

## 判断

U001 の Functional Design を必須（`requirement: required`、`frontendSurface: absent`）にし、core 3 文書を作成する。
次を Functional Design で確定した。

- 見出し構成は Git Branching Policy の形式を踏襲し、判断基準の章は 4 つ（並行させる単位、共有成果物の統合、ゲート承認の運用、直列化）とする（BR001）。
- 判断基準は肯定形を先に書き、観察済みの実例に根拠がない規則は書かない（BR002）。
- 根拠リンクの対象は #334 cycle、#350 cycle、遡及承認の記録とする（BR003）。
- validator への個別 policy 構造検査は追加しない（BR009。既存 validator は個別 policy の内容検査を持たない先例に従う）。
- git-branching.md への相互参照は `責務分担` への追記に限定する（BR008）。

## 理由

既存 policy の記録構造と観察済みの実例が揃っており、Functional Design はそれらへの準拠として確定できるため。

## 影響

B001 と B002 の Task 分解はこの設計を根拠にする。
Domain Map と Context Map は更新しない（BC001 既存境界内の運用判断基準の追加）。
