# Market Trends — installer の新ハーネス追加(installer-new-harnesses)

> ステージ: market-research (Ideation) / 作成: 2026-07-16
> 上流入力(consumes 全数): `../intent-capture/intent-statement.md`
> 方式: 前 intent 260708 の market-trends を正とする差分再利用 — 本書はデルタのみ。

## デルタ(2026-07 時点で本 intent に効くトレンド)

1. **マルチハーネス対応の面数拡大が既定路線**: 当リポジトリ自身が #626 で 4→6 ハーネス(opencode / Cursor)へ拡大した(実測: dist ツリー・docs 着地済み)。競合(cc-sdd 8 エージェント、spec-kit の統合先拡大)も同方向で、「対応面の追加が定期的に発生する」前提での保守設計(全数性の機械検出)の価値が上がっている — 本 intent の中核仮説。
2. **installer の一貫導線への期待**: README「Pick your harness」表で6ハーネス中4つだけ install コマンドを持つ非対称は、利用者導線として不整合(前 intent の docs 着地により顕在化)。仮説ラベル: 非対称の実利用上の混乱は未実測(Issue 報告ゼロ)— 先回りの整合化として位置づける。

トレンドの全体像(スペック駆動開発の普及、npm 配布の標準化等)は前 intent の market-trends から変化なし(8日間、確信度: 高)。

## 全体像の参照先

スペック駆動開発の普及・npm 配布標準化・エージェント多様化の全体トレンドは前 intent 260708 の market-trends.md を正とする(本書はデルタ専用 — 重複記述はドリフト源になるため持たない)。
