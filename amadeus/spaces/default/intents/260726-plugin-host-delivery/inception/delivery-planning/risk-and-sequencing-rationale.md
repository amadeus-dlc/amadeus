# Risk and Sequencing Rationale — plugin-host-delivery

> 上流入力(consumes 全数): requirements、components、unit-of-work、unit-of-work-dependency、unit-of-work-story-map、team-practices

## 順序の根拠(risk-first + 依存優先)

1. **Bolt 1(マトリクス)を最初に置く**: 最大の不確実性 = 未実測の外部 seam(requirements FR-1)。ここで「対応面集合」を確定しないと Bolt 3/6 の実装確約が捏造になる(external-seam-vocab-measurement)。scope-definition:c3(未証明基盤に依存する価値面を先行着地させない)の適用
2. **Bolt 2(skeleton)で最大の統合リスクを貫通**: engine 移設(既存テスト面の退行リスク)と「install→compose→通常 scope 実行」の統合可否(feasibility A-2)を 1 ハーネスで実証してから横展開する
3. **Bolt 3-5 の並行**: 相互非依存(unit-of-work-dependency.md)でリソース効率を確保。Bolt 6 は Bolt 3 の投影生成物(フック snippet)に依存するため後置
4. **Bolt 7 を実装合流点の後に置く**: 適合テストの先行はテストが仕様を先取りし、未対応面の暗黙成功を作る(FR-8 の層別・N-A 根拠は実装確定が前提)
5. **Bolt 8(docs)を最後に置く**: 実装と一致しない手順書の先行公開は偽装文書化(story-map シーケンス根拠)

## Bolt 内順序をリスク制御として使う箇所(bolt-plan の再掲要約)

- Bolt 2: 移設→CLI→投影→フック→E2E(移設破損の早期検出 — 退行窓の構造的封じ込め)
- Bolt 5: spec-hash 実装→テスト→`--single` 撤廃(ゲートなし到達可能の一時窓を消す)
- Bolt 7: 追跡表確定→テスト実装(暗黙成功の防止)

## 主要リスクと計画上の手当(feasibility raid-log の Bolt への写像)

| リスク(raid-log) | 計画上の手当 |
|---|---|
| R-1 未実測 seam | Bolt 1 先行+確約の実測後限定 |
| R-2 前例なし 3 面 | ADR-4 の 3 クラス枠組み+manual 床(Bolt 2 で床を先に出荷) |
| R-3 起動レイテンシ退行 | Bolt 2 の no-op 高速路+build-and-test 実測固定(NFR-2) |
| R-4 適合テスト規模 | Bolt 7 の層別(compose 意味論 1 回/面別)+CI 増分計測 |
| R-5 dist drift 相互作用 | 並行 Bolt の交差判定に dist ツリー集合変化を含める(cross-merge-dist-tree-blindspot) |
| R-6 activation 未裁定 | 解消済み(ADR-1 案 A 裁定 2026-07-27)— Bolt 5 は裁定準拠実装のみ |
