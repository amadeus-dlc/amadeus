# Component Methods — grilling frontier 再同期

**Intent**: 260810-grilling-frontier-resync / **Stage**: application-design (2.6)

上流入力(consumes 全数): `requirements.md`(FR-CONTRACT-4 のセンサー3態と FR-PROTO-8 の遮断器数値を本書のシグネチャへ写像)、codekb `architecture.md`(センサーの verdict 配送規約 — exit 0 + audit 行 — に従うことの確認)、codekb `component-inventory.md`(現行 `QUESTION_BUDGETS` / `DEPTH_LEVELS` / cutoff の実シンボル名の出典)。

## C3: amadeus-sensor-question-budget.ts の変更メソッド面

コード実体を持つのは C3 のみ(C1/C2/C5/C6 は markdown、C4 はテスト)。既存構造(単一ファイル・純関数+CLI handler)に従い、新設は最小の判定関数2つ。

| シンボル(案) | シグネチャ | 目的 | エラー処理 |
|---|---|---|---|
| `detectGrillingMarker(lines: string[])` | `→ { grilling: boolean }` | ファイル先頭領域の1行マーカー(ADR-2 様式)の有無を判定。parse 失敗は「マーカーなし」ではなく loud finding(fail-open 禁止) | 不正様式マーカー(タグはあるが版・属性が異形)→ finding として報告 |
| `checkGrillingJustification(lines: string[], depth: string \| null, count: number)` | `→ Finding[]` | マーカー付きファイルの検査: 質問数が depth 数値上限を超えるとき、超過記録行(§8 接続の recorded-justification 行)と刈りノード列挙節(空明示可)の存在を検査。欠落 = FAIL finding | 超過記録の様式は C1 が定義する固定行形を verbatim 照合(語彙衝突回避のため Answer 行様式と非交差のトークンを使う — vocabulary-collision-vacuity-guard) |
| 既存 `QUESTION_BUDGETS` 参照部の分岐追加 | — | `depth` が3値外かつ非 null のとき `pass:true, reason:"no-depth"` の無音通過を「`unknown-depth` の warning finding(pass は維持 — advisory 契約)」へ変更 | 数値 parse は既存どおり(verification-numeric-parse 準拠) |

- 入出力: 既存契約を維持 — exit 0 固定、verdict は JSON stdout+audit の SENSOR_PASSED/FAILED 行(exit code で判定しない現行流儀)。
- 遮断器の数値(目安×3)は C1 の overlay が定義し、C3 は消費しない(遮断器はセッション実行時の会話規律 — センサーは事後の questions ファイル検査で「超過したのに記録がない」を捕捉する分担。component-dependency.md のデータフロー参照)。

## C4: テストの検査面(メソッドではなく assert 面)

| テスト面 | assert 対象 |
|---|---|
| t415 改訂分 | C1 の新終了条件文言・枝刈り表見出し・遮断器規定の逐語 toContain / 旧 D6 文言・`hybrid termination` の not.toContain / `VALID_DEPTH_VALUES` 3値(amadeus-directive.ts 実読) |
| センサーテスト新設分(t530 予約帯) | detectGrillingMarker / checkGrillingJustification の3態(PASS / FAIL / unknown-depth warning)を in-process seam で駆動(bun-coverage-spawn-blindspot 回避) |

## C1/C2/C5 の「インターフェース」(文書契約)

- C1 骨格抽出契約: begin/end マーカー(ADR-1)間のテキストが上流ピン原文と byte 同一 — 抽出は `sed -n '/BEGIN/,/END/p'` 級の機械操作で可能な形。
- C1 超過記録行の契約: questions ファイルへ書く1行様式(固定プレフィクス+depth+時点の質問数)。C3 が verbatim 照合する唯一の正本。
- C5 レベル引数契約: `Minimal | Standard | Comprehensive | Free`(無指定 = Free)。depth の wire 語彙とは別空間であることを SKILL.md に明記。
