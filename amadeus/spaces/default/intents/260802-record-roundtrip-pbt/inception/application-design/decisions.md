# Decisions (ADR) — record-roundtrip-pbt (#1980)

上流入力(consumes 全数): requirements.md(OQ-1 / OQ-2 / OQ-3 を設計段の裁定事項として明示、A-1 の import 流儀確定要求、FR-3b の述語設計の委譲、C-1〜C-5 の制約)、architecture.md(発行側のみがバリデータを通る非対称という中心機序、round-trip と fail-closed の書き分けが必須な理由、投影の含意 — ADR-1/ADR-4 の判断材料)、component-inventory.md(対象は既存3グループで新規コンポーネントなしという棚卸し — ADR-2 のガード1本を「既存様式の複製」として位置づける根拠)

測定 ref: 本書のすべての file:line・件数・時間は **worktree HEAD `5a6f79727`** の実測。`git diff --stat 9750f8aea..HEAD -- packages/framework/core/tools/ tests/ .github/workflows/` が空(差分ゼロ)であることを確認済みのため、RE observed `9750f8aea` 由来の値と直接比較できる。

---

## ADR-1: 新規 PBT の import 流儀は core 正本 import に統一する(OQ-1 / A-1)

### Context

requirements.md A-1 が設計段の確定を要求している。RE 実測(re-scans:109)のとおり、既存 PBT の import 面は2流儀に割れている:

- **dist 出荷コピー import**: `tests/unit/t204-audit-escape.pbt.test.ts:35` `} from "../../dist/claude/.claude/tools/amadeus-audit.ts";` / `t352:23` / `t364:39`
- **core 正本 import**: `tests/unit/t274-amadeus-mirror-state-codec.test.ts:13` `} from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";`(および `:22` の同系)/ `t275:13` `:19`

リポジトリ全体の分布(本ステージ実測): dist 面を import するテストファイル **292**、core 面を import するテストファイル **255**(測定: `grep -rl "dist/claude/.claude/tools/" tests/ | wc -l` / `grep -rl "packages/framework/core/tools/" tests/ | wc -l`)。多数決では決まらない。

一方、**本 intent が触る境界の既存テストは全て core 正本 import** である(測定: 各ファイルの import 行を実読):

| 対象境界 | 既存テスト | import 面 |
| --- | --- | --- |
| election model | `tests/unit/t234-election-model.test.ts:13` | `"../../packages/framework/core/tools/amadeus-election-model"` |
| election store | `tests/integration/t235-election-store.integration.test.ts:7` / `:12` | `"../../packages/framework/core/tools/amadeus-election-model"` / `"…/amadeus-election-store"` |
| state 構造フィールド | `tests/unit/t265-engine-boundary.test.ts:13` | `"../../packages/framework/core/tools/amadeus-state.ts"` |
| mirror codec | `tests/unit/t274-…:13` / `:22` | core |

### Decision

**新規 PBT(U2 / U3 / U7)と新規 arbitrary(U8)は `packages/framework/core/tools/` の正本を import する。**

### Rationale

1. **TDD の Red が dist 再生成に依存しない**(C-1 の実効性)。dist は**コミット済みの生成物**であり、core を編集しても `bun scripts/package.ts` を回すまで dist には反映されない。dist import で TDD を回すと、Red→実装→Green の各サイクルに投影ステップが挟まり、しかも投影を忘れると**古いバイナリを検査した偽の結果**になる(`cid:code-generation:code-generation:stale-binary` が記録する既知の失敗様式)。U1 は本 intent 唯一のプロダクション改修であり、その Red を最短で回せることの価値が最も高い。
2. **dist の同一性を守るのはテストではなく `dist:check` である**。NFR-1 が要求する `dist:check` / `promote:self:check` が投影の byte 同一性を保証しているため、PBT が dist を読んでも「core と dist が食い違っていないこと」の追加保証にはならない(それは既に別のゲートの責務)。責務の二重化を避ける。
3. **兄弟テストとの局所整合**。上表のとおり、対象4境界の既存テストは例外なく core import である。新規分だけ dist import にすると同一ディレクトリ内で流儀が割れる。
4. **`cid:code-generation:golden-regen-from-shipped-surface` との明文照合**。当該規範は「**配布面コピーを読むテストの golden fixture** は、対象テストが読む配布面のツールで再生成する」と定める。これは (a) fixture 生成源の規範であり、(b) 「配布面コピーを読むテスト」を前提とする条件付きの規則である。本 ADR は「配布面コピーを読まないテストにする」という選択なので、当該規範の適用条件に**そもそも入らない**(規範の追補が明示する適用限定「対象は『配布面コピーを読むテストの fixture』に限る — canonical 直実行が正しい fixture もありうる」に該当)。新規 PBT はいずれも golden fixture を持たず、生成器から値を作るため、fixture 再生成の論点自体が発生しない。**規範との矛盾はない**。

### Consequences

