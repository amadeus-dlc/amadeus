# Requirements — 260814-t528-ambient-isolation(Issue #2981)

## Upstream inputs

- 消費 artifact: `amadeus/spaces/default/codekb/amadeus/architecture.md`(本 intent の節「projectDir 解決の段構造と in-process 呼出における ambient 逸出」)、`amadeus/spaces/default/codekb/amadeus/code-structure.md`(本 intent の節「テスト基盤の `dist/` 依存と env 伝播」)。この2面は本 intent の RE が更新した面であり、本文の事実は主にここから引く。
- `amadeus/spaces/default/codekb/amadeus/business-overview.md` は本 intent の RE で「レビュー済み・無変更」の面であり、本 intent 固有の事実は引かない。一般文脈(Amadeus が AI-DLC フレームワークであり Bun/TypeScript 製である)のみの前提として消費する(cid:requirements-analysis:c4-consume-header-is-not-citable-content)。
- 一次入力: Issue #2981 本文、クロスレビュー xrev-260814-2981(reviewer-1 / reviewer-2、いずれも CONFIRMED_WITH_REFINEMENTS、target-sha `52f1f1b2575ea35bd23b761697b2d17a5e9a7ac3`)、RE 差分スキャン(`amadeus/spaces/default/codekb/amadeus/re-scans/260814-t528-ambient-isolation.md`、observed `5f6b5bf97`)。

## Intent analysis

`tests/integration/t528-report-ack-kind.integration.test.ts` の失敗集合が実行文脈で入れ替わる現象は、独立した2機序の重ね合わせである(RE で実測確定):

- **機序 A**(xrev 確定): テスト #3(`a failed result remains a typed error directive`、`t528:123-129`)が `handleReport(..., undefined)` を projectDir 未指定で呼び、`resolveProjectDir(undefined)` が `CLAUDE_PROJECT_DIR` → cwd 祖先 workspace marker へ ambient フォールバックする。実環境の active intent の autonomy が semi/full だと `runsQualityRepair` が true になり、期待 `Unknown --result "failed"` ではなく `report --result failed requires --failure <detail>...`(PR #2945 由来)へ分岐して赤くなる。
- **機序 B**(本 intent RE で特定・落ちる実証済み): `STOCK_GRAPH`(`t528:46-54`)が gitignore 対象の `dist/claude/.claude/tools/data/stage-graph.json` を指し、`bun run build` 未実行の新規 worktree では不在。graph に到達するテスト #4/#5(gated approve / idempotent re-report)だけが `Stage graph not readable ... ENOENT` で落ちる — Issue の「隔離 worktree で 4 pass / 2 fail」の実測と失敗集合が完全一致。

目標は、この2機序を閉じてテストを実行文脈非依存で決定的にし(Issue 完了条件1)、#2945 後の実装へ期待を追随させる(完了条件2)こと。

## Functional requirements

### FR-1: テスト #3 の projectDir 隔離修復
`t528:124` の `handleReport([...], undefined)` を、autonomy を持たない fixture project の明示 projectDir を渡す形へ修正する。修正後のテスト #3 は quality repair 非活性の fixture 上で決定的に `Unknown --result "failed"` を期待する。
受け入れ基準(配送先ツリーの述語): 実 workspace(full autonomy の active intent が存在する本 worktree)で `CLAUDE_PROJECT_DIR` を workspace に向けた状態と unset の状態の両方で `bun test tests/integration/t528-report-ack-kind.integration.test.ts` が全 pass。

### FR-2: quality-repair-active 経路の決定的テスト新設
semi/full autonomy を持つ fixture project を構成し、`--result failed`(`--failure` なし)が typed error directive `report --result failed requires --failure <detail>` を返すことを決定的に検証するテストを追加する(xrev 是正示唆 2、Issue 完了条件2 の追随先)。現状この経路は環境偶発でしか踏まれない。
受け入れ基準: 新テストが fixture のみで(ambient 状態に依らず)green。fixture の autonomy 除去で赤くなること(分岐反転の落ちる実証 — reviewer-2 の後続検証者向けメモが要求)を実測1セットで確認。

### FR-3: TDD の落ちる実証(修正前の赤)
修正前に、現行テスト #3 が ambient 注入(`CLAUDE_PROJECT_DIR` を full autonomy の active intent を持つ workspace へ向ける)で赤くなることを実測してから修正に入る(red → green)。注入 → 赤の実測 → revert を1セットで行い残渣ゼロを機械確認する(cid:code-generation:falling-proof-injection-one-set)。
受け入れ基準: 赤の実測ログ(期待/実際のメッセージ対)が code-generation 成果物に記録されている。

