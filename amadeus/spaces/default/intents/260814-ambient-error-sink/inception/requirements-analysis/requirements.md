# Requirements — 260814-ambient-error-sink(Issue #3004)

## Upstream inputs

- 消費 artifact: `amadeus/spaces/default/codekb/amadeus/architecture.md`(本 intent の節: in-process 入口と emit 集約点の ambient 逸出面の全数、CLI/in-process を区別する型・分岐の不在)、`amadeus/spaces/default/codekb/amadeus/code-structure.md`(本 intent の節: 回帰テストのシーム、integration 層制約)。code-quality-assessment.md の本 intent 節(t214/t258 契約の制約7条・複雑度ラチェット・既着地行)も本文の事実源として消費する。
- `amadeus/spaces/default/codekb/amadeus/business-overview.md` は本 intent の RE で「レビュー済み・無変更」の面であり、一般文脈のみの前提として消費する(cid:requirements-analysis:c4-consume-header-is-not-citable-content)。
- 一次入力: Issue #3004 改訂済み本文、クロスレビュー xrev-260814-3004(2名 CONFIRMED_WITH_REFINEMENTS、収束 ESTABLISHED_WITH_REFINEMENTS)、RE 差分スキャン(`re-scans/260814-ambient-error-sink.md`、observed `6e94189de` = origin/main)。

## Intent analysis

in-process 入口で `projectDir` が未宣言(undefined)のままエラーが emit されると、`recordEngineError` ほか計22面の `resolveProjectDir(projectDir)` 直接解決が ambient(env → cwd 祖先 marker → …の5段)へフォールバックし、実 intent record の監査シャード・state・hooks-health へ書き込みうる(xrev 2名が scratch で再現、既着地行を実測)。根本欠落は「CLI(main = ambient が正当)と in-process(ambient は誤り)を区別する型も分岐も存在しない」こと。裁定済みの方式(Q1=A): main が dispatch 前に解決し、in-process 入口は未宣言を fail-closed に拒否する。#839 契約(t214 が固定する `recordEngineError` の env/argv 段と state 不在 no-op)は不変。

## Functional requirements

### FR-1: main の dispatch 前解決
`main()` の4 dispatch 呼出(`handleNext:6808` / `handleReport:6811` / `handleFailureRuling:6814` / `handlePark:6817` 相当)で、argv 由来 `projectDir` を `resolveProjectDir(projectDir)` で解決してから渡す。CLI の観測可能な挙動(ambient 解決の結果・順序)は不変。
受け入れ基準: t214 T5(`runEngineMain` 経由)と既存 CLI 系テストが green。`main` の CCN が複雑度ラチェット閾値内(式置換のみで +0)。

### FR-2: in-process 入口の fail-closed 拒否
export 済み3入口(`handleNext` / `handleReport` / `handleFailureRuling`)の冒頭で `projectDir === undefined` を検出し、ambient に一切触れない拒否 directive(`emitStateNeutralError` 形 = `recordError=false` の error directive)で early return する。`handleNext` は複雑度ラチェット(CCN 22 = 記録上限)のため既存様式どおり `refuseBlockedNextEnvironment` 等の既存ガードへ畳み込み、本体の分岐数を増やさない。拒否メッセージは projectDir の明示を要求する新規文言(既存文言なし — RE 不在確認済み)。
受け入れ基準: 修正後、undefined 呼出で (a) 拒否 directive(kind:error)が返る (b) ambient 側 fixture の監査シャードが空 (c) 実 record への書込ゼロ。

### FR-3: handlePark の型による表現不能化
非 export の `handlePark` はシグネチャを `projectDir: string` へ狭め、undefined を型で表現不能にする(Q2=A。ランタイムガードは置かない — 非到達コードの防御分岐は検証劇場)。
受け入れ基準: `bun run typecheck` exit 0(main の事前解決後は型が合う)。

### FR-4: TDD — env 段 undefined 形の回帰テスト(t258 直系)
`tests/integration/` に新設: ambient fixture へ `CLAUDE_PROJECT_DIR` を向け、argv 中和・OTel リセットの上で `handleReport(["--result","__not_a_verdict__"], undefined)` を駆動。修正前に赤(ambient fixture の shard 1件)を実測してから修正で green(shard 空+拒否 directive)にする(red → green、注入→赤→revert の1セット)。`handleNext` / `handleFailureRuling` の undefined 形も同ファイルで固定する。
受け入れ基準: 修正前の赤の実測ログ(shard 件数)が code-generation 成果物に記録され、修正後 green。