- **正**: TDD サイクルが投影と独立。stale-binary クラスの偽陽性/偽陰性が構造的に起きない。対象境界の既存テストと流儀が一致。
- **負**: 「dist に投影されたコピーが実際に動くか」は新規 PBT では検査されない。これは `dist:check` と既存の dist import テスト 292 本が担う領域であり、本 intent はその責務を引き受けない。
- **負**: 既存の 2 流儀併存という状態は解消しない(本 intent は新規分の方針のみを定め、既存 547 ファイルの移行キャンペーンは行わない — 実測駆動でない一括改修を避ける)。
- **可逆性**: **高**。import パスの文字列変更のみで反転できる。ロックインなし。

### Alternatives Rejected

**代替 A — dist 出荷コピー import に統一する**。
- 利点: 既存 PBT のうち `.pbt.test.ts` 命名の4本(setup 2本 + t204 + t352)がこの流儀で、「PBT は dist を読む」という見かけの一貫性が得られる。出荷物が実際に動くことを PBT でも押さえられる。
- 欠点(決定的): U1 の TDD Red が dist 再生成に依存する。core を直して dist を回し忘れた状態でテストを走らせると、**旧実装を検査して緑になる**。fail-closed 化という本 intent の目的に対して、検査系自身が fail-open な失敗様式を持ち込むのは受け入れられない。加えて対象4境界の既存テストと流儀が割れる。
- 可逆性: 高(同じくパス文字列)。

**代替 B — 層で使い分ける(unit = dist / integration = core、あるいはその逆)**。
- 利点: 「純関数は出荷面で、FS 経由は正本で」といった説明を作れる。
- 欠点: 使い分けの基準が恣意的で、次に PBT を足す人が判断に迷う(現に本 intent がその迷いを A-1 として持ち越している)。規則を1本に絞ることが A-1 の要求そのものである。
- 可逆性: 高。

### Security / Compliance 影響

なし。import パスの選択はテスト実行時のモジュール解決のみに影響し、出荷物・認証・データ取扱いに触れない。配布 framework の runtime dependency も増えない。

---

## ADR-2: 静的ガードの述語は AST 走査、allowlist の粒度は (file, kind) 単位のカウント(OQ-2 / FR-3b)

### Context

FR-3b が「正確な述語設計(AST か regex か)は application-design で確定する」と委譲している。RE は単一行正規表現で **8 箇所 / 5 ファイル**(`packages/framework/core/tools/*.ts` 非再帰)を測り、「限界の明記: 上記は単一行の正規表現による測定であり、複数行にまたがる形は捕捉しない」と申し送っている。

**本ステージで両述語を同一コーパスへ適用して実測した**(TypeScript 6.0.3 の `ts.isAsExpression` × callee が `JSON.parse` の AsExpression を数え、`as unknown` を別集計):

| 述語 | 走査範囲 | 検出 |
| --- | --- | --- |
| 単一行 regex `JSON\.parse\([^)]*\) as ` | `packages/framework/core/tools/*.ts`(非再帰) | 8 |
| 単一行 regex(同上) | `packages/framework/core` + `scripts`(再帰) | **9** |
| AST(typed cast、`as unknown` 除外) | `packages/framework/core/tools/*.ts`(非再帰) | **21 サイト / 12 ファイル**(多行 0) |
| AST(typed cast、`as unknown` 除外) | `packages/framework/core` + `scripts`(再帰) | **33 サイト / 18 ファイル**(多行 5) |
| AST(`as unknown` = 安全形) | 同上 | 8 |

測定コマンド: regex 側は `grep -rnE --include='*.ts' "JSON\.parse\([^)]*\) as " packages/framework/core scripts | wc -l`。AST 側は scratch スクリプト(repo 外・read-only)。

含意は2つ:

1. **regex の見逃しは多行形だけではない**。多行は 33 件中 5 件にすぎず、regex が取りこぼす主因は `[^)]*` が**引数中の括弧を越えられない**ことである。実例(HEAD 実文): `amadeus-orchestrate.ts:1225` `JSON.parse(readFileSync(recordPath, "utf-8")) as TrustedPluginRuntimeC…`、`amadeus-plugin-activation.ts:184` `JSON.parse(fs.readFileSync(path).toString("utf-8")) as Partial<SpecHas…`。**ディスクから読んで即キャストする形こそが本 intent の患部クラスそのもの**であり、regex はまさにそれを構造的に見逃す。SCAN_ROOTS 上の再現率は 9/33 ≈ **27%**。
2. **regex は誤検出も持つ**。regex の 9 件には `amadeus-lib.ts:849` `JSON.parse(output) as unknown` が含まれる。`as unknown` は型の証明を主張せず parse-don't-validate と両立する安全形であり、母集団に入れるべきではない。

見逃し 73% のガードは「新規違反のみ fail」という ratchet 契約を成立させない — 新しい患部の大半が無音で通過するため、org.md Forbidden の「検証劇場」に該当する。

