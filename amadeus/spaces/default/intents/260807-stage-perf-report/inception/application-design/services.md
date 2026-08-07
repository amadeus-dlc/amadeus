# Services — 260807-stage-perf-report

上流入力(consumes 全数): requirements(FR-6/FR-7 の出力・決定性契約をサービス面の仕様として消費)、architecture(codekb — 読み手生態と retrospective-blind の実測を利用文脈の根拠として消費)、component-inventory(codekb — 既存 CLI 面との並び確認に消費)

## 常駐サービスの不在宣言

本 intent に常駐サービスは無い(CLI/ライブラリの NFR は決定的なファイル境界と fail-closed 契約へ置換 — cid:nfr-design:c1 の既決方針)。cache / horizontal scaling / circuit breaker 等の常駐系パターンは機械適用しない。提供面は次の 1 つ:

## S1 stage-stats CLI(単発実行・read-only)

- 起動: `bun <harness-dir>/tools/amadeus-stage-stats.ts [--project-dir <path>] [--space <name>] [--format markdown|csv|json]`(既定 markdown。`--json` は `--format json` の shorthand として受理 — ADR-4)
- 入力: 監査シャード(全 intent)+record の Review ブロック。すべて読取のみ(fs write API import 0 — FR-7a)
- 出力: stdout のみ。measurement ref → 除外バケット全件数 → 仮説明記 → ステージ別統計 → センサー赤率 → モデル帰属
- 終了: 0 = 正常 / 1 = コーパス穴 / 2 = 使用法エラー
- 利用文脈: (i) モデル世代交代時の基準線比較(遡及) (ii) promptfoo 等の前向き eval の baseline 供給(後続 initiative) (iii) 週次ローリング PM の材料
