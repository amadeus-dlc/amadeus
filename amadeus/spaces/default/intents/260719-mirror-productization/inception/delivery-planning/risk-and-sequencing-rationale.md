# Risk and Sequencing Rationale — 260719-mirror-productization

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md

## 順序の根拠(risk-first)

1. **Bolt 0(norm PR)最先行**: FR-7 (c) の順序制約が全コード Bolt のマージをブロックしうる唯一の外部承認面 — 最初に外す
2. **Bolt 1 = walking-skeleton**: 新配布経路(core/tools→6ハーネス dist)が本 intent 最大の構造リスク(ADR-1 Reversibility: ロックイン寄り)— 縦スライスで最初に実証し単独ゲート
3. **Bolt 2 を Bolt 3 より先**: U4 は U3 に依存(DAG)。U3 は葉で独立 — 早期に着手可能
4. **Bolt 3 最後**: engine 変更(C-04/C-08 の契約面)は消費者影響が最大 — 依存が全て揃った状態で1回だけ触る

## リスク台帳(top 3)

| リスク | 影響 | 緩和 |
|---|---|---|
| norm PR の承認遅延(ユーザー不在跨ぎ) | Bolt 1 マージ待ち滞留 | merge-approval-latency 準拠(承認待ちは正常系・非依存作業継続)。Bolt 1 の実装・レビューは norm PR 承認待ち中も進められる(マージのみブロック) |
| dist 6面同期の regen 漏れ | drift guard 赤 | 全 Bolt で dist:check/promote:self:check を検証コマンドに固定(N-3/N-4) |
| engine 変更の既存 next 消費者破壊 | 既存テスト赤 | 実装前に consumer grep 棚卸し(C-08、stderr-addition-consumer-grep) |
