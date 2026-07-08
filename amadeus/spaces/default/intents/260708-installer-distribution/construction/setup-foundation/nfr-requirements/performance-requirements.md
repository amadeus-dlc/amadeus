# Performance Requirements — setup-foundation

> ステージ: nfr-requirements (3.2) / Unit: setup-foundation / 作成: 2026-07-08
> 出典: `../functional-design/business-logic-model.md`・`business-rules.md`(BR-F06〜F09)、requirements NFR-001、services.md

## 時間バジェット(NFR-001「1分以内」の U1 配分)

| 処理 | バジェット | 根拠 |
|------|-----------|------|
| バージョン解決(REST 最大2リクエスト) | ≤ 5秒(通常ネットワーク) | BR-F09 の呼び出し上限が上界を定める |
| アーカイブ取得(tar.gz、現行 dist 一式 ≈ 数MB) | ≤ 30秒 | NFR-001 の支配項。リトライ1回込みで ≤ 60秒 |
| 展開+ExtractedPayload.locate | ≤ 5秒 | ローカル I/O のみ |
| マニフェスト読み書き | ≤ 1秒 | 単一 JSON |

- 計測点: fetcher が取得開始/完了を計測し、E2E テスト(NFR-001 検証)が全体経過時間をアサートする(モック/フィクスチャ時はネットワーク項を除外)
- md5 計算はプラン時(U2/U3)であり本 Unit の予算外

## 実装上の性能規律

- ストリーミング展開(全体をメモリへ載せない)。目安: ピークメモリ ≤ 256MB
- 逐次処理で十分(並列化は複雑性に見合わない — 数千ファイル規模で I/O バウンド)
