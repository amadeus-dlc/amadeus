# Security Design — election-record(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md、domain-entities.md

## fail-closed 型設計

security-requirements.md の入力検証要件を型で実現する:

- `GoaLineCode` は branded 型+スマートコンストラクタ(`^E-[A-Z0-9]+$` 不一致で `Result` reject — domain-entities.md の Q3=A 設計)。render は GoaLineCode を受けてのみ GoA 行を生成し、未検証文字列から行を作る経路を持たない(parse-don't-validate)
- verify 系 API は読み取り専用シグネチャ(入力: 記録文書+票データ → 出力: 検査結果 Result)— 対象文書への書込参照を引数に取らない設計で読取専用を型面から保証(security-requirements.md の要件反映)

## 公開境界の設計

- 票全文の実体化入力は U2 materialize の出力(開票後)のみを受ける — U3 は開票前データへの到達経路を持たない(business-logic-model.md の入力契約。security-requirements.md 公開境界の構造化)
- 検査の追加が性能要件を壊さないこと(performance-requirements.md の O(n) 上限内 — 正規表現検査は O(1)/行)と、状態を持たないこと(scalability-requirements.md のステートレス前提)を設計制約として共有する。検証の実行は実 parseGoaLine round-trip(reliability-requirements.md 互換性保証・tech-stack-decisions.md の in-process import 選定)に一本化し、独自の互換シミュレーションを作らない(検証劇場の回避)
