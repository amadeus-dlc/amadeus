# Feasibility Assessment — metrics 可視化(B1 後続)

上流入力(consumes 全数): intent-statement.md

## 判定: GO(実現可能・低リスク)

intent-statement.md の成功基準(1画面トレンド把握・閾値強調・SHA トレーサビリティ)は、既存資産の再利用+静的 HTML 生成で全て充足可能と判定する。以下すべて本セッションの実測(測定 ref: main HEAD 1c43438df、2026-07-26T04:57Z 時点の作業ツリー)。

## 実測エビデンス

### データ面(全数プローブ)

- `metrics/*.json` **123件全件が parse 成功・失敗0件**(2026-07-12〜2026-07-25)
- schema_version は **1 のみ**、コレクタ集合は **全件同一**(ccn, coverage, dist_size, loc, test_pyramid, tests)— スキーマドリフトなし
- 総量 **197,450 bytes**(約193KB)— HTML への全件インライン埋め込みが余裕で成立

### 既存資産(reuse inventory)

| 資産 | 所在 | 再利用内容 |
|---|---|---|
| 検証済みパーサ | `scripts/metrics-timeseries.ts`(parseSnapshot、Snapshot 型) | HTML 生成の入力検証に共用 — writer/reader/pruner が既に同一パーサを共有する設計(metrics-retention.ts:9 コメント実測)に読み手として合流 |
| スナップショット writer | `scripts/metrics-snapshot.ts` | 変更不要(読み取りのみの消費) |
| retention | `scripts/metrics-retention.ts` — METRICS_RETENTION_KEEP_LAST=360(:25) | データ量上限の保証: 360件 × 約1.6KB ≈ 580KB が埋め込み上限 |
| CI 同乗先 | `.github/workflows/ci.yml:398-449` metrics-snapshot job(`--write` :446 → retention `--apply` :449) | 同 job 末尾に HTML 再生成ステップを追加(Q2=C 裁定の CI 面) |
| env seam | `AMADEUS_METRICS_ROOT`(writer/reader/pruner 共有) | テストの repo 外 scratch 実行に同 seam を使用 |

### 技術面

- self-contained HTML(inline SVG + inline JSON データ)は Bun 標準機能のみで生成可能 — **外部 runtime 依存の追加ゼロ**(project ノルム充足)
- 閲覧はローカル `file://` で完結 — サーバ・ビルドチェーン不要

## 前提とフラグ(保守的見積り)

- 埋め込みデータ量の将来上限は retention 定数(360件)に依存する — 定数変更時は HTML サイズも連動する(制約として constraint-register に記録)
- CI 同乗は既存 job の **loud-fail 契約・ci-success 集約外の非対称**(260712 設計)を変えない前提 — HTML 生成失敗も同契約に従い loud-fail(詳細設計は construction で確定)
- グラフ描画は依存追加なしの自前 SVG を前提とする(Chart.js 等の CDN は self-contained 方針と CSP 慣行に反するため不採用)
