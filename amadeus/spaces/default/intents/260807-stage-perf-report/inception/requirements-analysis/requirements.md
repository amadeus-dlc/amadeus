# Requirements: ステージ性能実測レポート CLI(260807-stage-perf-report)

上流入力(consumes 全数): intent-statement(問題定義・成功指標を FR の導出元として消費)、scope-document(In/Out 境界を FR/Out of scope の正本として消費)、business-overview(codekb — 対象システムの現況接地)、architecture(codekb — 監査イベント面・スキーマ二世代・emit 位置の実測を FR-1/FR-2 の仕様根拠として消費)、code-structure(codekb — 配置・投影・テスト層・ゲート面を NFR の仕様根拠として消費)

要求の正本: [Issue #2405](https://github.com/amadeus-dlc/amadeus/issues/2405) 本文 v2(クロスレビュー 2 名の訂正反映済み)。本書はそれを RE(observed `4a3da7d62`)の実測でさらに精密化しテスト可能に固定する。**本書中の件数実測値(222 シャード・131,074 行・1,010 ブロック/691 ファイル・unpaired 35+5・未クローズ AWAITING 7・0 秒窓 394・v1 SUBAGENT_COMPLETED 5,853 等)と `amadeus-subagent-stats.ts` の詳細行引用の全数出典は `codekb/amadeus/re-scans/260807-stage-perf-report.md`(全数列挙の正本)である。**RE で陳腐化が確定した数値(Model 行 2→10、SUBAGENT_COMPLETED 7,151→7,273)は observed 実測値を正とする。

## Intent analysis

モデル世代交代のたびに「Amadeus の性能が出ているか」が体感で判断されている。材料(ステージ所要時間・センサー赤率は監査シャード 222 本・131,074+ 行、§12a イテレーションは record の `## Review — Iteration N` 1,010 ブロック/691 ファイル)は永続化済みなのに、ステージ性能軸の読み手が存在しない(`amadeus-runtime.ts summary` は gitignore 対象 runtime-graph.json 由来で遡及不能・`git ls-files` 0 件、`session-cost` はそのラッパ、`amadeus-subagent-stats.ts` は subagent 軸のみ)。ゴールは「決定的なステージ別性能基準線を単一コマンドで出力し、モデル選定・プロンプト改善の判断を実測駆動にする」こと。所要時間の素の wall-clock は窓の 59〜74% が承認待ち・park・session 断を含み指標として不成立(クロスレビュー実測)だが、**減算方式は除外バケット(FR-2c)を除く大半の窓を保持し弁別的なステージ別ランキングを産出する**(RE D1 実測: 1,532 窓中、減算でゼロ化したのは 30 窓のみ。net median 458s、減算 33.2%。対してフィルタ方式は 74% を捨てて退化)— idle 減算が本 intent の成立条件である。

## Functional requirements

### FR-1 コーパス走査と帰属

- FR-1a: 全 intent の監査シャード(`amadeus/spaces/<space>/intents/*/audit/*.jsonl`)をパス発見で走査する。intent 帰属は**シャードのディレクトリパス由来**とする(`intentId` は v1 の 86,744/96,269 行が `"intents"` に退化 — architecture.md 現在節の実測)
- FR-1b: schemaVersion 1(`event`/`fields`)と 2(`eventName`/`attributes`、`attributes.Event` に v1 名を保持)の**両世代を正規化**して読む(片側のみは 73.4% を取り落とす)。イベント判別は両世代で `Event` 値を用いる
- FR-1c: parse 不能行・読取不能シャードは**無音スキップせず件数を必ず報告**し、読取不能シャードが 1 件以上あれば exit 1(fail-loud — `amadeus-subagent-stats.ts:463-465` 逐語 `return scanned.unreadableShardCount > 0 ? 1 : 0;` と同契約。出典 re-scans 正本)
- 受け入れ基準: 混在スキーマ+破損行入りの fixture corpus で、(i) 両世代の行が集計に載る (ii) 破損行数が出力に現れる (iii) `intentId:"intents"` の行がパス由来 intent へ帰属される (iv) 読取不能シャードを 1 件注入した実行が exit 1 を返す、を独立オラクル(テスト自前のウォーカー — 自己参照比較の禁止)で検証

### FR-2 実作業時間(idle 減算)

- FR-2a: `STAGE_STARTED`→`STAGE_COMPLETED` を intent×stage 内の時系列で対応付けて窓を構成する
- FR-2b: **net(実作業時間)= raw − idle**。idle 区間 = `STAGE_AWAITING_APPROVAL`→(`GATE_APPROVED`|`GATE_REJECTED`)∪ `WORKFLOW_PARKED`→`WORKFLOW_UNPARKED` ∪ `SESSION_ENDED`→(`SESSION_STARTED`|`SESSION_RESUMED`)。区間は窓へクリップし、重複はマージして二重減算しない。raw と net を**併記**する
- FR-2c: 除外バケットの報告義務(統計母集団から除外し、件数を必ず出力): 未対応 START / 起点なし COMPLETED / **未クローズの idle 開始イベント**(対応する閉イベントが intent 内に無い場合、その窓は net 統計から除外して件数報告する — 減算の黙示既定で救済しない)。observed 実測の参照値: unpaired 35+5、未クローズ AWAITING 7
- FR-2d: タイムスタンプは秒粒度(`isoTimestamp` が ms を除去 — `amadeus-lib.ts:7740-7742`)であり、0 秒に潰れた窓(observed 394 件)は分解能外としてレポートに明記する
- 受け入れ基準: (i) idle 3 種いずれかを跨ぐ fixture 窓で net < raw が成立 (ii) 重複 idle 区間で二重減算されない (iii) 未クローズ AWAITING を持つ fixture 窓が net 統計に入らず件数報告される (iv) `GATE_APPROVED` と `STAGE_COMPLETED` が同 try-block 発行(`amadeus-state.ts:3420-3431`)のため idle が窓末尾に接するケースで負値が出ない (v) 0 秒窓(FR-2d)の件数が出力に現れる (vi) 統計母集団 = 全窓 − 除外件数 の一致が出力上で検証できる

### FR-3 §12a レビューイテレーション集計

- FR-3a: データソースは **record 成果物**(監査ではない)。`^## Review — Iteration N` を走査する。マッチは書き手自身の 2 段方式(寛容な見出し走査 `/^## Review(?:[ \t].*)?$/` → 厳密マーカー等値 — `amadeus-reviewer-runtime.ts:660` の契約を鏡映)とし、**接尾辞付き見出し(observed 3 件)は unparseable バケットとして件数報告**する(黙って捨てない)
- FR-3b: ステージ・unit への帰属はファイルパス由来。実在する `construction/{unit-name}/` リテラルディレクトリ(observed 2 ファイル)はそのまま `{unit-name}` バケットとして表示する(捏造補正しない)
- 受け入れ基準: 正常見出し・接尾辞付き見出し・`{unit-name}` パスを含む fixture record で、正常分の iteration 分布+unparseable 件数+リテラルバケットが出力に現れる

### FR-4 センサー FAILED 率

- FR-4a: `SENSOR_FIRED`/`SENSOR_PASSED`/`SENSOR_FAILED` を **`Stage slug` 属性**(ステージライフサイクル系の `Stage` とは別キー — 混同禁止)で集計し、ステージ別 FAILED 率を出す
- 受け入れ基準: fixture で `Stage slug` と `Stage` が異なる値を持つ行を混在させ、センサー集計が前者のみで束ねられることを検証

### FR-5 モデル帰属

- FR-5a: subagent イベントの `Model` / `Model Source` 属性で帰属し、モデル別内訳を出す。**属性を持たない行(v1 の SUBAGENT_COMPLETED 5,853 件は構造的に Model 非保持・conductor は全イベントで不在)は UNKNOWN 区分として fail-closed に可視化**する(ADR-5 — `amadeus-subagent-stats.ts:141-148` のコメント逐語「absence is the record of absence」と同契約。出典 re-scans 正本)
- FR-5b: レポートは「モデル帰属可能な行数 / 全行数」を明示する(observed 参照値: 10/7,273 — forward-looking で蓄積中)
- 受け入れ基準: Model 有り(複数値)・無しの混在 fixture で、モデル別内訳と UNKNOWN 件数の和が全数と一致

### FR-6 出力

- FR-6a: Markdown / CSV の 2 形(scope-document In-Scope 1 の逐語境界。機械可読形 `--json` の追加は出力面の拡大にあたるため本 FR に含めず、OQ-3 として設計段の申告付き裁定へ委譲)。統計は平均・中央値・**p95(nearest-rank、空入力は NaN 伝播 — `tests/lib/percentile.ts` の意味論を鏡映、ファイルは import しない)**
- FR-6b: 出力先頭は measurement ref(走査対象・シャード数・行数・除外件数の総括)。順序は決定的(count-desc, key-asc 等の固定順)
- FR-6c: 出力ヘッダに「net(実作業時間)は idle 減算による推定であり、実作業時間との一致は未検証の仮説である」旨を明記する(A-1 の出力契約化 — 中核指標の妥当性未検証は読み手の意思決定を左右する製品要件)
- 受け入れ基準: (i) 同一 fixture に対する 2 回実行の出力が byte 一致 (ii) 出力先頭にシャード数・行数・除外件数が実在する(ヘッダ欠落は byte 一致でも不合格) (iii) FR-6c の仮説明記文言が出力に実在する

### FR-7 決定性と read-only

- FR-7a: LLM 側カウントゼロ。ファイル書込・audit/state 変更ゼロ(fs write API を import しない — grep 検査可能な不変条件、`scripts/metrics-timeseries.ts:1-8` の既習形)
- FR-7b: exit ladder: 0 = 正常 / 1 = コーパス穴(読取不能シャード等) / 2 = 使用法エラー(parse-don't-validate、未知フラグ拒否)
- 受け入れ基準: (i) 対象ソースへの fs write API import が 0 件であることを検査する自動テストが存在し green(grep/AST いずれか。検査主体はテスト) (ii) 正常コーパス / 読取不能シャード入りコーパス / 未知フラグ の 3 入力に対する exit code がそれぞれ 0 / 1 / 2 であることを実測 assert する

## Non-functional requirements

- NFR-1 性能: observed 全コーパス(222 シャード・131,074 行+record 691 ファイル)の走査+集計+出力を **60 秒以内**(実測ベースの上限 — RE の試作 aggregator は数秒で完走しており十分な余裕。回帰上限として固定)
- NFR-2 テスト配置: 純関数(正規化・窓構成・減算・統計)は `tests/unit/`、実 FS・CLI spawn は `tests/integration/`(size ratchet — `tests/lib/test-size.ts:37-39`)。**twin 分割の既習形 t460/t461 に従い、独立オラクル必須**。新規テスト番号は **t481 以降**(observed 実測: 使用済み最大 t480)
- NFR-3 被覆: in-process seam(`export function main(argv: readonly string[]): number`(:433)+ `import.meta.main` ガード(:468)の既習形。出典 re-scans 正本)で lcov 計測可能にする。patch gate / project gate / complexity / no-silent-drop / cast-guard の現行ブロッキング集合を全て通す
- NFR-4 配布: `packages/framework/core/tools/` 配置で全ハーネスへ coreDirs 投影(`claude/manifest.ts:55-56` / `package.ts:438`)。出荷コメント・文字列に `scripts/` トークンを置かない(t258 boundary guard)
- NFR-5 落ちる実証: 新設検査(除外バケット報告・fail-loud exit)へ失敗ケースを注入して赤の実働を確認してから完成扱いにする

## Constraints

- C-1 命名: `amadeus-observability` 名前空間を使わない(既存の opt-in・fail-open **書き手** seam — 逆契約の同居禁止)
- C-2 既存互換: `amadeus-subagent-stats.ts` の挙動・出力を変更しない(参照・再利用は可)。既存テスト(t460/t461)はグリーン維持 — 本 AC の射程は同ツールの現行契約のみで、新 CLI の追加自体を妨げない
- C-3 正規化層: `amadeus-journal.ts` の exported 正規化(`journalRecordField:130` / `readJournalRecords:534`)の再利用を**第一候補**として設計段で確定する。不採用の場合は理由を ADR に記録する(subagent-stats `:21-23` の依存方向裁定との整合を含む)
- C-4 実装形態(新規 CLI vs `amadeus-subagent-stats.ts` 拡張)と CLI 名は application-design の ADR で確定する(Issue v2 が明示委譲)

## Assumptions

- A-1 **net 時間 ≒ 実作業時間は仮説として明示的に受け入れる**(RE D1: アルゴリズムの実装可能性と非退化出力は実測済み。「正しい作業時間」であることの妥当性検証は本 intent のスコープ外とし、レポート自体に仮説である旨を明記する)
- A-2 Model 属性は #2279 の蓄積により前向きに増える(observed で 2→10 への増加と opus/sonnet の多様性発生を確認済み)
- A-3 監査シャードは append-only であり、同一入力集合に対する再実行は同一出力を返す

## Out of scope

- 記録側の拡張(conductor モデル・ハーネス種別のイベント属性追加)— intent 完了時に別 Issue 起票
- トークン集計(#2010 = telemetry 側)/ 前向き eval 基盤(promptfoo 等)/ intent 難易度差の正規化
- 既存 `{unit-name}` リテラルディレクトリの是正(表示バケットとして扱うのみ)

## Open questions(後続ステージへの委譲)

- OQ-1(→ application-design): C-3/C-4 の設計裁定(正規化層の再利用可否・実装形態・CLI 名)
- OQ-2(→ 実装): レビューイテレーション所在ファイル数のレビュアー間乖離(129 vs 687。RE 再実測は 691)は実装の機械集計値を最終確定とする。確定値が本書・上流の参照値と乖離した場合は build-and-test 成果物に乖離を記録して扱いを確定する(記録のみで可 — 参照値は fixture 契約ではない)
- OQ-3(→ application-design): 機械可読出力 `--json` の追加要否。scope-document の出力列挙(Markdown / CSV)に含まれないため、追加する場合は既習 CLI idiom(`amadeus-subagent-stats.ts` の `--json`)との整合を根拠に ADR で申告のうえ裁定する

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-07T12:04:39Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の M-1〜M-3 / m-1〜m-4 / f-1〜f-2 全 9 指摘の是正を実測確認し READY。7 必須節・上流トレーサビリティ・AC 被覆(FR-7 含む全 FR)・スコープ境界(--json は OQ-3 へ申告委譲)・出典宣言(re-scans 正本)を確認。新規指摘なし。

### Findings

- None
