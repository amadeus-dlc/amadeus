# Scalability Requirements — install-flow

> ステージ: nfr-requirements (3.2) / Unit: install-flow / 作成: 2026-07-08
> 出典: `../functional-design/business-logic-model.md`(直列パイプライン)、U1 scalability-requirements(適用外宣言)

## 適用外の宣言(根拠付き)

U1 と同一の根拠(短命ローカル CLI・常駐なし)で適用外。U2 固有の規模軸は「対象プロジェクトのファイル数(md5 照合対象)」のみで、performance-requirements のプラン予算(≤10秒、逐次 I/O)がそれを吸収する。同一ターゲットへの並行実行は想定外(services.md — partial 検出が安全網)。
