# Performance Design — u001-engine-installer（260705-engine-installer）

上流入力: [performance-requirements.md](../nfr-requirements/performance-requirements.md)

## 設計

- PERF-1（ローカル I/O のみ）: コピーは node:fs の cpSync（再帰）で工程単位に一括実行し、ファイル単位の逐次 I/O 制御や並列化は行わない（数十 MB 規模の静的ファイル群に最適化は不要）。
- PERF-2（eval の決定論）: eval は固定 fixture + 実インストール駆動で構成し、リトライ・sleep・ネットワーク待機を含めない（engine-e2e の慣行）。

## 適用判断

キャッシュ・並列化・プロファイリングの設計は不適用とする（PERF 要求が SLO を持たないため。Right-Sizing）。