### Decision

**(a) 述語は TypeScript AST 走査**とする。`ts.isAsExpression(node)` かつ `unwrapExpression(node.expression)` が `JSON.parse(...)` の `CallExpression` であり、かつ `node.type.kind !== ts.SyntaxKind.UnknownKeyword`。

**(b) allowlist の粒度は `(file, kind)` 単位のカウント**とする(`Record<file, Record<kind, count>>`、`kind = "json-parse-as"`)。file:line ピンは使わない。

**(c) 走査スコープは `tests/callsite-guard.ts:61` の `SCAN_ROOTS`(`packages/framework/core` + `scripts`)を踏襲**する。dist は core の投影のため除外。

### Rationale

- (a): 上記の実測。加えて AST 基盤は**既に repo 内にある** — `tests/lib/typescript-source.ts`(`:19` `unwrapExpression` / `:54` `visitNodes` / `:69` `sourceWithTypeChecker`)と `tests/lib/guard-corpus-ast.ts`(`:25` `callNames`、`:26` で `ts.createSourceFile`)。`typescript` は既存 devDependency(`package.json:42`)。**新規外部依存ゼロ・新規基盤ゼロ**である(不在主張の反証確認: `grep -rn "createSourceFile\|from \"typescript\"" tests/ scripts/ packages/` で6ヒット、うち3ファイルが既存 AST ヘルパ)。
- (b): `tests/callsite-guard.ts:21-25` が行ピンを避ける理由を明記している(実文 `// WHY COUNTS AND NOT LINE PINS. An allowlist of file:line identifiers goes` / `// stale the moment an unrelated edit shifts a file, and every later PR then` / `// fails on a pin that moved rather than on a real regression` / `// (cid:code-generation:allowlist-line-pin-stale). Per-(file, symbol) counts` / `// keep the monotone-decrease property BR-12 needs without that failure mode.`)。本リポジトリは実際に行ピンの stale で全 PR が塞がれた実測を持つ(`cid:code-generation:allowlist-line-pin-stale` / `cid:code-generation:c1-allowlist-mechanical-remap`)。同じ轍を踏まない。
- (c): 判断根拠(dist は投影なので除外)がそのまま流用でき、走査スコープの新規発明を避ける。component-inventory.md 現在節が本 intent の対象を「静的ガード(`tests/callsite-guard.ts` 同型の新規 allowlist ratchet **1 本**)」と限定していることとも一致する — 本 ADR は述語の中身を確定するだけで、ガードの本数や配置を棚卸しから増やさない。

### 引用元との意図的相違(明文照合 — `cid:application-design:citation-semantics-check`)

様式の引用元である `tests/callsite-guard.ts` は **明示的に構文木を避けている**。`:70-72` 実文:

```
// Detection. A single linear pass per file, no syntax tree and no type
// resolution (performance-design.md: lint-budget, O(files)). Detection leans
// to OVER-detection: a false positive is fixed by migrating or by an explicit
```

本 ADR はこの点で引用元と**意図的に相違する**。理由と実測:

- 引用元の検出対象は**識別子直後の `(`** という語彙的パターン(`GUARDED_SYMBOLS`、`:50`)で、単一行スキャンで十分な再現率が出る。本 ADR の検出対象は**式の構造**(`X as T` の X が `JSON.parse` 呼び出し)であり、引数が任意の式を取れる以上、語彙的スキャンでは原理的に再現率が確保できない(実測 27%)。同じ「1ファイル1パスの語彙走査」方針を適用すると、引用元が達成している OVER-detection(見逃さない)ではなく UNDER-detection(見逃す)になり、引用元の**設計意図そのものに反する**。
- lint-budget への実影響を実測した: SCAN_ROOTS(**236 ファイル** — `find packages/framework/core scripts -name '*.ts' -not -path '*/node_modules/*' | wc -l`)に対し、AST 走査は **0.29 / 0.29 / 0.31 秒**(3回、`/usr/bin/time -p`)。対照として既存 `bun tests/callsite-guard.ts --check` は **0.20 / 0.20 秒**(2回)。**差は約 +0.1 秒**であり、lint ジョブの予算に対して無視できる。
- したがって相違は「性能を犠牲にして正確性を取った」のではなく、**性能差がほぼ無い条件下で正確性を取った**判断である。この照合結果は services.md にも記録した。

### Consequences