### FR-4: 機序 B の前提検査(loud fail 化)
`t528` の `beforeEach`(または適所)で `STOCK_GRAPH` の実在を検査し、不在時は `bun run build` を名指す明示メッセージで fail させる。現行の `Stage graph not readable ... unset it to use the default.` は是正手順を誤誘導する(AMADEUS_STAGE_GRAPH を unset しても解決しない)。
受け入れ基準: graph 不在を模した実行(STOCK_GRAPH 相当を不在パスへ向ける)で新メッセージの赤を実測(落ちる実証)、実在時は green で挙動不変。

### FR-5: 残余の記録と新 Issue 起票
(a) Issue #2981 へ機序 B の実測(落ちる実証の再現手順・失敗集合の一致)を追記する。(b) RE §3.4 で実測した production 側の監査汚染経路(`recordEngineError` の ambient フォールバックが実 record の監査シャードへ `ERROR_LOGGED` を書く。`t258` は explicit 形のみ被覆)を、実測を添えた別 Issue として起票する(本 intent では修正しない — AUTO_DECIDED auto-decision-0f514a0d3927d145b0458c66781d1077)。
受け入れ基準: #2981 のコメントと新 Issue が存在し、新 Issue 本文が正準様式(cid:requirements-analysis:issue-canonical-body)を満たす。

### FR-6: 回帰なしの検証
対象テスト単独、フルスイート(`bash tests/run-tests.sh --ci`)、`bun run typecheck`、`bun run lint` をすべて green で通す(テストファイル変更を含むため conductor がフルスイートを1回通す — cid:code-generation:c3-conductor-runs-full-suite)。
受け入れ基準: 各コマンドの実測 exit code 0(確定値のみ報告 — cid:requirements-analysis:verify-before-notify)。

## Non-functional requirements

- **決定性**: t528 の合否は実行ツリー・env・実 record の有無に依存しない。ambient 状態(active-intent カーソル、`CLAUDE_PROJECT_DIR`)の任意の組で同一結果。
- **隔離**: テストは実 intent record へ一切書き込まない(修正後の全テストが fixture の projectDir のみに着地する)。

## Constraints

- 後方互換シム・フォールバック分岐の追加禁止(org.md Forbidden)。
- 変更は t528 テストファイルと(必要なら)テストハーネスの最小面に限る。production コードは変更しない(Q1=A)。無関係ファイルへの変更禁止。
- 他 intent の record への書込禁止。
- TDD 必須(team.md Testing Posture): 失敗テストの赤を実測してから最小実装で green にする vertical slice。

## Assumptions

- 仮説 H1(xrev の「origin/main 隔離 worktree」は `bun run build` 未実行だった)は当該 worktree が現存しないため直接検証不能。ただし機序 B の落ちる実証が失敗集合(#4/#5 のちょうど2件、#6 は緑)を完全再現しており、説明として十分(Issue へは「実測で再現した機序」と「当該 worktree の dist/ 状態は未観測」を峻別して追記する)。

## Out of scope

- production 側 E2(`recordEngineError` の ambient 段)の修正(別 Issue、Q1=A)。
- テスト基盤全体(`AMADEUS_SRC` / `AMADEUS_MEMORY_SRC` / `setupIntegrationProject` クラス)への前提検査拡大(Q2=A で C を不採用)。
- `resolveProjectDir` の段構造そのものの変更。
- `handleReport(..., undefined)`(ambient/undefined-projectDir 形)の回帰カバレッジ追加 — FR-1 適用後この形を exercise するテストはリポジトリから消えるが、本 intent では埋めない(E2 別 Issue の完了条件に含める。Q1=A と整合)。

## Open questions

- FR-2 の fixture で semi/full autonomy projection を構成する最小手順(既存テストの先行例の有無)は code-generation で確定する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-14T01:05:03Z
- **Iteration:** 1
- **Scope decision:** none

FR-1〜FR-6 は Issue #2981 の完了条件(機序 A/B の両方)を過不足なくカバーし、受け入れ基準はすべて配送先ツリーの実行結果述語で書かれている。上流引用は実在確認済み。深度 Minimal のバンドに適合。MINOR 1件(ambient/undefined 形の回帰カバレッジ消滅の明記推奨)は Out of scope へ追記済みで解消。

### Findings

- FOLLOW-UP | requirements.md Out of scope: FR-1 適用後に handleReport(..., undefined) 形の回帰カバレッジがリポジトリから消える旨の明記を推奨(反映済み: E2 別 Issue の完了条件に含める)
