# Components — 260807-stage-perf-report

上流入力(consumes 全数): requirements(FR-1〜FR-7 を各コンポーネントの責務境界として消費)、architecture(codekb — イベント面・emit 位置・スキーマ実測を C1/C2 の仕様根拠として消費)、component-inventory(codekb — 既存 tool との責務重複確認に消費)

対象は単一ファイル `packages/framework/core/tools/amadeus-stage-stats.ts`(ADR-1/ADR-3)内のモジュール分割。規模見積り: 合計 **約 700〜900 行**(subagent-stats 468 行の実測+責務数比からの按分。純関数群 500-600 / FS+CLI 200-300)。

## C1 CorpusScanner(FS 層)

- 責務: `amadeus/spaces/<space>/intents/*/audit/*.jsonl` のパス発見と `readJournalRecords`(amadeus-journal.ts:534、ADR-2)による正規化読取。intent 帰属は **`scanCorpus(spaceRoot)` の spaceRoot 相対パス `intents/<intent>/audit/*.jsonl` の第 2 セグメント(`<intent>`)** から導出して各レコードへ付与(FR-1a — 基準点は spaceRoot 相対で統一し、絶対パスの要素インデックスには依存しない)。読取不能シャード・parse 不能行のカウント(FR-1c)
- 依存: `amadeus-journal.ts` のみ(ADR-2 の依存方向)

## C2 WindowBuilder(純関数)

- 責務: intent×stage の時系列で `STAGE_STARTED`→`STAGE_COMPLETED` を対応付けて窓を構成(FR-2a)。unmatched-start / orphan-complete を除外バケットへ(ADR-6)
- 入力: 正規化済みレコード列。出力: 窓列+バケット計数

## C3 IdleSubtractor(純関数)

- 責務: idle 3 種(AWAITING→APPROVED|REJECTED / PARKED→UNPARKED / SESSION_ENDED→STARTED|RESUMED)の区間構成 → 窓へクリップ → 重複マージ → net = raw − idle(FR-2b)。未クローズ idle 開始を持つ窓は unclosed-idle バケットへ(FR-2c)。負値ガード(FR-2 AC iv)
- 注意: `GATE_APPROVED`/`STAGE_COMPLETED` は同 try-block 発行(amadeus-state.ts:3420-3431)— idle が窓末尾に接する形を正常系として扱う

## C4 ReviewBlockCollector(FS 層+純関数パーサ)

- 責務: record 配下の `^## Review — Iteration N` を 2 段マッチ(寛容走査→厳密等値、amadeus-reviewer-runtime.ts:660 鏡映 — requirements.md FR-3a からの継承引用、実装時に実在再検証)で収集(FR-3a)。接尾辞付きは unparseable-review-heading バケット。ステージ/unit 帰属はパス由来(`{unit-name}` リテラルはそのまま表示 — FR-3b)

## C5 SensorTallier(純関数)

- 責務: `SENSOR_FIRED/PASSED/FAILED` を **`Stage slug`** 属性で束ね FAILED 率を算出(FR-4a)。`Stage` キーとの混同禁止を型で分離

## C6 ModelAttributor(純関数)

- 責務: subagent イベントの `Model`/`Model Source` によるモデル別内訳+UNKNOWN 区分(FR-5a、ADR-5 契約鏡映)。帰属可能数/全数の明示(FR-5b)

## C7 StatsComposer(純関数)

- 責務: mean / median / p95(nearest-rank 鏡映、空→NaN 伝播 — ADR-5)。母集団 = 全窓 − 除外件数の恒等(FR-2 AC vi)

## C8 Renderer(純関数)

- 責務: Markdown / CSV / `--json`(ADR-4)。measurement-ref-first+除外バケット全件数(ADR-6)+仮説明記文言(FR-6c)。決定的順序(count-desc, key-asc)

## C9 CliShell

- 責務: `parseArgs`(parse-don't-validate、未知フラグ→exit 2)、exit ladder 0/1/2(FR-7b)、`export function main(argv)` + `import.meta.main`(NFR-3)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T15:22:59Z
- **Iteration:** 1
- **Scope decision:** none

設計は requirements.md の全 FR/NFR/C/OQ に概ね忠実で ADR 裁定は事実に接地し健全だが、decisions.md がステージ義務の Reversibility assessment を全 ADR で欠落させ、ADR-6 の代替案数も inception.md の最低2件ルールを満たさない — この2点はステージ・フェーズの明示契約違反であり是正が必要。

### Findings

- BLOCKER | decisions.md:1-46 — 全6 ADR(ADR-1〜ADR-6)のいずれにも「Reversibility assessment(easy to change vs. locked in)」が存在しない。application-design.md Step 5 の decisions.md 節は Context/Decision/Consequences/Alternatives に加え Reversibility assessment を明示要求している(reversib/ロックイン/元に戻 の語彙は decisions.md 全文で 0 hit)。ステージの明示的な produces 契約違反。
- BLOCKER | decisions.md:40-45 — ADR-6 の Alternatives Rejected に代替案が1件のみ。inception.md フェーズガードレールは「検討した代替案を最低2つ文書化する」を義務化しており、他の5 ADR は2代替案を満たすのに ADR-6 のみ不足。単一選択肢の正当化宣言(なぜ他に選択肢がないか)もないため、どちらの充足経路も満たしていない。
- FOLLOW-UP | components.md:9 — C1 CorpusScanner の「intent 帰属をパス第5要素から導出」が component-methods.md:9 の scanCorpus(spaceRoot: string) と整合するか不明瞭 — 相対/絶対の基準点と要素インデックスを明示すべき。
- FOLLOW-UP | component-methods.md:7-48 — 各メソッドの Error handling approach(例外/バケット振り分け/Result 型)の明示がない — ADR-6 の除外バケット機構が事実上の戦略だが component-methods.md 側で per-method に明示されていない。
- FOLLOW-UP | component-dependency.md:19-25 — Communication patterns(sync/async)と Shared resource identification の明文化がない(同期インプロセス・共有可変状態なしは読み取れるが明文化推奨)。
- FOLLOW-UP | components.md:24 — amadeus-reviewer-runtime.ts:660 の二段マッチ契約引用は許可読み取りパス外で実在性未検証(requirements.md からの継承引用のため優先度低)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T15:27:32Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER 2件は閉包 — 全6 ADR に Reversibility 行が実在(:11,:19,:27,:35,:43,:51)し、ADR-6 の代替案は2件となり inception.md の最低2件ルールを満たす。FOLLOW-UP 4件も是正済みで新たな矛盾なし、requirements.md の FR-1a/FR-2c/FR-3a との照合でも齟齬なし。

### Findings

- None