### FR-5: marker 段 undefined 形の回帰テスト
t481 の idiom(marker fixture = `<root>/amadeus/` + `<root>/.claude/tools/`、`realpathSync`、`process.chdir` の save/restore を afterEach 配置)で、env 未設定・cwd=marker fixture の undefined 呼出が fixture へも実 record へも書かないことを固定する。
受け入れ基準: 新テスト green、テスト自身の実 record 汚染ゼロ(前後 md5 照合)。

### FR-6: 既存契約の不変(#839 / #1389)
t214(dist 経由 import のため `bun run build` 後に実行)と t258 が無変更のまま green。explicit 形の挙動(着地先・行数・shard 名・error message)はバイト単位で不変。
受け入れ基準: `bun run build` → t214/t258 単独実行 exit 0、フルスイート(`bash tests/run-tests.sh --ci`)exit 0、`bun run typecheck` / `bun run lint` exit 0(conductor がフルスイートを1回通す)。

### FR-7: PR と収束
Bolt PR を作成し pr-convergence を回す(CI green・未解決スレッド0・mergeState CLEAN)。マージは人間専権。
受け入れ基準: converged レポート発行、収束3条件の実測。

## Non-functional requirements

- **監査・state 純度**: in-process 駆動が実 record の監査シャード・state・hooks-health へ書き込む経路が、undefined 形について構造的に消滅する(規律依存でなく fail-closed)。
- **CLI 互換**: `main` 経由の全経路の観測可能な挙動は不変(#839 契約、t214 T1/T2/T3/T5)。

## Constraints

- `recordEngineError` の署名・挙動は不変(t214 T1/T2/T3 が肯定固定。`runEngineMain` の catch が依存)。
- `handleNext` 本体の CCN を増やさない(ラチェット上限 22)。新規ヘルパは CCN ≤ 15。
- 変更は `packages/framework/core/tools/amadeus-orchestrate.ts` + 新規回帰テスト1ファイルの最小面。`resolveProjectDir` の段構造(`amadeus-lib.ts`)は変更しない(#1287 の所掌)。
- 後方互換シム・フォールバック分岐の追加禁止。本修正の拒否は「in-process undefined 呼出が ambient へ書く」現行バグの fail-closed への置換であり、CLI 挙動・既存テスト契約の変更を含まない(仕様変更非該当。契約変更が避けられないと判明した場合は停止してユーザーへエスカレーション)。
- core 変更のため `bun run build` で全ハーネス dist 再生成、追跡ファイル不変確認(Mandated)。
- 新規テストは `tests/integration/` 配下(unit 層は filesystem 触る medium test を許さない)。

## Assumptions

- F2(t214-seam 2行が fixture 隔離下でも実 record へ着地した機序 = OTel per-process ピン仮説)は未実証であり、本 intent の修正はこの機序に依存しない。回帰テストは ambient 側 fixture の shard 空検査(t258 T1 形)を含め、この経路が残っていても偽緑にならない形にする。

## Out of scope

- F2 の機序解明・是正(未実証仮説。実測が揃えば別 Issue 起票候補として最終報告で申し送る)。
- 既着地行(述語ヒット45行、うち seam 由来の直接証拠2行を含む)の revert 要否(append-only 台帳の回復は人間承認付き revert PR — 別途判断)。
- #2727(spawn 形の棚卸し)の述語拡張、#1287(resolveProjectDir 段構造再設計)。
- `main` 経由 CLI の ambient 解決の変更。

## Open questions

- 拒否 directive の具体文言(英語、projectDir 明示を要求)は code-generation で確定する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-14T03:34:08Z
- **Iteration:** 1
- **Scope decision:** none

FR-1〜FR-7 は上流3面の行番号レベルの実測と整合し、Q1=A/Q2=A の裁定経路も維持。受け入れ基準は実行結果ベースで測定可能。MINOR 1件(既着地行数の表記)は「45行(うち seam 由来2行を含む)」へ訂正済みで解消。

### Findings

- FOLLOW-UP | requirements.md Out of scope: 既着地行数の表記を 45行(うち seam 2行を含む)へ訂正(反映済み)
