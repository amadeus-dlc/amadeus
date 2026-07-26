# Intent バックログ — metrics 可視化の将来項目

上流入力(consumes 全数): intent-statement.md, feasibility-assessment.md, constraint-register.md

> 本 intent のスコープ外として明示除外した項目の台帳(scope-document.md Out of Scope と対応)。着手はそれぞれ独立のユーザー判断による。260712-metrics-observation の intent-backlog.md B1 を本 intent が消化したのと同じ仕組み。

## 台帳

| # | 項目 | 出典 | 備考 |
|---|---|---|---|
| V1 | GitHub Pages 公開 | Q1 裁定(A 選択、D 非採用) | コミット済み index.html を docs/ 等へ投影するだけで成立する見込み。閲覧ニーズが本人以外に広がったら |
| V2 | 劣化アラート(閾値超過の能動通知) | scope Out 4 | 既存ゲートとの責務重複を精査してから。constraint-register.md C5 の非対称を壊さないこと |
| V3 | 追加メトリクス系列の表示 | 260712 バックログ B4(スキーマ疎結合) | writer 側にコレクタが増えた場合、未知コレクタの表示契約(raid-log R2)が吸収する設計なら自動追随も可 |
| V4 | 過去時点の遡及計測の可視化 | 260712 バックログ B5 | B5 自体が未着手。着手時は本可視化がそのまま入力にできるよう snapshot 形式を維持 |

## 備考

- 260712 側の B1 行への「→ 本 intent で着手」追記(双方向リンク)は record-sync のタイミングで実施する(intent-capture memory.md の Open question を引き継ぎ)
