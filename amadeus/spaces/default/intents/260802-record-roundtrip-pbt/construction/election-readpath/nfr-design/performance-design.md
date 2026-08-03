# Performance Design — unit `election-readpath`(#1980)

上流入力(consumes 全数): business-logic-model.md(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

本書は business-logic-model.md §3(改修後フロー — `parseElectionFile` の3手順)、§5(P-EL1〜P-EL3 のプロパティ定義)、§6 Step 0(`PBT_SEED` 選定)/ Step 10 出荷条件表の「新規 PBT ファイル群の `bun test` 直接実行が合計 2秒以内」に依拠する。同 unit の business-rules.md(BR-ELRP-14〜20 の PBT 4項規約、BR-ELRP-25 の in-process 駆動)と domain-entities.md §6(生成器の生成境界)も併読した — **宣言外の追加入力**。

## 0. 測定 ref と測定環境

| 項目 | 値 |
| --- | --- |
| 測定 ref | worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63` |
| ランタイム | `bun test v1.3.13 (bf2e2cec)` / macOS arm64 |
| 上流 FD との ref 差 | FD は `c8702be09d74daa8091d99d3eae48987b9fd7527` を ref とする。`git diff --stat c8702be09..HEAD -- packages/framework/core/tools/ tests/ .github/workflows/` は**空**であり、FD の file:line は本 ref でも成立する(§6 で再実測した `:80` / `:82` / `:254` / `:503` / `:504` / `:512` / `:515` / `:517`、`amadeus-election-model.ts:65` / `:77` / `:101` はすべて一致) |

本書に現れる数値は、実行コマンドの出力からの転記か、明示した式による派生値(「推定」ラベル付き)のいずれかである。

---

## 1. 性能の対象面は2つだけである

本 unit が触る面は (A) プロダクションの読取ホットパス(`Store.load` / `Store.setState`)と (B) 検証(PBT)の実行時間である。前者は**単発 CLI プロセス内の一回限りの読取**、後者は**CI ブロッキング集合の実行時間**であり、要求される保証の性質が異なる。

| 面 | 要件 | 強制メカニズム | 本書の節 |
| --- | --- | --- | --- |
| (A) 読取ホットパス(`parseElectionFile` の追加コスト) | 明示 NFR なし。退行させないこと | なし(ゲート不在)— §2 で「ゲートを新設しない」根拠を書く | §2 |
| (B) 新規 PBT の実行時間 | requirements.md NFR-4: 新規 PBT ファイル群の `bun test` 直接実行が合計 **2秒以内** | PBT 4項規約(固定 seed / 既定 numRuns 100 / 反例ピン / `AMADEUS_PBT_DEEP` 階層)+ 直接実行の実測 | §3〜§5 |
| (B') CI 全体 | requirements.md NFR-5: 現行ブロッキング集合全緑の維持 | 既存 CI(`bash tests/run-tests.sh --ci` / `coverage:ci`)。本 unit は新規ジョブを作らない | §6 |

---

## 2. 読取ホットパス — 検証追加のコストと、ゲートを新設しない根拠

### 2.1 呼び出し形状(実測)

`Store.load` の呼び出し元は測定 ref で **14 箇所**(測定コマンド: `grep -rn "Store\.load(" packages/framework/core/tools/ scripts/ tests/ | wc -l` → `14`)。うちプロダクション側は `amadeus-election.ts` の各ハンドラ(`:138` / `:195` / `:254` / `:395` / `:431` / `:458` / `:473` / `:558`)と `amadeus-election-store.ts` 内部(`:580` / `:643`)である。

これらはすべて **`amadeus-election.ts` の CLI verb ハンドラ**であり、1プロセスの1 verb 実行あたり `election.json` を数回読む形状である。常駐サービス・ループ・バッチ走査の経路は存在しない(business-logic-model.md §1 の3層に閉じる境界と一致)。

### 2.2 入力規模の実測(現実コーパス)

| 指標 | 値 | 測定コマンド |
| --- | --- | --- |
| `election.json` の実在数 | 242 | `find amadeus/spaces/default/elections -name election.json \| wc -l` |
| 最大ファイルサイズ | 4,028 bytes(`260730-e-u8pre/election.json`) | `find … -exec wc -c {} \; \| sort -rn \| head -1` |
| `choices` 長の最大 | 8 | 全 242 件を JSON 解析して `choices.length` を出力し `sort -rn \| head -1` |
| `voters` 長の最大 | 3 | 同上(`voters.length`) |

`Election.parse` の計算量は `choices` 長 + `voters` 長に対する線形(`parseChoices` の `for` ループ 1 周 + `hasDuplicates` の `Set` 構築 2 回、`amadeus-election-model.ts:65` = `function hasDuplicates<T>(values: T[]): boolean {`)。実在最大が `choices=8` / `voters=3` である以上、この線形項が問題化する規模は現実に存在しない。

### 2.3 追加コストの実測(マイクロベンチ)

追加される検証は「既に JSON へ解析済みの値に対する `Election.parse` 1 回 + `VALID_STATES` の `Set.has` 1 回」である。実在最大ファイル(4,028 bytes)を入力に、`Election.parse` と、**既に読取経路に存在する** `JSON.parse`(`amadeus-election-store.ts:80` = `    return ok(JSON.parse(text) as T);`)を同条件で比較した。

測定スクリプト: record 外 scratch(`cid:requirements-analysis:scratch-script-discipline`)。N=100,000、ウォームアップ 1,000 回、2 回連続実行。

```
run 1  Election.parse: 0.145 us/call over 100000 calls
run 1  JSON.parse:     0.921 us/call over 100000 calls
run 2  Election.parse: 0.148 us/call over 100000 calls
run 2  JSON.parse:     0.936 us/call over 100000 calls
```

**結論(実測に接地した比):** 追加される検証は、同じ経路が既に必ず払っている `JSON.parse` の **約 1/6**(0.147 ÷ 0.929 ≈ 0.158 — 2 回の平均からの派生値。算出式: 各 run の平均 `(0.145+0.148)/2 = 0.1465`、`(0.921+0.936)/2 = 0.9285`)である。読取 1 回あたりの絶対増分は **0.15 マイクロ秒級**であり、プロセス起動・`existsSync` / `readFileSync` の syscall・`bun` のモジュールロードのいずれと比べても桁が下である。

`Set.has` 1 回(`VALID_STATES` は `:254` でモジュールスコープに 1 回だけ構築される `ReadonlySet`)の追加コストは上記より更に小さく、独立に測る意味のある量ではない。

### 2.4 性能ゲートを新設しない設計判断

`amadeus/spaces/default/memory/project.md` の `cid:nfr-design:c1` は「CLI や library の NFR 設計では、常駐 service 向けの cache・horizontal scaling・circuit breaker を機械的に適用せず、**決定的な file 境界と fail-closed 契約へ置き換える**」と定める。本 unit はこれに従い、読取ホットパスに対しては次を採る。

| 採らない | 採る | 根拠 |
| --- | --- | --- |
| `parseElectionFile` の実行時間ベンチ / 性能ゲートの新設 | ゲートなし。§2.3 の実測を設計根拠として記録するのみ | 単発 CLI・入力規模が実測上限 4KB / choices 8 / voters 3・追加コストが既存 `JSON.parse` の 1/6。ゲートの維持コストが検出しうるリスクを上回る |
| 検証結果のメモ化・キャッシュ | 毎回検証する | fail-closed 契約(INV-EL-1〜INV-EL-3)はキャッシュと両立しない。キャッシュ無効化は新しい非対称の発生源になる(ADR-4 Rationale 1「新しい検証ロジックを書かないことが最大の設計目標」の趣旨) |
| 「速い」等の定性目標 | 上限を置かない代わりに、置かない根拠を実測で書く | ideation/inception ガードレール「曖昧な表現は測定可能な閾値と対にしない限り避ける」— 閾値を持てないなら目標自体を置かない |

なお、baseline 相対のベンチ判定を設計しなかったことは `cid:code-generation:c1-benchmark-baseline-correlation-verify`(空ウィンドウ baseline は負荷と相関せず相対項が絶対判定へ無音退化する)とも整合する。相関を実証できる baseline 系列がこの経路には存在しない。

---

## 3. PBT の実行時間 — NFR-4 の合否基準と強制メカニズム

### 3.1 合否基準(requirements.md NFR-4 からの転記)

> 実行時間の合否基準: 新規 PBT ファイル群の `bun test` 直接実行の合計が **2秒以内**(実測基準: 既存 PBT 4本 = unit 側 t204/t352/setup-semver/setup-manifest の直接実行 151ms — `Ran 23 tests across 4 files. [151.00ms]`、測定 ref = 作業ツリー 2026-08-02。10倍超のマージンを持つ上限として設定した派生値)。

本 unit の対象ファイルは **2 本**(business-logic-model.md §6 Step 0 の予約: unit 側 `t416`、integration 側 `t417`)。

### 3.2 本 ref での再実測(近縁ファイルの実行時間)

NFR-4 の基準値は 2026-08-02 作業ツリーの測定である。本 ref で同種の実測を取り直した(いずれも `bun test <paths>` の直接実行、出力末尾行の転記)。

| 測定コマンド | 出力(転記) |
| --- | --- |
| `bun test tests/unit/t352-journal-codec.pbt.test.ts tests/unit/t204-audit-escape.pbt.test.ts` | `Ran 13 tests across 2 files. [113.00ms]` |
| `bun test tests/integration/t364-journal-v2.pbt.test.ts` | `Ran 29 tests across 1 file. [192.00ms]` |
| `bun test tests/integration/t235-election-store.integration.test.ts` | `Ran 10 tests across 1 file. [93.00ms]` |

読み方:

- unit 層の純関数 PBT 2 本で **113ms**。本 unit の `t416`(P-EL1 のみ、fs 非依存)はこれと同型で、プロパティ数はより少ない。
- 実 FS を触る PBT 1 本(`t364`、29 テスト)で **192ms**。本 unit の `t417`(P-EL2 + P-EL3 のピン + Step 1/3/5 の example)は `t364` より小さい規模になる。
- 本 unit が上書き対象とする既存の election store integration(`t235`、10 テスト)は **93ms**。

**予算の見積り(推定 — ラベル付き):** `t416 ≲ 113ms`(unit 2 本の合計を単独 1 本の上限として保守的に採る)、`t417 ≲ 192ms`(`t364` と同水準を上限として採る)。合計の推定上限は **≈ 305ms**。NFR-4 の 2 秒に対して **約 6.6 倍のマージン**(算出式: 2000 ÷ 305 ≈ 6.6 — 小数第1位まで)。

**この推定値は受け入れ基準に使わない**(`cid:nfr-requirements:estimates-not-acceptance-criteria`)。合否は実装後に `t416` / `t417` を直接実行した `Ran N tests across M files. [T]` の実測 `T` で判定する。

### 3.3 予算超過時の設計上の逃げ道(事前に固定する)

実測が 2 秒を超えた場合、以下の順で対処する。**プロパティを削る・numRuns を既定 100 未満へ下げる対処は採らない**(FR-4c の 4項規約違反になる)。

1. `t417` の各プロパティ内で作る一時ディレクトリを 1 プロパティ 1 回に集約する(fs 操作回数の削減。`Store.create` の呼び出しを固定 fixture 化)。
2. `invalidElectionFileArb` の 8 変換(domain-entities.md §6.2)を `fc.oneof` 1 プロパティに畳む(プロパティ本数を増やさない=`beforeEach` の FS 準備回数を増やさない)。
3. それでも超える場合は、**実装せず conductor へ申告**する(BR-ELRP-36)。閾値の緩和は requirements の変更であり実装者判断で行わない。

---

## 4. 決定性 — 固定 seed の設計

### 4.1 `PBT_SEED` の値域と衝突回避(実測)

測定コマンド `grep -rn "^const PBT_SEED" tests/` の出力(全件転記):

```
tests/unit/setup-semver.pbt.test.ts:41:const PBT_SEED = 0x5e_6970;
tests/unit/setup-manifest.pbt.test.ts:29:const PBT_SEED = 0x5e_6970;
tests/unit/t204-audit-escape.pbt.test.ts:38:const PBT_SEED = 0xa0_d17;
tests/unit/setup-plan-decisions.test.ts:32:const PBT_SEED = 0x5e_706c; // "Xpl"
tests/unit/t352-journal-codec.pbt.test.ts:25:const PBT_SEED = 16280702;
tests/integration/t364-journal-v2.pbt.test.ts:41:const PBT_SEED = 26072903;
```

宣言は **6 件**、distinct な値は **5 件**(測定コマンド: `grep -rh "^const PBT_SEED" tests/ | sed 's/;.*//' | sort -u` → 5 行。`0x5e_6970` が setup-semver / setup-manifest の 2 ファイルで共有)。

**上流からの精密化(逸脱ではない):** business-logic-model.md §6 Step 0 は既存 `PBT_SEED` を 5 ファイル分列挙するが、本 ref の全域 grep では `tests/unit/setup-plan-decisions.test.ts:32` の `0x5e_706c` を含む **6 ファイル**が実在する。実装時の独立再列挙で 1 件を追加した(`cid:requirements-analysis:enumeration-reverify-at-implementation`)。選定時は上記 **5 つの distinct 値すべて**と重複しないことを確認する。

### 4.2 決定性を成立させる機構(層別)

| 層 | 機構 | 決定性への寄与 |
| --- | --- | --- |
| seed | `const PBT_SEED = <新規値>;` をファイル冒頭に固定 | 赤が出た CI run と手元の再実行が同一系列を辿る |
| 実行回数 | PR CI は fast-check の既定 `numRuns` 100。`AMADEUS_PBT_DEEP=1`(または `"true"`)で深掘り階層へ | 既存 4 ファイルの `const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };` 様式を踏襲(`tests/unit/t204-audit-escape.pbt.test.ts:41` 実文) |
| 反例 | shrink 最小反例を example-based テストへ昇格(P-EL3) | seed を変えても回帰が残る |
| 生成器 | 一意性は `fc.uniqueArray` 等で**生成側から**保証(domain-entities.md §6.1) | 生成後フィルタによる試行数の揺れを作らない = 実行時間も決定的 |
| 時刻・環境 | 生成器は時刻・env・乱数(fast-check 外)を読まない | `election.json` の 5 フィールドはすべて生成器由来の純値 |

`t417` は実 FS を触るが、書込先はテストごとの一時ルートであり、生成入力から書込内容が一意に決まる。**FS が決定性を壊す面はディレクトリ名のみ**であり、これは assertion 対象に含まれない(P-EL2 の assertion は `loaded.ok === false` と `error === "corrupt"` の 2 点のみ — business-logic-model.md §5 P-EL2)。

### 4.3 深掘り階層の実行時間は本 unit の予算外

`AMADEUS_PBT_DEEP=1` の深掘り(`numRuns` を大きく取る階層)は PR CI のブロッキング集合に含まれない(opt-in、既存 4 ファイルのコメント実文 `// 4. DEEP RUNS (opt-in, no new CI job). Set AMADEUS_PBT_DEEP=1 to raise numRuns` — `tests/unit/setup-semver.pbt.test.ts:22`)。深掘りジョブの実行時間契約は `pbt-deep-ci` unit(services.md S2)の所有であり、本 unit は「深掘り階層に載る形式で書く」ことのみを負う。

---

## 5. CI 面での位置づけ

| 面 | 本 unit の追加 | 実行時間への影響 |
| --- | --- | --- |
| `bash tests/run-tests.sh --ci` | テストファイル 2 本(unit 1 / integration 1) | §3.2 の推定 ≈ 305ms 相当。既存スイート全体に対する比率は測定していない(推定を受け入れ基準にしない方針により、必要になった時点で実測する) |
| `coverage:ci` | 同上 + `parseElectionFile` の新規行が patch 母集団に入る | in-process 駆動(BR-ELRP-25)。spawn 経由の再計測を追加しないため、coverage 実行時間の増分はテスト 2 本分に留まる |
| 新規 CI ジョブ | **なし** | `timeout-minutes` 等のジョブ設定を本 unit で触らない。新規ワークフローを作らない(`cid:ci-pipeline:c2` — 既存 workflow が正本) |
| dist 再生成 | `bun scripts/package.ts` + `bun run promote:self`(7 ハーネス) | 開発者ローカルと `dist:check` の実行時間。既存手順であり本 unit は手順を増やさない |

---

## 6. 実読で確認した verbatim 断片(本書の引用元)

| 位置 | 実文 |
| --- | --- |
| `amadeus-election-store.ts:80` | `    return ok(JSON.parse(text) as T);` |
| `amadeus-election-store.ts:82` | `    return err("corrupt");` |
| `amadeus-election-store.ts:254` | `const VALID_STATES: ReadonlySet<string> = new Set<ElectionState>([` |
| `amadeus-election-store.ts:504` | `    const read = readJson<ElectionFile>(` |
| `amadeus-election-store.ts:515` | `    const read = readJson<ElectionFile>(path);` |
| `amadeus-election-store.ts:517` | `    const w = writeStoreFile(path, JSON.stringify({ ...read.value, state }, null, 2));` |
| `amadeus-election-model.ts:65` | `function hasDuplicates<T>(values: T[]): boolean {` |
| `amadeus-election-model.ts:77` | `  if (!Array.isArray(raw) || raw.length === 0) return null;` |
| `amadeus-election-model.ts:101` | `  parse(raw: unknown): Result<Election, "parse-failure"> {` |
| `tests/unit/t204-audit-escape.pbt.test.ts:41` | `const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };` |
| `tests/unit/setup-semver.pbt.test.ts:22` | `// 4. DEEP RUNS (opt-in, no new CI job). Set AMADEUS_PBT_DEEP=1 to raise numRuns` |

---

## 7. 上流からの逸脱

なし。§4.1 の `PBT_SEED` 実在ファイル数(5 → 6)は上流列挙の**精密化**であり設計判断への影響はない(選定制約は「既存 distinct 値と重複しない」で不変)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:28:14Z
- **Iteration:** 1
- **Scope decision:** none

数値・不変量・cid 遵守は模範的だが、consumes 5件の沈黙 Major と 6.5/6.6 丸め不一致 Minor で REVISE(GoA 5)。

### Findings

- [Major] 5成果物ヘッダが宣言 consumes 6件中 business-logic-model.md のみ列挙 — stage frontmatter の nfr-requirements 系5件への参照・N/A 根拠が沈黙(注: 実測では engine 解決済み directive の consumes は1件のみで sensors 60/60 PASSED — 残る実質は SKIP 根拠の明記)
- [Minor] performance-design.md — マージン表記 6.5 vs 算出式 6.6 の不一致

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:31:54Z
- **Iteration:** 2
- **Scope decision:** none

Major(consumes 沈黙)は SKIP 補足注記で、Minor(丸め)は 6.6 統一で閉包。是正 diff に新規誤りなし。GoA 1。

### Findings

- None
