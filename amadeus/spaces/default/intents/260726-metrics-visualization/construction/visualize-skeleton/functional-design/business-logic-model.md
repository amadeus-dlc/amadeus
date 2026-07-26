# Business Logic Model — U1 visualize-skeleton

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

## 処理フロー(`bun scripts/metrics-visualize.ts --write`)

unit-of-work.md U1 の範囲(R-1+V-1+V-3/V-4/V-6+中核テスト)を、component-methods.md のシグネチャで direct に実装するフロー。services.md のとおり外部サービス接触なし(fs のみ)。

1. **引数解釈**(parseArgs): `--write` のみ受理(U1 時点。`--check` は U2)。他・無引数 → usage を stderr、exit 2
2. **ルート解決**: `AMADEUS_METRICS_ROOT ?? ROOT`(既存規約)→ `<root>/metrics/`
3. **読込**: readdirSync → `.json` filter → sort → assertNonEmpty(空・不在 → stderr+exit 1)
4. **検証**(fail-closed): 各ファイルを readFileSync(try/catch)し、読込例外(permission / dangling symlink 等)は `{kind:"error", file, reason}` へ変換して parseSnapshot の error と同一経路に合流(読込例外の error 変換は兄弟実装2件と同型: metrics-timeseries.ts:207-212 / metrics-retention.ts:40-52。ただしエラー集約の様式は両者で異なり — timeseries main は全件収集して報告、retention は最初の1件で打ち切り — 本 CLI は診断性を優先して timeseries main の全件収集様式を正本とする)。1件でも error → 当該ファイル名+reason を stderr、**書き込みゼロで exit 1**(requirements.md FR-2)。中間 outcome は ParseOutcome をそのまま使い新型は作らない
5. **整列**: buildSeries(captured_at 昇順・commit タイブレーク)
6. **描画**: renderHtml(series) — discoverCollectors で全コレクタ発見 → コレクタごとに renderCollectorSection(unionValueKeys のキーごとに svgLinePath+値表)。数値抽出は numericValue(R-1 新設)経由のみ。文字列埋め込みは escapeHtml 経由のみ
7. **書込**: `<root>/metrics/index.html` へ writeFileSync(生成物ヘッダコメント「generated — do not edit」を含む)
8. **終了**: stdout に出力先・スナップショット件数・生成バイト数を1行、exit 0(生成バイト数は U1-SCALE-03(nfr-requirements)のサイズ余裕記録の実現 — nfr-design レビュー Major-1 を受けた申告付き追記)

## R-1(metrics-timeseries.ts への追加)のロジック

- `formatValue` — 既存実装(:117-119)を export へ昇格。**実装・挙動は不変**(既存消費者 renderDigest/renderCollectorTable への影響ゼロ)
- `numericValue(v: unknown): number | null` — `typeof v === "number" && Number.isFinite(v) ? v : null`。1行の新設純関数

## SVG 座標計算(svgLinePath)

- 入力: `Array<number | null>`(numericValue 適用済み)。null は**セグメント分断**(線を切る — M コマンド再開)
- y スケール: 系列(キー単位)の min/max 線形。min === max の縮退時は中央水平線
- 全 null(全欠測)のキーは「データなし」の表示のみでチャートを描かない
