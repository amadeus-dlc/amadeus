# スケーラビリティ要件 — U7 conformance-suite

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## スケーリング軸と前提

U7 のスケーリング軸は 2 つ — (1) 追跡表の**上流ケース数**(本 intent では commit `29a31f78` の 32 ケースに固定 — `business-rules.md` BR-U7-8 pin 固定)と (2) per-harness 層の**対応面数**。`technology-stack.md` 実測どおりテスト実行は既存ランナーの単発実行であり、常駐・並行の service スケーリングは適用しない。ケース数は上流 pin で固定されるため、本 intent 内で無制限に増える軸ではない。

## SCALE-U7-1: ケース数の固定と層別による重複抑制

`business-rules.md` BR-U7-1(32/32 被覆)のとおり追跡表は 32 行で固定される。`business-rules.md` BR-U7-3(層別)のとおり compose-semantics 層は 1 回実行、per-harness 層は対応面別で、同一挙動のテスト二重実装を禁止する。これによりテスト総数がケース数×面数へ組合せ爆発しない。

- 合否: 追跡表は 32 行(`business-logic-model.md` フロー 1)。compose-semantics 層のテストは面数に依存せず 1 回実行(ハーネス非依存 — テスト数が面数でスケールしない)
- 合否: per-harness 層のテストは U2-U6 の BR 検証テストと共有し追跡表から参照(`business-rules.md` BR-U7-3 — 二重実装しないことでテスト集合が面数に線形に留まる)

## SCALE-U7-2: 対応面数に対する線形性

per-harness 層(投影・trigger)は対応面別で、面の追加は該当面のテスト追加のみ。`requirements.md` FR-1 で対応面が増えても、compose-semantics 層は不変で per-harness 層のみが線形に増える。

- 合否: 対応面追加時、per-harness 層のテストのみが線形に増え、compose-semantics 層・追跡表構造は不変(`business-logic-model.md` フロー 2 の層別の帰結)

## 非該当カテゴリ(N/A + 根拠)

- 水平スケーリング / オートスケール / 同時接続: N/A。U7 はテストスイートで常駐 service ではない(technology-stack.md「HTTP・DB はない」実測)。スケーリングは CI での単発実行に閉じる
- 上流ケース数の無制限追従: N/A。`requirements.md` A-4 / BR-U7-8 が上流 commit `29a31f78` を pin し、後続変更を本 intent で追わないため、ケース数は 32 で固定される
