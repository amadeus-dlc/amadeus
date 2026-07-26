# Unit of Work Story Map — metrics 可視化(B1 後続)

上流入力(consumes 全数): components.md, component-methods.md, services.md, component-dependency.md, decisions.md, requirements.md

## ユーザー行動 × Unit の対応

| ユーザー行動(ジャーニー順) | 充足する Unit | 由来 |
|---|---|---|
| 手元で `bun scripts/metrics-visualize.ts --write` を実行し `metrics/index.html` を得る | U1 visualize-skeleton | FR-1 / Q2=C(手動) |
| ブラウザで開き、全6系列のトレンドを1画面で眺める | U1 | FR-4 S1 / Q3=A |
| 気になるデータ点から commit SHA を特定して git で掘る | U1 | FR-4 S3 |
| 劣化(coverage 低下・CCN 増・dist 肥大・テスト失敗)を色で即座に見つける | U2 visualize-hardening | FR-4 S2 / Q4 |
| 何もしなくても main マージのたびに最新化された index.html がコミットされている | U2(CI 同乗) | FR-5 / Q2=C(CI) |
| `--check` で生成物が正本と一致しているか検査する(CI・レビュー時) | U2 | FR-1 / AC-5 |
| docs を読んで使い方を知る(日英) | U2 | FR-8 |

## ストーリーの独立性

- U1 だけで「見る」ジャーニー(生成 → 閲覧 → SHA 遡及)が完結する — Bolt 1 の出荷価値
- U2 は「気づく」(強調)・「維持する」(CI・drift・上限)・「学ぶ」(docs)を重ねる増分で、U1 の閲覧体験を壊さない
