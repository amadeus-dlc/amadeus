# Scalability Design — stage-stats-cli(nfr-design)

上流入力(consumes 全数): business-logic-model(A1〜A7 の計算量特性をスケール設計の対象として消費)。performance-requirements / security-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在 — 代替正本は requirements.md NFR-1(実測ベース上限)とする

## スケール軸と設計

対象のスケール軸は**コーパスの成長**(シャード数・行数・record ファイル数の単調増加 — 監査は append-only)のみ。同時実行・多ユーザー・水平分散は存在しない(単発実行 CLI — cid:nfr-design:c1 により horizontal scaling / auto-scaling のセレモニーを持ち込まない)。

- **計算量**: 走査 O(総行数)+集計 O(窓数+イベント数)+出力 O(ステージ数 log ステージ数)。行数に対して線形 — コーパス 10 倍でも走査時間はほぼ線形増(60 秒上限には observed 比で桁の余裕)
- **メモリ**: 保持は集計構造のみ(行テキスト非保持)。窓数・ステージ数・モデル種数に比例し、行数には比例しない

## 将来の超過時の手当(設計方針のみ)

60 秒上限へ近づいた場合の第一手は「対象 intent の期間フィルタ(--since 等)」の申告付き追加であり、並列化・キャッシュではない(決定性 FR-6 AC i を壊さない選択を優先)。本 intent では実装しない(Out of scope の先取り禁止)。