- **正**: 患部クラス(ディスク読み → 即キャスト)を含む 33 サイトを実際に捕捉できる。多行形 5 件も自動的に入る。`as unknown` の安全形 8 件を誤検出しない。
- **負**: 初期 allowlist が大きい(SCAN_ROOTS 上 33 サイト / 18 ファイル。`amadeus-election-store.ts:80` の `as T` は `readJson<T>` 本体の構文であり、ADR-4 のとおり U1 は本体を変更しないため **U1 着地後も検出され続け、初期値は 33 / 18 のまま** — AST 述語は呼出し側の型引数に依存しない。実装段で `--update` の実出力から確定する)。ratchet は縮小方向のみを許すので、この初期値は「可視化された技術的負債の総量」として意味を持つ(requirements.md A-3 の「残余は FR-3 の allowlist ratchet が可視化・縮小方向で管理する」に一致)。
- **負**: TypeScript の parse に依存するため、`typescript` のメジャー更新で AST API が変わればガードの追随が要る。既存の3ファイル(`typescript-source.ts` / `guard-corpus-ast.ts` / `cli-mechanism.ts`)が同じ依存を既に負っており、**新たなリスク面ではない**。
- **負**: `kind` 語彙が1つ(`json-parse-as`)から始まるため、台帳の形は `Record<file, Record<kind, count>>` とやや冗長。将来述語(例: `readFileSync` 直後の無検査 `satisfies`)を足すときに同じ形で拡張できる利点を取る。
- **可逆性**: **中**。述語の実装は差し替え可能だが、allowlist の初期値は述語に紐づくため、述語を変えると台帳を採り直す必要がある(縮小方向の履歴が一度リセットされる)。したがって述語の選択は着地前に確定させる価値が高い — 本 ADR がそれを行っている。

### Alternatives Rejected

**代替 A — 多行対応の正規表現(バランス括弧を近似するパターン、または複数行結合後のスキャン)**。
- 利点: 依存ゼロ。既存 `callsite-guard.ts` の走査様式(`:115` `detectCallsites` の linear pass)をほぼそのまま流用でき、実装が最短。lint-budget の設計意図(`:70-71`)とも整合する。
- 欠点(決定的): 正規表現はネスト括弧を数えられない。引数に括弧を含む形(実測で主要な見逃し源)を拾うには括弧の対応を数える手続きが要り、それは事実上手書きの部分パーサになる — AST を使わない理由が消える。近似で妥協すれば見逃しが残り、ratchet 契約が成立しない。また `as unknown` の除外には型注釈側の判定が要り、こちらも語彙的には脆い。
- 可逆性: 中(述語差し替えで allowlist 採り直し)。

**代替 B — `tsc` の型情報を使う(TypeChecker 経由で `as` の対象型が `unknown` か否かを型解決して判定)**。
- 利点: 最も正確。型エイリアス越しの `unknown` も判定できる。`tests/lib/typescript-source.ts:69` の `sourceWithTypeChecker` が既にその足場を持つ。
- 欠点: プログラム全体の型解決は 236 ファイルに対して構文解析より桁違いに重く、lint-budget を実際に脅かす(`:69` の実装は `noLib: true` / `noResolve: true` の単一ファイル checker であり、クロスファイルの型解決は別物)。得られる追加精度(型エイリアス越しの `unknown`)は、実測 8 件の `as unknown` がすべて構文上 `unknown` キーワードである現状では**ゼロ**。
- 可逆性: 中。

**allowlist 粒度の代替 — file:line ピン**。
- 利点: 「どの行が残っているか」が台帳から直読できる。
- 欠点(決定的): 無関係な編集で行がずれた瞬間に全 PR が偽の赤になる。本リポジトリはこの失敗を `coverage-patch-allowlist` で実際に経験しており(`cid:code-generation:allowlist-line-pin-stale`、および `cid:code-generation:c1-allowlist-mechanical-remap` が定める remap 手順の存在自体がその代償)、引用元 `callsite-guard.ts:21-25` が明示的に退けている。
- 可逆性: 低(台帳形式の変更は全エントリの書き換え)。

### Security / Compliance 影響

**正の影響**。本ガードは「外部から与えられた JSON を型の証明なしにドメイン値として扱う」経路を可視化・単調減少させる。これは信頼境界での入力検証(construction ガードレール「システム境界ではすべての入力を検証・サニタイズする」)の実効性を機械的に守る面であり、fail-open な読み戻しの再導入を構造的に抑止する。ガード自身は読み取り専用の静的走査で、資格情報・ネットワーク・実行時挙動に触れない。

---

## ADR-3: 深掘り実行は ci.yml への `workflow_dispatch` 限定・非ブロッキングジョブ追加とする(OQ-3 / FR-5)

### Context

FR-5a は「`workflow_dispatch` の手動トリガで `AMADEUS_PBT_DEEP=1` 階層を実行し、失敗 seed をジョブログへ可視化する最小 CI 面を新設」、FR-5b は「既存 CI のブロッキング集合には加えない」と定める。OQ-3 は「既存 ci.yml への job 追加か独立 workflow ファイルか」を、`cid:ci-pipeline:c2`(Code Generation で既存 workflow へ実装済みなら新規 workflow を二重生成せず、既存 workflow を唯一の正本とする)に反しない形で確定せよ、と委譲している。

HEAD の実測:

