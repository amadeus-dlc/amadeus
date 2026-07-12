# Risk & Sequencing Rationale — metrics-observation

## 直列化の根拠

- Bolt 1 先行: walking-skeleton 既定+スキーマ/アトミック性という共通土台の人間確認を最小コストで先行。
- Bolt 2 → Bolt 3: U3 の CI job は coverage/tests collector の消費が本番経路のため、全 collector 完成後に配線するのが「落ちる実証」を CI 上で成立させる唯一の順序。

## クロス intent 交差リスク(要 実 diff 再評価 — E-L5/c6)

- **test-pyramid(進行中、e6)**: FR-2 の unit サイズ純化が tests/ 配下を大規模移設予定。本 intent の U1 は tests/run-tests.ts を触る — **test-pyramid 側も run-tests.ts(smoke 除外ガード等)に触る可能性**があり、着手前に相手の in-flight PR 実 diff と突き合わせる(c6 直列化判定)。scripts/metrics-snapshot.ts・ci.yml は相手スコープ外の見込み。
- doctor-consistency(進行中、e1): utility.ts 面で本 intent と非交差(こちらは utility 非接触)。

## 主要リスクの再掲(RAID からの継承)

- R1(CI ループ): Bolt 3 で paths-ignore/非再トリガー前例の二重ガード+実証。
- R4(silent skip): Bolt 1 の注入テストで骨格から loud fail を固定(後付けにしない)。
