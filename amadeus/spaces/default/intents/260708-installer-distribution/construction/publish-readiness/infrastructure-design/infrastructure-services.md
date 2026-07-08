# Infrastructure Services — publish-readiness

> ステージ: infrastructure-design (3.4) / Unit: publish-readiness / 作成: 2026-07-08
> 出典: `../nfr-requirements/security-requirements.md`(SEC-P01〜P03)、feasibility R1

## 利用する外部サービス(publish 時)

| サービス | 用途 | 前提 | 障害時 |
|----------|------|------|--------|
| registry.npmjs.org | パッケージ公開・配信 | npm org `amadeus-dlc` スコープ確保(R1 — 人間の公開前タスク)、2FA 有効 | 手順書の再実行(公開は冪等でないため deprecate+パッチ版が回復手段 — 手順書7章) |
| GitHub(タグ) | 配布物の取得元 | `vX.Y.Z` タグ発行(U5 マージ後) | タグなしでは publish 手順の前提確認で停止 |