- `.github/workflows/` は **4 ファイル**(`ci.yml` / `metrics-maintenance.yml` / `perf.yml` / `release.yml`)。
- `ci.yml:8` に `  workflow_dispatch: {}` が**既にある**。
- `ci.yml:509-511` に先例がある: `  formal-model-check:` / `    name: Formal model check` / `    if: github.event_name == 'workflow_dispatch'`。
- `ci-success` の `needs`(`:615-623`)は `changes` / `typecheck` / `lint` / `distribution-contract` / `plugin-conformance-e2e` / `tests` / `drift-check` / `coverage` の8つで、**`formal-model-check` は含まれない**。
- 対照的に `perf.yml` は独立 workflow で、`schedule` + `workflow_dispatch` の2トリガを持つ(`:22-26`)。

### Decision

**`.github/workflows/ci.yml` に `pbt-deep` ジョブを追加する。`if: github.event_name == 'workflow_dispatch'` でゲートし、`ci-success` の `needs` には追加しない。独立 workflow ファイルは新設しない。**

### Rationale

1. **`cid:ci-pipeline:c2` との整合**。同規範は「新規 workflow を二重生成せず、既存 workflow を唯一の正本として文書化・検証する」。ci.yml は既に `workflow_dispatch` トリガを持ち(`:8`)、手動起動の非ブロッキングジョブという**まさに同じ形の先例**(`formal-model-check`)を内包している。同型の需要に対して別ファイルを新設するのは、この規範が禁じる二重生成の典型である。
2. **トリガ定義の追加が不要**。独立ファイルなら `on: workflow_dispatch` を再定義することになるが、ci.yml へ入れるならジョブレベルの `if:` だけで済む。
3. **非ブロッキングの実現手段が2つあり、ci.yml 内の手段が既に実証されている**。「ブロッキングにしない」は (i) 別ファイルにする、(ii) 同ファイルで `ci-success` の `needs` から外す、のどちらでも達成できる。(ii) は `formal-model-check` が実際に運用中であり、`tests/unit/t222-ci-snapshot-wiring.test.ts:121`(`ci-success remains independent from both publishers`)や `tests/integration/t222-ci-snapshot-branch.integration.test.ts:107`(`const ciSuccessNeeds = jobs["ci-success"]?.needs;`)が `ci-success` の独立性をテストで守っている。**needs に足さない限りブロッキング化しないことが機械的に担保されている**。
4. **`perf.yml` が独立ファイルである理由は本件に当てはまらない**。`perf.yml` は `schedule`(日次 cron)を持つ(`:23-24`)。schedule トリガは workflow 単位の属性であり、ci.yml の PR/push トリガと同居させると全 PR 実行に影響する。本件は FR-5a が明示的に手動のみ(「schedule 化は Out」)と定めるため、独立ファイルにする動機が存在しない。

### Consequences

- **正**: workflow ファイル数が増えない。トリガ定義の重複がない。非ブロッキングであることがテスト(t222 系)で守られる形に自動的に乗る。
- **負(実装段の必須手順)**: `tests/fixtures/formal-verif-ci-baseline.sha256` の**再 baseline が必要**。`tests/integration/t-formal-verif-ci-workflow.integration.test.ts` のヘッダ実文が仕組みを明記している: `// The baseline SHA pins ci.yml OUTSIDE the three regions normalizedCiBaseline` / `// strips (the formal job block, the workflow_dispatch line, the empty-base` / `// branch), so every sanctioned edit elsewhere in the file re-baselines the` / `// fixture.`。同ヘッダの「Recorded re-baselines」へ本 intent 分を追記する。先行例が3件(260725-mirror-review-fixes / 260729-otel-upstream U7 と U8 / 260801-open-bug-batch-5)あり、手順は確立している。**このコストは代替 A(独立ファイル)なら発生しない** — それが代替 A の唯一の実質的利点である。
- **負**: ci.yml が更に長くなる(HEAD で既に 700 行超)。ただし `# U4 formal-model-check begin` / `# U4 formal-model-check end`(`:508` / `:610`)のようなブロックマーカーの慣習が既にあり、同様のマーカーで領域を明示できる。
- **可逆性**: **高**。ジョブ定義をそのまま別ファイルへ切り出せる(`perf.yml` がまさにその形)。ロックインなし。

### Alternatives Rejected

**代替 A — 独立 workflow ファイル `.github/workflows/pbt-deep.yml` を新設する**。
- 利点: ci.yml を触らないため baseline 再計算が不要。非ブロッキングであることがファイル分離によって自明になる。`perf.yml` という前例がある。
- 欠点: `cid:ci-pipeline:c2` が禁じる二重生成に当たる — 既存 ci.yml に同型の手動ジョブ機構(`workflow_dispatch` トリガ + `if:` ゲート + needs 非参加)が実在するのに、同じ目的の別 workflow を作ることになる。`perf.yml` の分離理由(schedule トリガ)は本件に存在しない。baseline 再計算の回避という利点は、既に3回実施されている定型手順の1回分にすぎず、規範との整合を覆すほどの重みがない。
- 可逆性: 高。

