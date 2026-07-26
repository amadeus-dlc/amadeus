# Constraint Register — metrics 可視化(B1 後続)

上流入力(consumes 全数): intent-statement.md

## 制約一覧

| # | 制約 | 出典 | 影響 |
|---|---|---|---|
| C1 | 外部 runtime 依存の追加禁止(Bun 単独) | project.md Forbidden(配布フレームワークへの runtime dependency 追加禁止)+ intent-statement.md スコープ信号 | チャートは自前 inline SVG。CDN・npm チャートライブラリ不採用 |
| C2 | 生成物を直接編集しない/正本から生成 | project.md Code Style | `metrics/index.html` は生成物 — 正本は生成スクリプト。手編集禁止をヘッダコメントで明示 |
| C3 | 既存 metrics 台帳の読み取り専用消費 | 260712 raid-log A2(観測は読み取り専用の消費) | 可視化は snapshot writer/retention に一切書き込み変更を加えない |
| C4 | パーサの単一正本 | metrics-retention.ts:9(writer/reader/pruner が parseSnapshot を共有) | HTML 生成も `scripts/metrics-timeseries.ts` の parseSnapshot を import し私設パーサを作らない |
| C5 | CI 同乗は loud-fail・ci-success 集約外の非対称を維持 | 260712 business-rules #3 | HTML 生成失敗は job 赤(main run 失敗として可視)。PR blocking 集約へは載せない |
| C6 | データ量上限 = retention 定数 360件 | metrics-retention.ts:25(METRICS_RETENTION_KEEP_LAST) | 埋め込み JSON は最大約580KB。定数変更時は HTML サイズ連動(将来リスクとして raid-log R1) |
| C7 | Codecov との非重複 | 260712 build-vs-buy 既決 | 本件はリポジトリ内台帳の横断表示 — Codecov のカバレッジ時系列サービスを置換・複製しない |
| C8 | markdown 成果物は日本語、コード・コミットは英語 | CLAUDE.md 言語規約 | 生成 HTML の表示文言は閲覧者=ユーザー向けに日本語可、コード内コメントは英語 |

## 制約間の整合

C1(依存ゼロ)と C6(最大580KB 埋め込み)は両立する — self-contained 方針はデータ埋め込みを前提とし、retention が上限を保証する。C4(パーサ共有)は C3(読み取り専用)の実装手段でもあり矛盾しない。
