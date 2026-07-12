# RAID ログ — メトリクス定点観測(260712-metrics-observation)

> 前 intent からの引き継ぎなし(本 intent は #921 起点の新規系統。feasibility:c2 の再実測対象となる先行 RAID は不在)。

## Risks

- R1: **CI 書き戻しの自己ループ**(snapshot コミットが CI を再誘発)— 緩和: paths-ignore / [skip ci] の定石。設計論点として requirements へ。影響: 中/対処定石あり
- R2: **snapshot によるリポジトリ肥大** — 緩和: 1 snapshot 数 KB の JSON 想定(スキーマ確定後に再見積り)。年間 MB オーダー概算(確信度: 中)。閾値超過時の間引き方針は将来判断として留保(E-L62 様式)
- R3: **メトリクス定義のドリフト**(lizard/ランナー更新で値の連続性が切れる)— 緩和: snapshot に計測器バージョンを記録し、不連続点を機械判別可能にする(design 論点)
- R4: **計測失敗の silent skip**(C3)— 緩和: loud fail+落ちる実証をテスト要件化

## Assumptions

- A1: main への書き戻しは release.yml と同型の権限設計で承認される(前例実測済み — 確信度: 高)
- A2: 観測は読み取り専用の消費(可視化・アラートは本 intent スコープ外、#921 論点欄どおり)

## Issues

- なし(現時点)

## Dependencies

- D1: lizard pip pin(CI 両ジョブ、#837)— 既存
- D2: coverage-normalize(#856)の lcov 正規化 — 既存
- D3: 権限付き workflow の新設(C6)— 本 intent 内で設計
