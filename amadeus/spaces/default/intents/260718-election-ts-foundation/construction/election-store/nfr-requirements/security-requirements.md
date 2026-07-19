# Security Requirements — election-store(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 入力検証と書込境界

- appendBallot は全経路共通の先頭検査で二重票を reject(business-logic-model.md 操作フロー — FR-3b の全期間適用)。検証済み Ballot(U1 parse 済み)のみを受ける(parse-don't-validate の境界分担)
- 書込先は `amadeus/spaces/<space>/elections/<選挙ID>/` 配下に閉じ、repo 外への書込なし(ADR-1 Security 節・ADR-2)。パス構成要素(選挙 ID)は採番規則(実装時 mirror.ts 様式)由来で外部入力をパスへ直結しない
- 秘匿情報を扱わない。blind 性の保護: 開票前の票は ledger 追記のみで ballots/ 実体化は materialize 時に限る(requirements.md FR-5b — D-09 の開票時公開)

## 依存と攻撃面

- 新規 runtime 依存なし — 既存スタック(technology-stack.md の Bun/TS 現行構成)の fs API のみ。認証・認可レイヤは導入しない(W-04 配布外・単一書込主体 = conductor)
