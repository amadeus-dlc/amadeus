# Components — metrics 可視化(B1 後続)

上流入力(consumes 全数): requirements.md, architecture.md, component-inventory.md, team-practices.md

## コンポーネント一覧

requirements.md FR-1〜FR-8 を、codekb architecture.md の挿入点裁定(案2 = 新規スクリプト)と component-inventory.md の既存 M-1〜M-6 の上に展開する。team-practices.md の対応表(既存 practices 全面カバー)に従い新規機構は最小。

| ID | コンポーネント | 所在 | 新規/変更 | 責務 |
|---|---|---|---|---|
| V-1 | visualize CLI | `scripts/metrics-visualize.ts` | 新規 | `--write`/`--check` の引数解釈、fs 境界(読み: metrics/*.json、書き: metrics/index.html)、exit code 契約(FR-1)。既存 seam 呼び出しによるデータ集約(FR-2)も main 内直列フローとして持つ(独立コンポーネント化しない — レビュー Major-2 是正) |
| V-3 | HTML レンダラ | 同上(純関数群) | 新規 | self-contained HTML 生成(inline CSS/SVG)、テンプレートリテラル直書き様式(FR-3)、escapeHtml(V-6) |
| V-4 | SVG チャートビルダ | 同上(純関数群) | 新規 | コレクタ×キーごとの折れ線 SVG(path 座標計算)。非有限値・非 number は欠測点スキップ(FR-3) |
| V-5 | 劣化強調判定 | 同上(純関数) | 新規 | FR-4 S2 の悪化方向列挙(over_threshold↑/max↑/percent↓/failed*≠0/bytes↑)を判定し CSS class を付与 |
| V-6 | escapeHtml | 同上(純関数) | 新規 | HTML エスケープ(&<>"' の5文字)。ADR-4 参照 |
| V-7 | サイズガード | 同上(定数+判定) | 新規 | MAX_HTML_BYTES 超過で zero-write exit 1(FR-6、ADR-3) |
| R-1 | reader seam 拡張 | `scripts/metrics-timeseries.ts` | 変更(export 追加のみ) | `formatValue` の export 昇格+`numericValue(v: unknown): number \| null` 新設(ADR-2)。AC-1c 契約(fs write import 禁止)は不変 |
| C-1 | CI ステップ | `.github/workflows/ci.yml` | 変更(+3行程度) | retention `--apply`(:449)後・commit(:457)前に `--write` を挿入(FR-5) |
| T-1 | unit テスト | `tests/unit/t2XX-metrics-visualize.test.ts` | 新規 | V-3〜V-7 の純関数検証+AC-7 契約 grep(番号は実装時に空き番号を予約) |
| T-2 | integration テスト | `tests/integration/t2XX-metrics-visualize.integration.test.ts` | 新規 | CLI+fs 境界、AMADEUS_METRICS_ROOT seam、落ちる実証4種+drift(FR-7) |
| D-1 | ドキュメント | `docs/`(日英ペア) | 新規 | metrics サブシステム1ページ(可視化主体)(FR-8) |

## 変更しないもの(境界の明示)

- `scripts/metrics-snapshot.ts` — 一切不変(scope Out「writer の変更」。16_384 のミラー定数は ADR-3 の実駆動テストでピン)
- `scripts/metrics-retention.ts` — 一切不変(`METRICS_RETENTION_KEEP_LAST` の import のみ — 既存 export の読み取り)
- `packages/framework/` / `dist/` — 非対象(repo ローカル層 `scripts/` のみ。dist 投影なし — codekb architecture.md の層区分)

## 規模の正当化(数値必須 — inception.md)

| 対象 | 見積り(行) | 根拠 |
|---|---|---|
| scripts/metrics-visualize.ts | 280〜360 | 兄弟 timeseries 236行+SVG/強調/サイズガード分。writeCoverageHtml(42行)の HTML 直書き様式を参照 |
| metrics-timeseries.ts 追加 | +10〜15 | export 昇格1+numericValue 新設(数行)+コメント |
| ci.yml | +3〜4 | 1ステップ(name+run) |
| tests(T-1+T-2) | 250〜350 | t230 系(unit 142+integration 92)と同規模+落ちる実証の追加分 |
| docs(日英2ファイル) | 60〜100 ×2 | 既存 docs 1ページ相当 |
| 合計 | 約 600〜830 | 単一 Unit で扱える凝集規模(バジェット超過なし) |

## Reuse Inventory(再利用棚卸し — inception.md 必須)

- 再利用(新設しない): parseSnapshot / buildSeries / discoverCollectors / unionValueKeys / assertNonEmpty / Snapshot 型(resolveCollector は CLI がコレクタ選択引数を持たないため対象外 — レビュー Minor-1 是正)(metrics-timeseries.ts、component-inventory.md M-2)、AMADEUS_METRICS_ROOT env seam(M-1)、CI metrics-snapshot job(M-4)、テスト様式 t230/t231(M-6)、HTML 直書き様式(M-5 writeCoverageHtml — 様式参照のみ、コード共有はしない: ADR-4)
- 新設(既存で代替不能な根拠): SVG チャートビルダ(repo に先例なし — codekb 実測でチャートライブラリ・SVG 生成の前例0件)、劣化強調判定(同)、サイズガード(同)
