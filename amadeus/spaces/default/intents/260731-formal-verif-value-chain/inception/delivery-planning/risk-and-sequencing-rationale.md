# Risk and Sequencing Rationale — formal-verif-value-chain

上流入力(consumes 全数): requirements, components, unit-of-work, unit-of-work-dependency, unit-of-work-story-map

bolt-plan.md の順序をリスク制御として説明する(intra-bolt-order-as-risk-control の適用)。

## 順序の根拠(dependency+risk-first)

1. **B1(移設)を最初に置く理由**: unit-of-work-dependency の u1 が u2/u3/u4/u6 の前提。components.md の C1 が C2/C10/C6/C7 の前提であり、配置を後で動かすと後続 4 Bolt すべてがパス書き換えの手戻りになる。同時に、requirements の FR-A1/A2/A4 を1 Bolt で閉じることで walking skeleton が「移設後 runner が e2e で回る」薄スライスとして成立する。
2. **B1 内の順序もリスク制御**: 移設 → CI 付け替え → stage 参照 → dist 再生成 の順を守る。CI 付け替えを後回しにすると、PR の中間コミットで CI が構造的に赤になり「自変更由来か既存赤か」の切り分けコストが発生する(local-ci-red-assertion-verbatim の予防)。
3. **B6(--impl-only)を B7(モデル)より前に置く理由**: モデル登録後に mirror 実装の無関係変更が入ると SOURCE_DRIFT で赤くなるが、正規復旧経路(--impl-only)が未実装だと手編集しか手段がない(#1510 の詰み構造の再演)。復旧経路を先に用意する。
4. **B8(e2e 実測)を最後に置く理由**: FR-E は B5(配布)・B2(advisories)・B7(モデル)の全機構が揃って初めて貫通できる。

## リスク(RAID)

| ID | リスク | 影響 | 緩和 | 状態 |
|---|---|---|---|---|
| R-1 | 分類 D 削除(B3)がテスト 93 パスへ波及し、想定外のテストが道連れになる | B3 の規模膨張・CI 赤 | 削除前に参照グラフを実測し、削除対象テストの目録を PR 本文に列挙。CI green を削除ごとに確認 | 未着手 |
| R-2 | manifest スキーマ拡張(B5)が既存 plugin 消費側(projection・conformance テスト t341 等)を壊す | 配布パイプライン赤 | tools 欠落時 `[]` の後方互換(ADR-1)+既存 plugin テスト全数 green を AC に含む | 設計で緩和済み |
| R-3 | advisories フィールド追加(B2)が既存 directive parse 消費側を壊す | ワークフロー停止 | 変更前に repo grep で消費側棚卸し(FR-B2 AC、stderr-addition-consumer-grep の stdout 面) | 未着手 |
| R-4 | TLC 完全探索(B7)が状態爆発で完走しない | FR-C3 の AC 未達 | ADR-3 の縮約(MaxReceipts=3、boundary 4種)。完走しない場合は縮約を強めるが、消える性質を明記(finite-exploration-not-detected-proof) | 未着手 |
| R-5 | 台帳2面(complexity-baseline / allowlist)が複数 Bolt で交差し textual conflict | マージ渋滞 | B3 を台帳整理の直列化点にし、他 Bolt は実 diff で交差判定(c6 / shared-ledger-insert-collision) | 計画で緩和 |
| R-6 | 移設(B1)後に model-map 複製の drift guard が未配線だと二重保持が無防備化 | ADR-2 の前提崩壊 | drift check の配線を B1 の AC に含める(components C1) | 設計で緩和済み |
| R-7 | mirror 実装(#1838 等)が本 intent 期間中に別 intent で変更され、B7 のモデル前提がずれる | モデルと実装の乖離 | model-map の SHA ピンが検出する。B7 着手時に mirror 系の main 前進を実測 | 監視 |

## 未実測項目(先送りしない)

- R-3 の消費側棚卸しは B2 実装時に必ず実施(requirements FR-B2 AC の一部 — 「未実測のまま PR」は unverified-raid-is-live-risk の再発)。
- R-4 の TLC 完走は B7 の AC 実測項目。完走しない場合は縮約変更をユーザーへ報告してから進める(仕様変更に当たる場合はエスカレーション)。
