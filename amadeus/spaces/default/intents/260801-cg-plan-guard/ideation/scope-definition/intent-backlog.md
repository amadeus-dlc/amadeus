# Intent Backlog — 260801-cg-plan-guard

上流入力(consumes 全数): intent-statement.md、stakeholder-map.md

- 並び順は `intent-statement.md` のリスク(誤発動が最大リスク)から逆算し、risk-first で編成した(`stakeholder-map.md` の conductor 機動性懸念を corpus sweep の先行で緩和)。

## バックログ(優先順)

| # | 項目 | 根拠 | 検収 |
|---|---|---|---|
| B1 | bolt_dag 判定基盤+null/stale fail-closed(M4)+#1893 parser 是正(M6) | 他の全ガードの前提となる判定入力の信頼化。同一患部(computeBoltDag/parseUnitsBlock) | null 注入で loud、#1893 形式の無音 null 非再現、corpus の既存 record 全数で判定値が安定 |
| B2 | directive 発行側ガード(M1)+両方向判定(M3)+3部メッセージ(M5) | 実測4件クラスの主経路を先に塞ぐ | 両方向注入で赤、正当直列6件相当で緑、メッセージ3部の機械検査 |
| B3 | approve 時実績突合(M2) | engine 迂回の手動 fan-out の捕捉(directive 側では構造的に不可視) | audit SWARM イベント突合の赤/緑両側実証 |
| B4 | docs 同期(reference の state-machine/12 と guide の該当節、en/ja 対) | 新ガードはユーザー可視の engine 挙動変更 | docs 検査+対訳同期 |

## 依存

B1 → B2 → B3(判定入力 → 発行側 → 実績側)。B4 は B3 後。#1893 の編入は クロスレビュー2名成立が前提(現在進行中 — 未成立のまま B1 実装期に入る場合、M6 を B1 から切り出して保留)。
