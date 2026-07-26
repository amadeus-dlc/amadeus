# Performance Requirements — U1 visualize-skeleton

上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

## 性能要件

business-logic-model.md の処理フロー(読込→検証→整列→描画→書込)と requirements.md FR-1/FR-2 に基づく。CLI 単発実行のため常駐 service 向け SLO は置かない(nfr-design:c1 — 決定的な file 境界へ置換)。

- U1-PERF-01: 現行実データ(123件・約193KB — requirements.md 測定 ref 断面)に対し `--write` が実用時間で完走する。受け入れは実測1回の完走(所要秒の閾値は置かない — 単発 CLI・ローカル実行で強制メカニズムが存在しないため、数値 SLO は捏造しない)
- U1-PERF-02: 計算量は snapshot 件数 × キー数の線形。走査対象の発見は business-rules.md ルール6 のデータ駆動(discoverCollectors/unionValueKeys)による。二重描画・再パースの重複走査を持たない(business-logic-model.md の8ステップフローが入力集合を一度だけ走査する構造 — コードレビュー観点として固定)

## 非対象

- 並行実行・キャッシュ・インクリメンタル生成 — retention 上限 360件(metrics-retention.ts:25 METRICS_RETENTION_KEEP_LAST、requirements.md FR-6)で全量再生成が十分小さいため導入しない(過剰機構の禁止)
