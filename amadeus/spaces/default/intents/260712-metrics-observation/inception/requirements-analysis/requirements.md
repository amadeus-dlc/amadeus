# Requirements — メトリクス定点観測(260712-metrics-observation)

> 上流: Issue #921・ideation 成果物(scope-document 成功基準 S1-S4 / 出力契約モック / 委譲台帳6点)・RE seam 台帳(code-structure.md)。委譲台帳の各論点は、実測証拠・既決ノルムで一意に閉じるものは本書で確定し(E-DC-Q0 前例: 証拠で閉じる)、真に未決の1点のみ選挙(Q1)に委ねる。

## FR-1 — collector セットの確定(委譲1+E-TP-RA 相互参照)

snapshot は以下の collector 群を計測する(すべて RE seam 台帳で経路実在を実測済み):

| collector | 内容 | 経路(RE 実測) |
|---|---|---|
| `ccn` | 関数数・CCN 分布(p50/p90/max)・閾値(15)超過数 | `tests/complexity-gate.ts` の export 群(runLizard :151 ほか — in-process import) |
| `coverage` | line カバレッジ%(hits/lines) | `coverage/coverage-totals.json`(writeCoverageTotalsJson :610) |
| `loc` | .ts ファイル数・総行数(core/scripts/tests 別) | `git ls-files`+静的走査 |
| `tests` | テストファイル数・assertion 数 | **方式は Q1 裁定に従う**(機械可読 seam 不在が RE 確定ギャップ) |
| `test_pyramid` | 層(smoke/unit/integration/e2e)×サイズ(S/M/L)のファイル数分布 | `tests/lib/test-size.ts` の分類器(E-TP-RA Q2=A の相互参照 — 比率観測は本 intent が担う) |
| `dist_size` | dist/ の合計バイト数 | `du` 相当の走査 |

- 受け入れ基準: 各 collector の値が実計測の出力から導出されること(S2 — テストで実行由来を固定)。collector の追加が他 collector に非影響であること(FR-5)。

## FR-2 — 保存形式: 日付付き個別 JSON(委譲2、証拠で確定)

- `metrics/` 配下に `<ISO8601>.json`(UTC、ファイル名衝突回避)として保存し、リポジトリにコミットする。
- 根拠: 追記型単一台帳は cid:shared-ledger-insert-collision の実測クラス(並行 PR の競合点)。個別ファイルは構造的非競合。**留保(E-L62)**: 集計利便のための追記型 index の将来追加は排除しない(バックログ扱い)。
- 受け入れ基準: 連続2回の snapshot が別ファイルとなり競合しないこと。`.gitignore` 対象外であること(coverage/ と混同しない — RE 注意点)。

## FR-3 — トリガー: main マージ時 workflow+手動実行(委譲3、証拠で確定)

- main への push で発火する専用 workflow(`contents: write`)が snapshot を生成・コミットする。release.yml の前例(GITHUB_TOKEN push は他 workflow 非トリガー = CI ループ回避、RE 実測)を踏襲。
- 手動実行(`bun <tool> --write`)は常に可能。cron は採用しない(バックログ B3)。
- 受け入れ基準: (1) workflow のループ非誘発を設計根拠付きで文書化+可能な範囲で実証 (2) 手動実行が workflow と同一契約で動作。

## FR-4 — loud-fail・アトミック書き込み契約(S3、モック正準部分)

- いずれかの collector が失敗したら exit 1・snapshot 非生成(部分/古い値の残置禁止)。失敗 collector 名を出力に明示。`--check`(dry-run)モードを持つ。
- 受け入れ基準: 落ちる実証 — collector 失敗を注入して (a) exit 1 (b) ファイル非生成 (c) 失敗名表示、をテストで固定(修正前 RED 相当の注入テスト)。

## FR-5 — スキーマ: versioned・collector 疎結合・tool_version 記録(委譲5)

- `schema_version` / `captured_at` / `commit` / `collectors.<name>` の平坦構造。各 collector は `tool` と `tool_version` を自己記録(RAID R3 緩和 — 計測器更新による不連続点を機械判別可能に)。
- lcov 集計値は coverage collector に含める(委譲4 = 含める: coverage-totals.json seam が既存で追加コスト極小、台帳の完全性)。
- 受け入れ基準: collector 1個の追加がスキーマ他部に diff を生じないことをテストで固定。

## FR-6 — 配置契約: dist 非コピー面(委譲6の要件面)

- snapshot ツールは dist 同期(C2)の**対象外の面**(RE 実測: `scripts/` または `tests/` — package.ts の対象グロブ外)に置く。正確な配置は design で確定(フレームワーク製品機能ではなく本 repo の観測ツール、という性格を設計根拠に)。
- 受け入れ基準: `dist:check` / `promote:self:check` が snapshot ツール追加の前後で無影響。

## 共通 NFR / 工程要件

- 検証: typecheck / lint / dist:check / promote:self:check / complexity-gate --check 全 exit 0、push 前 local lcov 追加行未カバー0(spawn 盲点は in-process seam を実装時点で設計 — E-L59 列挙チェック込み)、新規テストは E-L76(不在主張の反証 grep)/t213 系の既習様式。
- 逸脱は実装前停止(E-L59-3)、builder ディスパッチに E-L65 定型+c2 隔離規律を明記。
- PR: Bolt ごと・日本語・deslop・closing keyword 規律。Issue #921 のクローズは全 FR 着地+閉包実測後(E-L67-B)。
