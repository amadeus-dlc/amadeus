# Performance Design — upgrade-flow

> ステージ: nfr-design (3.3) / Unit: upgrade-flow / 作成: 2026-07-08
> 出典: `../nfr-requirements/performance-requirements.md`(プラン ≤15秒: 両側 md5)・`tech-stack-decisions.md`(新規技術なし)、U2 nfr-design/performance-design.md(逐次ストリームの継承)

## 両側 md5 の I/O 構造(≤15秒)

- 配布物側と対象側のハッシュは**同一の逐次ストリーム関数**(U2 の `createReadStream → createHash("md5")`)を再利用 — walk のループ内で「配布物側を必ず、対象側は存在時のみ」の2呼び出し
- 対象側 stat → 存在時のみハッシュ(不在なら add 分類でハッシュ不要)— 無駄な I/O を構造で回避
- Disposition 判定(`source.dispositionFor`)は計算のみ(I/O なし)— ハッシュ完了後の純関数呼び出し

## 退避+コピーの構造(≤10秒)

- 退避 rename → コピーの**ファイル単位直列**(REL-U01 の順序保証と同一構造 — 性能のための並列化はしない)