**代替 B — 既存 `perf.yml` へ相乗りする**。
- 利点: 非ブロッキング loud-fail 契約(`perf.yml:6-11`)がそのまま適用でき、ファイルも増えない。baseline 再計算も不要。
- 欠点(決定的): `perf.yml` は `schedule` を持つため、相乗りすると **FR-5a が Out としている schedule 化**が事実上成立してしまう(日次で深掘りが走る)。`if:` で `workflow_dispatch` のみに絞れば回避できるが、ワークフローの名前(`Performance`)と責務(wall-clock 計測)から PBT 深掘りが乖離する。加えて同ファイルのヘッダは `tests/perf/` 前提の記述(`:12-16`)であり、tier の異なるものを混ぜると `t257-ci-residency-marker-guard` が守っている「perf tier は `--ci` の外」という区分の説明が濁る。
- 可逆性: 高。

### Security / Compliance 影響

`workflow_dispatch` は書き込み権限を持つ利用者のみが起動できる。新ジョブは `permissions: contents: read` を宣言し(`.github/workflows/ci.yml:514-515` の `formal-model-check` と同様)、シークレットを要求せず、外部ネットワークにも出ない(依存は `bun install --frozen-lockfile` のみ)。actions は既存ジョブと同じくコミット SHA ピンで参照する(`formal-model-check` が `actions/checkout@11d5960a…` / `oven-sh/setup-bun@0c5077e5…` の形で pin しており、`t-formal-verif-ci-workflow` がその pin を検査している)。リリース経路には触れない(C-5)。

---

## ADR-4: election の読み側検証は store 内 private の `parseElectionFile` に置き、汎用 `readJson` は変更しない(FR-1a / A-3)

### Context

architecture.md 現在節が特定した中心機序: `Store.load`(`amadeus-election-store.ts:503-510`)は `readJson<ElectionFile>` を呼ぶだけで `Election.parse` を再適用しない。`readJson` の該当行(`:80` verbatim)は:

```ts
    return ok(JSON.parse(text) as T);
```

一方 `readJson` は汎用形で、HEAD 実測では **11 箇所**から呼ばれる(`grep -n "readJson" packages/framework/core/tools/amadeus-election-store.ts`: 定義 `:71` + 呼出 `:150` `:174` `:210` `:504` `:515` `:532` `:586` `:603` `:634` `:681`)。読む対象は `pending/<voter>.json` / `ledger.json` / `election.json` / `tally.json` / `timeline.json` と**5種のファイル**にわたる。requirements.md A-3 が「FR-1 は election ファイルの読取経路のみを一本化し、残余は FR-3 の allowlist ratchet が可視化・縮小方向で管理する」と境界を引いている。

さらに、`election.json` を読む口は `Store.load`(`:503`)だけではなく `Store.setState`(`:512`、`:515` で `readJson<ElectionFile>(path)`)にもある。`setState` は読んだ値を `{ ...read.value, state }` として**書き戻す**(`:516`)ため、検証を通さないと不正な定義をそのまま再書き込みして固定する。

### Decision

**`amadeus-election-store.ts` 内に private 関数 `parseElectionFile(raw: unknown): Result<ElectionFile, StoreError>` を新設し、`Store.load`(`:503`)と `Store.setState`(`:512`)の2つの読み口だけがそれを経由する。`readJson<T>` の汎用形は変更しない**(呼び方を `readJson<unknown>` に変えるのみ)。

`parseElectionFile` は (1) `Election.parse`(`amadeus-election-model.ts:100`)で定義部を検証し、(2) `state` を同ファイル既存の `VALID_STATES`(`:254`)で照合する。失敗は既存語彙 `err("corrupt")` へ写像する。

### Rationale

1. **#1459 の硬化がそのまま読み戻し経路に載る**。`Election.parse` は既に空 choices 拒否(`parseChoices` `:76`、実文コメント `// #1459: the definition is the only source of choices and voters downstream, so`)、重複 internalNo 拒否(`parseChoices` 末尾の `hasDuplicates(choices.map((c) => c.internalNo))`)、重複 voter 拒否(`hasDuplicates(r.voters)`)を持つ。**新しい検証ロジックを書かない**ことが最大の設計目標である — 書けばそれ自体が発行側とずれる新しい非対称になる。architecture.md が求める「発行側と消費側が同一バリデータを食う構造への収斂」の直接実装。
2. **A-3 の境界を守る**。`readJson` を election 特化にすると、同じ関数を通る ledger / pending / tally / timeline の 9 呼出に意図しない検証が波及する。汎用形を残し、ファイル種別ごとの検証は呼び出し側に置く。
3. **`state` の検証集合を新設しない**。`VALID_STATES`(`:254`)が同一ファイル内に既にあり、レジストリ行の検証(`isElectionRegistryEntry` `:270`、実文 `  if (typeof r.status !== "string" || !VALID_STATES.has(r.status)) return false;`)で使われている。**不在主張の反証確認済み**: `grep -rn "isElectionState\|ELECTION_STATES" packages/framework/core/tools/*.ts` は 0 件で、`ElectionState` を実行時に判定する集合は `VALID_STATES` ただ1つ。新設は重複定義になる。
4. **読み口の対称性**(`cid:requirements-analysis:symmetric-pair-review`)。`Store.load` だけを直すと `Store.setState` が同じファイルを無検査で読み、しかも書き戻す非対称が残る。2箇所を同時に一本化する。
5. **エラー語彙を増やさない**。`StoreError`(`:44-50`)に既に `"corrupt"` があり、`readJson:82` が JSON 構文エラーで返している。FR-1b の「既存の `err("corrupt")` 系の loud な失敗経路へ落とす」はこの語彙の再利用で満たせる。既存の特性化テスト `tests/integration/t235-election-store.integration.test.ts:91`(`fail-closed load: a corrupt election.json rejects with corrupt, never re-initializes`)がそのまま緑を維持する。

