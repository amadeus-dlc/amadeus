# Risk and Sequencing Rationale — intent 260816-priority-bug-batch-3

## 順序の根拠(AUTO_DECIDED q-dp-sequencing)

採用ヒューリスティック: 優先度キュー順 + 依存制約 + 同一ファイル直列化(cid:requirements-analysis:bug-zero-goal の機械適用)。WSJF 不使用(5 unit の小規模で優先度・依存が順序を一意に定める)。

1. **Bolt 1 = autonomy-refusal-idem(#3152, P2)**: P1(#3153)の実装前提(ProductionAutonomyContext の純粋読取化 — unit-of-work-dependency.md の唯一のエッジ)。P1 より先に置くのは優先度逆転ではなく依存制約の充足
2. **Bolt 2 = milestone-presence(#3153, P1/S2)**: 最優先バグ。前提充足後の最速位置
3. **Bolt 3 = prc-finalization(#3149, P2)**: P2 群の先頭 — park 中の intent 260815-rfc-autonomy-modes の resume を解除する時間価値(time criticality)。さらに本 intent 自身の後続 Bolt の PR 収束が修正後の機構で行える自己適用便益
4. **Bolt 4 = source-work-probe(#3156, P2)**: 残る P2。amadeus-state.ts 群の直列窓の最後
5. **Bolt 5 = election-append(#3046, P3)**: 優先度最下位。完全独立のため任意時点の並行レーンでも可(着地のみ末尾)

## トポロジカル順との関係

2.7 の DAG 制約(milestone-presence は autonomy-refusal-idem の後)を厳密に満たす。**トポロジカル順からの逸脱なし**。

## リスク登録(RAID 抜粋)

| リスク | 影響 Bolt | 緩和 |
|---|---|---|
| Bolt 3 の自己適用(修正中の pr-convergence を自 intent の配送に使用) | 3以降 | attestation は self-install 投影から起動(c2-pr-record-in-head-checkout)。取込後 `bun run build` 必須(c1-mirror-and-rebuild-before-review)。Bolt 3 の PR 自体は修正前機構で収束させる(修正は着地後の投影 rebuild から有効) |
| amadeus-state.ts の3 Bolt 交差(1/2/4) | 1, 2, 4 | worktree 分離 + Bolt 番号順の直列着地 + 着地ごとの rebase 追従(serial-landing-rebase-shape) |
| audit-format.md / event-registry の行域重複(Bolt 1 と 2) | 2 | Bolt 1 着地後に Bolt 2 が rebase して同期面を再解決 |
| クラスB 3件の現存性(実装時再実測で消滅している可能性) | 3 | ADR-4 契約4 — 再実測が第一作業。消滅していても機構(override 経路)の落ちる実証は合成孤児 epoch で成立 |
| フルスイート・coverage の負荷交差 | 全 | coverage single-owner(c1-coverage-single-owner)、重い検証は push 後 CI 並列(push-first) |

## 外部依存による順序制約

なし(external-dependency-map.md — GitHub 常設サービスのみ)。
