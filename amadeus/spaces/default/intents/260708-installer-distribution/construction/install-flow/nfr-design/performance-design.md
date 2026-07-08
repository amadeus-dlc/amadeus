# Performance Design — install-flow

> ステージ: nfr-design (3.3) / Unit: install-flow / 作成: 2026-07-08
> 出典: `../nfr-requirements/performance-requirements.md`(U2 予算 ≤25秒、計測区間)・`tech-stack-decisions.md`(fs/promises)、`../functional-design/business-logic-model.md`

## プラン作成の I/O 構造(≤10秒)

- walk+md5 は**逐次ストリーム**: 配布物側ファイルを1つずつ `createReadStream → crypto.createHash("md5")` でハッシュ(全読み込みバッファなし)。対象側の存在確認は `fs.stat` のみ(install では対象側 md5 不要 — 初回は期待値が存在しないため)
- Plan は完成後に freeze(構築中は内部配列、公開は entries() の読み取りビュー)

## 適用の I/O 構造(≤10秒)

- ディレクトリ作成は `mkdir recursive` をパス毎に1回(重複 mkdir を Set で抑制)
- コピーは `fs.copyFile`(カーネル空間コピー)。逐次実行(並列化しない — nfr-requirements の判断踏襲)

## E2E 計測の実装位置

- テストランナー側で `amadeus-setup install --yes ...` を子プロセスとして起動し、起動〜終了を計測(計測区間の定義どおり)。CLI 本体に計測コードを入れない(YAGNI、U1 と同方針)