### 引用元 idiom との意味論照合(`cid:application-design:citation-semantics-check`)

引用する既習 idiom は同一ファイルの `isElectionRegistryEntry`(`:270`)/ `readElectionsRegistry`(`:283`)である。当該 idiom のエラー分岐方針は3値(`:250-252` の `RegistryRead` = `ok` / `absent` / `corrupt`)で、コメント実文 `// Read the registry, never silently reinitializing: a missing file is \`absent\`` / `// (a legitimate pre-adoption / pre-migration state), any parse failure or a row` / `// failing the 4-field check is \`corrupt\` (the caller decides loudness).` が示すとおり「**不在は corrupt ではない**」を核とする。

本設計はこのうち「検証失敗 → corrupt(fail-closed)」だけを踏襲し、**3値化は踏襲しない**。理由: `election.json` の不在は既存 `readJson:72` が `err("not-found")` で表現しており、レジストリの `absent`(正当な未採用状態)とは意味が異なる — 登録済み election の定義ファイルが無いのは異常である。この差は**意図的相違**として記録する。戻り型は既存 `Result<T, StoreError>` を維持し、新しい union は導入しない。

### Consequences

- **正**: 消費側(status / tally / verify — `Store.load` のプロダクション呼出 **10 件**、うち 8 件が `amadeus-election.ts:138` `:195` `:254` `:395` `:431` `:458` `:473` `:558`)が一斉に fail-closed になる。「修正しても読み側が素通りする」構造が election 境界で閉じる。
- **正**: FR-4d の #1459 反例が読取経路で実測できるようになり、fail-closed プロパティ(P-EL2)が意味を持つ。
- **負(挙動変更)**: これまで `Store.load` が受理していた不正な `election.json` が `"corrupt"` になる。既存 fixture への影響は実読で確認済み(component-methods.md の「既存 fixture 影響の実読確認」節): `t236` はスプレッドで定義部を保つ、`t262:114` の最小 fixture は移行ツールの独自読み口を通り `Store.load` を通らない、`t235:91` は既に corrupt を期待。**破壊は見込まれない**が、実装段で全 election テスト(t234 / t235 / t236 / t238 / t239 / t240 / t242 / t259 / t262)の緑を実測で確認する。
- **負(運用)**: ディスク上に既存する不正な election があれば読めなくなる。これは意図した fail-closed であり、無音の部分受理より望ましい(FR-1b)。回復は人手の修復であり、自動再初期化は行わない(`:18` 実文 `// reject with "corrupt" (fail-closed load; never silently re-initialize).` の既存方針を維持)。
- **負(投影とゲート)**: NFR-1 により dist **7 ハーネス**再生成 + `dist:check` / `promote:self:check`。NFR-2 により coverage patch 母集団入り — `parseElectionFile` の全分岐(`Election.parse` 失敗 / `state` 不正 / 成功)を **in-process** で駆動するテストが要る(`Store.load` は既に t235 が in-process で呼んでおり、spawn 盲点は生じない)。NFR-3 により `t258-boundary-guard`(コメント・文字列に `scripts/` パストークンを書かない)。
- **負(行ピン)**: `tests/.coverage-patch-allowlist.json` に `amadeus-election-store.ts` の行ピンが2件実在する(`:94` `"lines": "476-477"` / `:100` `"lines": "491"`)。新設関数の挿入位置によっては両方がシフトするため、機械 remap + reason 文と現行行内容の直読照合を行う(`cid:code-generation:c1-allowlist-mechanical-remap`)。span 膨張(既存レンジ内部への挿入)がないことも確認する(`cid:code-generation:cg-allowlist-straddle-swell`)。
- **可逆性**: **中**。関数の追加と呼び出し2箇所の書き換えという小さな差分で反転できるが、反転は fail-open への回帰であり、そのときは #1459 クラスの再発を受け入れることになる。技術的可逆性は高く、意味的可逆性は低い。

