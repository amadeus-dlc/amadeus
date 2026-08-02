# Scalability Design — u1-schema-resolver

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u1-schema-resolver(C1+C2)

上流入力(consumes 全数): scalability-requirements(適用性評価・成長に対する境界), performance-requirements(計算量の境界), reliability-requirements(純粋性), tech-stack-decisions(新規依存なし・純粋モジュール), business-logic-model(§2.3 visited ワークリスト BFS / §2.6 宣言照合)

## 1. 適用性の結論(scalability-requirements からの転記)

scalability-requirements.md §適用性の評価のとおり、本 Unit は単一プロセスで短時間に完走する CLI/CI 検証ツールの内部モジュールであり、同時接続・負荷分散・自動スケーリング・容量計画の概念を持たない。水平/垂直スケーリング、スケーリングトリガ、同時実行数目標の設計は**適用外**(根拠: CI ジョブ内の逐次ステップ、常駐プロセスなし、対象は現行 2 モデル + aux 1 件の固定小規模集合で第3モデル登録は Out of scope)。したがって本書に配置図・容量計画・スケーリングポリシーは存在しない。

## 2. 適用する唯一の設計事項 — 成長に対する線形性

登録モデル・補助モジュールの増加に対し計算量が**線形のまま**であることを構造で保証する。これは新機構の追加ではなく、functional-design が固定した既存機構の構造的一般化であり、写像は performance-design.md §2 の表と同一である。

| 設計事項 | 構造的一般化の中身(functional-design の既指定) | 検証方法 |
|---|---|---|
| 推移閉包の線形性 | C2 §2.3: `visited` 集合付きワークリスト BFS。モジュール数を n、総行数を m として O(n + m)。各モジュールは高々1回だけ読取られ、モデル数が増えても再走査経路が構造的に存在しない(全ペア比較・再帰的ソース再走査を禁止) | t402 合成モジュール列(A→B→C)で注入 `readModule` stub の呼出回数がモジュール数を超えないこと — scalability-requirements Acceptance / performance-design.md §2 表1行目と同一判定 |
| 宣言照合の計算量上限 | C2 §2.6: declared/resolved ともモデル数比例の小集合。ソート + 集合差分で O(n log n) を上限とし、全ペア比較禁止 | t402 宣言照合ケース — performance-design.md §2 表の該当行と同一判定 |
| 純粋性の維持(将来の成長で機構を足さない) | BR-R8: 状態を持たない純粋関数設計。モデル数増加時にキャッシュ・メモ化・ワーカー・並列化を**追加しない**(現行規模で不要、過剰設計の禁止) | performance-design.md §3 禁止事項に固定済み — code-generation の逸脱は import 一覧検査 + レビューで検出 |

## 3. 禁止事項(code-generation への制約)

- スケーラビリティ目的の新規機構(キャッシュ、メモ化、ワーカー、並列化、ストリーム化)の追加禁止 — performance-design.md §3 と同一の禁止。
- O(n + m) / O(n log n) を超えるアルゴリズムへの置換え禁止(全ペア比較、ソースの再走査)。

## 4. 前方参照

成長の上限そのもの(第3モデル登録は Out of scope、CI 30 分 timeout との整合判定)は requirements.md と u5(FR-5、ADR-8 measure-first)の帰属であり、本 Unit では推測による予防的最適化を行わない — scalability-requirements.md §適用性の評価 / performance-requirements.md §計算量と実行時間の境界を前方参照。
