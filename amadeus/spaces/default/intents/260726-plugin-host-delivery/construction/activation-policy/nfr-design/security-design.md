# セキュリティ設計 — U6 activation-policy

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## path 安全(compose 通過済み glob のみ・独自解決の不在)

security-requirements「path 安全」のとおり、`computeSpecHash(ActivationWatch.globs)` の入力は compose の path escape 拒否を通過した plugin 宣言由来 glob のみとする。U6 は **独自の path 解決・正規化を追加しない**(既存 compose 段の拒否が唯一の境界 — 二重実装は挙動分裂リスクのみを持ち込む)。escape glob の拒否自体は既存テスト面の担保(BR-U6-7)であり、U6 側の設計要素は「compose 未通過の glob を受け取る入口が存在しない」という配線(composition record 経由でのみ ActivationWatch を得る)である。

## advisory 挿入点の設計(stdout 純度)

security-requirements「stdout 純度」の合否(directive JSON の byte 不変)を、挿入点の限定で実装する:

- 挿入点は `amadeus-orchestrate.ts` の next 経路で **build-and-test 指令の directive JSON を stdout へ emit する直前・stderr のみ**(business-logic-model フロー 2)。stdout ストリームへの書込コードを advisory 経路に置かない(stdout-directive-stderr-advisory 契約 — engine の「stdout = directive JSON / stderr = advisory」既存契約への追記であり新契約ではない)
- AdvisoryLine は 1 行固定文言(spec-hash changed | never-run の 2 変種)。指令発行 1 回につき最大 1 行 — 呼出し点が複数になる場合はラッチで 1 行化(BR-U6-8 / guard-announcement-callsite-count。reliability-design の advisory 回数合否と共有)
- 検証: advisory 発火時に stdout の parse 成功+既存 next 消費テスト green。stderr 追加の消費側棚卸しは実装時に repo grep(stderr-addition-consumer-grep)

## 自動実行の不在(TLC 非起動)

security-requirements「自動実行禁止」のとおり、changed | never-run 判定の帰結は advisory 提示+doctor 行(U5 への判定提供)**まで** で、run-model-check(TLC)の呼出コードを判定経路に置かない(BR-U6-2 — ADR-1 案 A と却下案 D の境界)。落ちる実証は実行時消費行への注入で「changed 経路に TLC 呼出が現れたら赤」をテスト固定する。

## 状態の単方向(発火経路 read-only)

security-requirements「状態の単方向」のとおり、SpecHashState への書込は verdict 記録時(フロー 4 の `writeActivationState`)のみで、advisory・doctor 経路は read-only(reliability-requirements の単方向合否 — reliability-design が冪等性として詳細化)。書込関数を advisory 経路の deps に渡さない配線で、型上も到達不能にする。performance-requirements の current 無音合否(performance-design の分岐)と合わせ、観測が状態を汚染する経路(TOCTOU 類)は存在しない。scalability-requirements の非常駐前提により、state ファイル以外の外部境界(HTTP / DB / 資格情報)は N/A。
