# セキュリティ要件 — U6 activation-policy

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## path 安全(escape 済み glob のみを判定対象)

business-rules の BR-U6-7(path 安全)を継承する。business-logic-model のフロー 1 が計算対象とする `ActivationWatch.globs` は plugin 宣言由来であり、compose の path escape 拒否を通過したもののみを判定対象とする。requirements NFR-1(path escape 拒否)のとおり、glob が host ツリー外・想定外パスへ escape する経路は compose 段で拒否済みであり、spec-hash 計算がその境界外のファイルを読むことはない。

- 合否: escape glob の compose 段拒否は既存テスト面で担保される(BR-U6-7)。U6 の spec-hash 計算は compose を通過した glob のみを対象とし、独自の path 解決を追加しない

## stdout 純度(advisory は stderr のみ)

business-rules の BR-U6-3(stdout 純度)を継承する。business-logic-model のフロー 2(advisory 提示)は、changed | never-run 判定時に AdvisoryLine を **stderr へ 1 行** のみ出す。`amadeus-orchestrate next` の stdout directive JSON は byte 不変とし、stdout-directive-stderr-advisory 契約を守る。stdout を汚染しないことは、下流の directive 消費テストの誤動作(パース破壊による偽の状態遷移)を防ぐセキュリティ・整合性要件である。

- 合否: advisory 発火時に stdout の directive JSON が parse 成功し、既存 next 消費テストが green(BR-U6-3)。stderr 追加の消費側棚卸しは stderr-addition-consumer-grep に従い実装時に repo grep する

## 自動実行禁止(TLC の副作用を発火経路に置かない)

business-rules の BR-U6-2(自動実行禁止)を継承する。changed 判定は advisory(stderr 1 行)+doctor 行の提示までに留め、TLC(高コストな形式検証)の自動実行は行わない(ADR-1 案 A と却下案 D の境界)。requirements FR-7(b)(TLC 探索の高コストを理由に既存 scope への無条件追加は不可)と整合し、認可されていない高コスト外部プロセスが判定経路から自動起動する経路を排除する。

- 合否: changed 判定経路で run-model-check 呼出が発生しないこと(BR-U6-2 の検証)。落ちる実証は実行時消費行への注入で行う

## 状態の単方向(発火経路は read-only)

business-rules の BR-U6-6(状態の単方向)を継承する。SpecHashState の書込は verdict 記録時のみ(フロー 4)で、advisory・doctor 経路は read-only である。発火経路が状態を書かないことで、判定の観測が状態を汚染する経路(TOCTOU 類の不整合)を防ぐ。technology-stack のとおり本フレームワークは HTTP・DB を持たず資格情報も扱わないため、state ファイル以外の外部境界は存在しない。

- 合否: 発火経路(advisory / doctor)での state ファイルの mtime / bytes が不変(BR-U6-6 の検証)
