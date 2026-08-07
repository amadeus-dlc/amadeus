# Intent Backlog — 260807-stage-perf-report

上流入力(consumes 全数): intent-statement(ideation/intent-capture/intent-statement.md — 成功指標から proto-capability を導出)

## Proto-capabilities(MoSCoW)

| # | Capability | MoSCoW | 根拠 |
|---|---|---|---|
| C1 | 監査シャード走査(2 世代スキーマ正規化+パス帰属) | Must | 全軸の土台。片側スキーマのみは 73.4% を取り落とす(クロスレビュー実測) |
| C2 | ステージ窓ペアリング+idle 減算の実作業時間 | Must | 素の wall-clock は窓の 59〜74% が idle 混入で指標不成立(同実測) |
| C3 | センサー FAILED 率(stage slug 別) | Must | 遡及集計の最有力軸(reviewer-1: 「最も実装可能性が高い」) |
| C4 | レビューイテレーション集計(record パース) | Must | 書式ゆれ 3 件の許容+パース不能の件数報告込み |
| C5 | モデル帰属(subagent 正確帰属+UNKNOWN fail-closed) | Must | forward-looking 基準線の中核。7,150/7,151 不明の可視化 |
| C6 | Markdown / CSV 決定的出力(平均・中央値・p95) | Must | 決定性契約(LLM 側カウントゼロ) |
| C7 | 落ちる実証テスト+破損入力の件数報告 | Must | 検証劇場 Forbidden の遵守 |

Should / Could は置かない(単一 CLI の凝集機能であり、部分出荷は利用者価値を持たない — cid:scope-definition:c2 の「公開契約を完結させる capability は全て Must」の適用)。

## Won't(本 intent では作らない)

- 記録側拡張(conductor モデル・ハーネス種別)→ 完了時に別 Issue 起票(scope-document Out 参照)
- トークン軸(#2010)/ 前向き eval 基盤 / 難易度正規化

## シーケンス

依存が一直線(C1 → C2〜C5 → C6 → C7 は横断)のため dependency-first。実装形態の裁定(要件・設計段)が最初の分岐点。
