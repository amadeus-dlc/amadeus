# Stakeholder Map — 260720-formal-verif-experiment

## 上流入力(consumes 全数): なし(本ステージは consumes 宣言なし — intent-statement.md と同一セッションの裁定を入力とする)

## Key Stakeholders(主要ステークホルダーと関心)

| ステークホルダー | 役割 | 関心 |
|---|---|---|
| ユーザー(j5ik2o) | 最終意思決定者 | 「好ましくない動作への無限改修」の停止。判定器構成を意見でなく実測で決めること。ideation まで実行して park という進行管理 |
| leader | ゲート執行・台帳管理 | intent 台帳登録済み(2026-07-20T04:35Z ack)。E-OC1 判定申告・§13 候補・選挙依頼の受領。construction 進入時は選挙 CLI 面(e2/e4 の in-flight intent)との非交差確認が前提 |
| e6(本セッション) | conductor | ideation フェーズの実行と park、record の整合維持 |
| e2/e4(選挙 CLI 面の in-flight 保有者) | 影響を受けるメンバー | 実験がバグ再注入ブランチを切る対象(scripts/amadeus-election-*.ts)は e2/e4 の進行中作業と交差しうる — construction 進入時に非交差実測が必要(leader 指示 2026-07-20) |
| 将来の設計者(AI エージェント全般) | 判定器の利用者 | 新規設計時に「仕様の穴」を機械検出できる CI 常駐ゲートの存在 |

## Decision-makers vs. Influencers

- **Decision-maker**: ユーザー(実験実施の裁定・Q1〜Q3 のスコープ裁定は取得済み。実験結果に基づく本採用構成の裁定は将来のユーザー判断)
- **Influencer(実測証言)**: 独立エージェント6体(codex×3+claude×3)のグリリング証言 — 最終立場は A(TLA+ 正本)系 3、C改(TS 内完結)系 3 で割れたが、全員が同一の決着実験と翻意条件を確約済み。実験結果が出れば影響者の意見対立は自動解消する設計
- **Influencer(規範)**: memory 層ノルム(Bun-only Forbidden、gh-scripts-boundary、検証劇場禁止、落ちる実証)— 実験設計は既存規範の境界内で裁定済み(Q2)

## Communication Requirements

- **leader へ**: 各ステージゲートの報告(E-OC1 判定申告+§13 候補 or 0件を同梱 — gate-report-s13-bundling)。節目報告(push-reporting)
- **ミラー Issue**: intent-first ノルムに従い、park 時に共有面としてミラー Issue を起票(タイトル+3〜5行概要+record リンク+状態行のみ。設計詳細は record 側)
- **record PR**: park 時に record 成果物を record PR として発行し、起票者以外の独立2名の実測レビューを受ける(intent-first 経路のクロスレビュー)。construction 進入は record PR マージが前提
