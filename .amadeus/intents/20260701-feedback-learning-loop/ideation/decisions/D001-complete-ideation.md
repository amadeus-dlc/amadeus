# D001: Ideation を完了し、Inception へ進める

## 状態

accepted

## 文脈

Issue #259 は、Amadeus DLC に後段 feedback と Intent 横断の学習ループを定義することを求めている。

既存の Ideation には `学習候補` があり、phase ごとに `traceability.md` と `decisions.md` がある。
また、`.amadeus/steering/knowledge.md` は Intent 横断で再利用する知識の索引として存在する。

一方で、後段 phase で前段成果物の不整合や不足が見つかった場合の戻し先と、完了済み Intent から抽出した学習の昇格先はまだ標準化されていない。

## 決定

Ideation を完了し、Inception へ進める。

この Intent では、後段 feedback と Intent 横断 learning の定義を Amadeus DLC の lifecycle contract として扱う。
Issue #257 は decision review と grilling 起動条件の標準化として接続するが、学習分類そのものの責務へ混ぜない。

## 根拠

Issue #259 の受け入れ条件は、要求定義、skill 連携、成果物責務、validator と evaluator の分類を必要としている。
これらは Inception で要求、受け入れ条件、ユースケース、Unit、Bolt に分解するのが妥当である。

Ideation では、対象、対象外、初期分類、未確定事項、追跡を明確にすれば、Inception に進むための情報がそろう。

## 影響

Inception では、後段 feedback 条件、学習先分類、成果物責務、skill 起動先、Issue #257 との接続境界を具体化する。

Construction では、必要に応じて skill 説明、テンプレート、validator または evaluator を更新する。

## 再確認条件

- Issue #257 の成果物が先に確定し、decision review の起動順序が変わった場合。
- Steering knowledge と Domain Map または Context Map の昇格条件が重複する場合。
- validator と evaluator の責務境界が Inception で変わる場合。