### Alternatives Rejected

**代替 A — `readJson` にバリデータを引数として渡す汎用形にする(`readJson<T>(path, parse: (raw: unknown) => Result<T, StoreError>)`)**。
- 利点: 11 呼出すべてが「読む＝検証する」形に揃い、無検査キャストがファイルから消える。将来 ledger / tally / timeline を硬化するときの受け皿になる。
- 欠点(決定的): requirements.md A-3 と C-4 の境界を越える。本 intent は election **境界**の一本化であり、残る4ファイル種のバリデータを今書くことになると、(a) 変更面が一気に広がって walking skeleton(C-3)の粒度を壊し、(b) まだ設計していない ledger / tally / timeline のスキーマを実装段で即席に決めることになる。requirements.md A-3 は明示的に「残余は FR-3 の allowlist ratchet が可視化・縮小方向で管理する」と別経路を指定している。将来この形へ寄せる余地は残る(ADR-2 の ratchet が縮小圧力を与え続ける)。
- 可逆性: 中(シグネチャ変更で 11 呼出に波及)。

**代替 B — `Store.load` の呼び出し側(`amadeus-election.ts` の 8 箇所)で `Election.parse` を再適用する**。
- 利点: `amadeus-election-store.ts` を一切変更しない。dist 投影対象ファイルの差分が小さい。
- 欠点(決定的): 8 箇所に同じ検証を書くことになり、**新しい非対称の温床**そのものである(1箇所書き忘れれば元の木阿弥で、しかもそれが無音)。加えて `Store.setState`(store 内)と `Store.status`(`:643` で `Store.load` を呼ぶ)は `amadeus-election.ts` の外にあるため、呼び出し側パッチでは覆えない。architecture.md が求める「同一バリデータを食う構造への収斂」に対して、収斂ではなく散逸を選ぶことになる。
- 可逆性: 低(8 箇所の重複を後から集約するのはより大きな改修)。

**代替 C — `Election.parse` 自体を `state` を含む形へ拡張する(`ElectionFile.parse` として model 側に置く)**。
- 利点: 「ファイル形の parse」がドメイン層に集まり、store は I/O に専念できる。パーサの所在が1つになる。
- 欠点: `state` は**ストレージ層の関心**である。`Election`(`amadeus-election-model.ts:53-59`)はドメイン定義で state を持たず、`ElectionFile`(store `:86`)がストレージ表現として合成している。この分離は既存設計の明示的な選択であり(model 冒頭 `:1-5` 実文 `// pure domain layer … No fs/network/clock access`)、それを壊すと `amadeus-election-model.ts` がストレージ表現を知ることになる。`VALID_STATES` も store 側にある(`:254`)ため、model へ移すか二重定義するかの新しい問題が生まれる。
- 可逆性: 低(型の所有が移動するため、消費側の import が広く動く)。

### Security / Compliance 影響

**正の影響**。election 台帳は合議の記録であり、不正な定義(重複 internalNo による票の分割、空 choices による勝者不在、重複 voter による定足数の水増し — いずれも `amadeus-election-model.ts:69-75` のコメントが機序を明記)が読み戻し経路で受理されると、**裁定結果そのものが歪む**。読み側 fail-closed 化はこの完全性リスクを閉じる。認証・資格情報・ネットワークには触れない。監査ログの形式も変えない。

---

## 裁定サマリ(Decision 1行)

| ADR | Decision |
| --- | --- |
| ADR-1 | 新規 PBT / arbitrary は **core 正本 import** に統一する(dist 出荷コピー import は採らない)。 |
| ADR-2 | 静的ガードの述語は **TypeScript AST 走査**(`as unknown` は除外)、allowlist は **(file, kind) 単位のカウント**、走査スコープは既存 `SCAN_ROOTS` を踏襲する。 |
| ADR-3 | 深掘り実行面は **ci.yml へ `workflow_dispatch` 限定・`ci-success` の needs 非参加のジョブを1本追加**する(独立 workflow は新設しない)。 |
| ADR-4 | election の読み側検証は **store 内 private `parseElectionFile`** に置き、`Store.load` と `Store.setState` の2読み口が経由する。汎用 `readJson` は変更しない。 |

## Reversibility assessment(横断)

| ADR | 可逆性 | 反転コスト |
| --- | --- | --- |
| ADR-1 | 高 | import パス文字列の置換のみ |
| ADR-2 | 中 | 述語差し替えは可能だが allowlist の縮小履歴がリセットされる |
| ADR-3 | 高 | ジョブ定義を別ファイルへ切り出すだけ(`perf.yml` が前例) |
| ADR-4 | 技術的に中 / 意味的に低 | 差分は小さいが、反転は fail-open への回帰であり #1459 クラスの再発を受け入れることになる |

**不可逆に近い決定は ADR-4 の意味面のみ**であり、それは本 intent の目的そのもの(読み側 fail-closed 化)である。他の3件はいずれも容易に反転できる。
