# Requirements — 260719-goa-multiseg-ecode(Issue #1226)

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md

> 測定 ref: 本書の file:line・件数は observed HEAD `a326f47bc`(RE 鮮度ポインタと同一)での実測。一次資料は `amadeus/spaces/default/codekb/amadeus/re-scans/260719-goa-multiseg-ecode.md`。

## 1. Intent 分析

[Issue #1226](https://github.com/amadeus-dlc/amadeus/issues/1226)(bug / P2 / S3-MAJOR、クロスレビュー2名成立: e1 実在確認+e2 所見)の修正。`parseGoaLine`(`packages/framework/core/tools/amadeus-norm-metrics.ts:688`)の受理 regex `GOA_HEAD_RE`(:157)が単節 E-code(`E-[A-Z0-9]+`)のみを受理し、team.md に実在する GoA 行の一意 E-code 9種中8種(ハイフン複節形 `E-TPR-RE` 等)を「not a GoA line」として head 段で拒否する。週次蒸留の GoA 集計基盤(FR-3 Phase B スキーマ)が corpus の大半を無音で読めない状態を解消し、将来の GoA-variance 集計の正しさを担保する。

ゴールは機能追加ではなく**文書化済み仕様への回復**である: スキーマコメント(:155-156)と ADR-4 が意図する「norm 選挙の GoA persist 行を parse する」契約に対し、実 corpus の E-code 語彙(複節形が多数派)が受理域から漏れている(format-currency-grep-for-parser-intents の実例 — 導入 PR #1112 の requirements 段で corpus 様式の grep 実測を欠いた設計時欠陥。導入経緯: intent 260716-metrics-timeseries 系 weekly-distillation、コミット `b48f89bf0`)。

## 2. 現状の実測(RE 確定事実)

- `GOA_HEAD_RE = /^GoA\[(E-[A-Z0-9]+)\]:\s*(.+)$/`(:157)— ハイフン非許容。in-process 実測: `E-PM9` 受理 / `E-TPR-RE`・`E-SMF-BT` 拒否。
- team.md の一意 E-code 9種の照合: 受理1(`E-PM9`)/ 拒否8(`E-APG-CG13` `E-MTR-CG` `E-SDE-CG4` `E-SDE-FD` `E-SDE-NR` `E-SMF-AD13` `E-SMF-ND` `E-TPR-RE`)。
- **head 拡張は必要条件だが不十分**: team.md 実 GoA 行9行は全てサブ問別スパース表記(`c1 1x2 2x1 / c2 …`)で、hyphen 許容を模擬適用しても bin 段(:692 `tokens.length !== 8`)で fail(実測 pass 0 / headFail 8 / binFail 1)。
- 蒸留(`distillCandidates`/`collectMetrics`)は `parseGoaLine` を内部消費していない(grep 0件、:544 `NOT COLLECTED`、ヘッダ :38-44「aggregation is future」)— 被害は現状 latent。
- live consumer は `scripts/amadeus-election.ts:413 checkGoaLine` のみ。選挙 CLI の `renderGoaLine`(`scripts/amadeus-election-record.ts:77`)は圧縮単節+canonical 8-bin を書くため現行選挙経路は本バグを踏まない(`GoaLineCode` :34 の単節制約 = 既知 workaround、:31 コメントに #1226 明記)。
- 同根: `PM_CID_RE`(:161)の `round=(E-[A-Z0-9]+)` も同一制約。複節 round 値の corpus 実在は0件(潜在)。
- テスト面: `tests/unit/t-norm-metrics.test.ts:582-597`(PR #1112 固定)、`tests/unit/t238-election-record.test.ts:104` が現行バグ挙動をピン留め(修正で反転必須)。norm-metrics 層に複節 E-code の正テストは不在(grep 反証確認済み)。
- 配布面: 正本+dist 6ツリー+self-install 4ツリー = 計11コピー(`git ls-files "*amadeus-norm-metrics.ts"`=11)。編集は正本のみ、`bun scripts/package.ts`+`bun run promote:self` で同期(code-structure.md の core 中立層/dist 投影の既存境界、architecture.md の配布境界に従う)。

## 3. 機能要件

- **FR-1(head 受理域)**: `GOA_HEAD_RE` はハイフン複節 E-code(`E-[A-Z0-9]+(-[A-Z0-9]+)*` 形)を受理し、`parseGoaLine` が `ecode` に元文字列を無変換で返すこと。受け入れ基準: team.md 実在の全9種 E-code が head 段を通過する(canonical 8-bin ボディで in-process 実測)。既存受理形(`E-PM9` 等)の後方互換は維持(受理拡大のみ)。
- **FR-2(parse 契約スコープ)**: 【裁定待ち — Q1】スパースサブ問表記の扱い(受理拡張 / 明文化スコープ外+別 Issue / 明文化のみ)は選挙裁定で確定する。
- **FR-3(同根 PM_CID_RE)**: 【裁定待ち — Q2】`round=` の対称是正の本 intent 内実施可否は選挙裁定で確定する。
- **FR-4(テスト)**: (a) t238:104 の現行バグ挙動ピン留めは修正後の正挙動へ反転する (b) norm-metrics 層に複節 E-code の parseGoaLine 回帰テストを新設する(Testing Posture: bugfix はリグレッションテストを第一級成果物とする) (c) 起票時再現(`GoA[E-TPR-RE]: …` → ok:false)の verbatim 再適用で閉包を実証する(fix-review-replays-origin-repro)。
- **FR-5(GoaLineCode 連動)**: 【裁定待ち — Q3】選挙 CLI 側 `GoaLineCode`/圧縮 workaround の扱い(拡張撤去 / 単節維持+非対称明文化 / 別 Issue)は選挙裁定で確定する。
- **FR-6(スキーマコメント同期)**: `:155-156` のスキーマコメント(ADR-4 記法)を確定後の受理契約と一致させる。

## 4. 非機能要件

- **NFR-1(never-estimates 維持)**: parse 失敗時の fail-closed 挙動(`ok:false`+理由文字列)は不変。受理拡大が既存の 5-class 検証順序・エラー文言の契約を壊さないこと(既存 t-norm-metrics テストのグリーン維持)。
- **NFR-2(配布同期)**: 正本編集後に dist 6+self-install 4 の全11コピーが `dist:check`/`promote:self:check` で機械一致すること。
- **NFR-3(CI ゲート)**: `bun run typecheck`、`bun run lint`、`bash tests/run-tests.sh --ci`、push 前ローカル lcov で diff 追加行未カバー0(local-lcov-pre-push)。カバレッジは in-process seam(parseGoaLine は export 済み)で担保 — spawn 盲点なし。

## 5. 制約

- 修正面は amadeus-norm-metrics.ts 系(正本+生成コピー+テスト)のみ(leader ディスパッチ 14:28Z)。e3 の #1248 intent と並行 — ファイル交差が生じたら即報告・着手保留(c6 非交差判定)。Q3 裁定が A(scripts/ 面へ拡張)の場合は制約逸脱にあたるため、裁定受領後に leader へ面変更を明示報告してから着手する。
- Bolt は main へスカッシュマージ、PR は人間承認後に leader が執行(no-AI-merge)。
- バージョン・バッジ・リリースノートには触れない(release.yml 一本)。

## 6. 前提

- 週次蒸留の GoA 集計は将来実装(:38-44)であり、本 intent は parse スキーマの正しさまでを担保する(集計ロジックの新設はスコープ外)。
- 選挙 CLI(scripts/)は配布外のチーム内ツール(W-04、election-ts-foundation 裁定)— Q3 の裁定次第で touch する場合も配布面同期は不要。

## 7. スコープ外

- 蒸留 GoA 集計(aggregation)の実装。
- team.md 既存 GoA 行の書式是正キャンペーン(norm PR の書式変更は本 intent の対象外 — Q1 裁定が受理拡張側でも、過去行の書き換えは行わない)。
- リリース・バージョン操作。

## 8. 未決事項(選挙裁定待ち)

- Q1: parse 契約スコープ(head 拡張のみ / スパース受理 / 明文化+Issue / 見送り)
- Q2: PM_CID_RE round= の同時是正可否
- Q3: t238:104 / GoaLineCode の連動範囲

裁定は requirements-analysis-questions.md の [Answer] へ記入後、FR-2/FR-3/FR-5 を確定文へ更新する。
