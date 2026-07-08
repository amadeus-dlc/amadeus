# Performance Design — setup-foundation

> ステージ: nfr-design (3.3) / Unit: setup-foundation / 作成: 2026-07-08
> 出典: `../nfr-requirements/performance-requirements.md`(タイムアウト 10秒/20秒、予算 31秒/66秒、RSS ≤256MB)、`../functional-design/business-logic-model.md`

## タイムアウトの実装構造

- `Http` ポートの実装(cli が注入)に **タイムアウト値を焼き込む**: `createHttp({ apiTimeoutMs: 10_000, archiveTimeoutMs: 20_000 })`。resolver/fetcher はタイムアウト値を知らない(ポートの実装詳細 — 情報隠蔽)
- `AbortSignal.timeout(ms)` を fetch に渡し、abort は `FetchError.classify` が `timeout` 分類に落とす

## ストリーミング展開の構造(RSS ≤256MB)

- ダウンロード: `Response.body`(ReadableStream)→ 一時ファイルへ直接書き込み(全体をメモリへバッファしない)
- 展開: gunzip → tar パースを **チャンク逐次処理**(エントリ単位でファイル書き出し)。tar パーサは512バイトブロック境界のステートマシンとして実装(自作最小実装の構造指針)

## 計測フック

- fetcher は開始/完了の高分解能時刻(`performance.now()`)を `ExtractedPayload` 生成時のメタとして保持しない(YAGNI)— E2E の計測は**プロセス外**(テストランナー側)で行う(nfr-requirements の計測区間定義どおり)
