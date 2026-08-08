# Security Design — u3-question-route-observability

上流入力(consumes 全数): business-logic-model.md(導出属性・検査点)。nfr-requirements 系5成果物は SKIP により未生成(設計どおりの不在)。

## 情報面

- 追加属性は `Resolution Route`(2値)と `Decision Id`(既存 audit に実在する識別子への参照)のみ — 質問本文・回答内容などの機微情報を新たに複製しない。redaction 対象語彙の増加なし
- `--decision-id` の形式検査(`auto-decision-` 形)は注入面の限定 — 任意文字列を属性へ素通ししない

## 認可・guard の不変

- 回答チェックポイント guard(`amadeus-log.ts:180` の `isAutonomousMode` 免除含む)は挙動不変(BR-U3-3 の対照テストで固定)— 新しい受理・拒否経路を作らない(iteration 1 BLOCKER 是正後の導出属性設計)
- 検証劇場の防止: Route は実際に渡された decision-id の有無からの導出であり、記録側が自己申告で ladder を主張できない(decision-id は AUTO_DECIDED 実在記録への参照 — u5 の集計で突合可能)
