# Scalability Design — unit `election-readpath`(#1980)

上流入力(consumes 全数): business-logic-model.md(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

本書は business-logic-model.md §1(本 unit の3層境界と `depends_on: []` の位置づけ)、§3(`parseElectionFile` の計算構造)、§5(P-EL1〜P-EL3)、§6 Step 10(出荷条件)に依拠する。同 unit の domain-entities.md §6(生成器の生成境界)と business-rules.md(BR-ELRP-14〜18 の PBT 規約)も併読した — **宣言外の追加入力**。

測定 ref: worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`。

---

## 1. 結論 — 一般的な意味での scalability は非適用

**horizontal scaling・auto-scaling・負荷分散・接続プール・レート制限・キャッシュ層は、本 unit に対して非適用である。** 根拠は `amadeus/spaces/default/memory/project.md` の `cid:nfr-design:c1`:

> CLI や library の NFR 設計では、常駐 service 向けの cache、horizontal scaling、circuit breaker を機械的に適用せず、決定的な file 境界と fail-closed 契約へ置き換える。

本 unit が触る面は (A) 単発 CLI プロセス内のファイル読取(`Store.load` / `Store.setState`)と (B) CI 上のテスト実行のみであり、いずれも「同時接続数」「スループット」「レイテンシ分布」という語彙が意味を持つ実行形態ではない。

以下、非適用の根拠を面ごとに実測で示し、置換として採る「決定的な file 境界と fail-closed 契約」および「規模が増えたときに何が線形に効くか」を記録する。

---

## 2. 面 (A) プロダクション読取 — スケール軸の実測

### 2.1 実行形態

| 軸 | 実測・実態 | 根拠 |
| --- | --- | --- |
| 実行形態 | 単発 CLI プロセス。常駐なし・デーモンなし | `Store.load` の呼び出し元はすべて `amadeus-election.ts` の verb ハンドラ(`:138` / `:195` / `:254` / `:395` / `:431` / `:458` / `:473` / `:558`)と store 内部(`:580` / `:643`) |
| 呼び出し点数 | **14**(測定コマンド: `grep -rn "Store\.load(" packages/framework/core/tools/ scripts/ tests/ \| wc -l` → `14`。テストを含む全域) |
| 同時実行 | 単一書き手前提(決定 D-09)。ロックなし | `amadeus-election-store.ts:16` 実文 `// Single writer (conductor) by decision D-09 — no locking; torn writes are` |
| ネットワーク境界 | **なし** | `amadeus-election-model.ts:4-5` 実文 `// ballot acceptance. No fs/network/clock access — every fallible API returns a` / `// discriminated-union Result and never throws (functional-domain-modeling-ts).` |

同時実行を前提としない設計であるため、「並行度を上げて捌く」という設計空間そのものが存在しない。単一書き手前提の変更は決定 D-09 の改訂であり本 unit のスコープ外(BR-ELRP-29 / BR-ELRP-35)。

### 2.2 データ規模の実測と増加時の挙動

| 指標 | 実測値 | 測定コマンド |
| --- | --- | --- |
| `election.json` の実在数 | 242 | `find amadeus/spaces/default/elections -name election.json \| wc -l` |
| 最大ファイルサイズ | 4,028 bytes | `find … -exec wc -c {} \; \| sort -rn \| head -1` |
| `choices` 長の最大 | 8 | 全 242 件を JSON 解析し `choices.length` を `sort -rn \| head -1` |
| `voters` 長の最大 | 3 | 同上(`voters.length`) |

**増加時に効く項(線形性の記録):**

| 増える量 | `parseElectionFile` への影響 | 計算量 |
| --- | --- | --- |
| `choices` 長 `c` | `parseChoices` の `for` 1 周 + `internalNo` の `Set` 構築 1 回 | O(c) |
| `voters` 長 `v` | `isStringArray` の `every` 1 周 + `hasDuplicates` の `Set` 構築 1 回 | O(v) |
| `election.json` の総数 `n` | **影響なし** — 1 回の `Store.load` は 1 ファイルしか読まない | O(1)(件数に対して) |
| `state` 語彙数 | `VALID_STATES` は `:254` でモジュールスコープに 1 回だけ構築される `ReadonlySet`。照合は `Set.has` 1 回 | O(1) |

`hasDuplicates`(`amadeus-election-model.ts:65` 実文 `function hasDuplicates<T>(values: T[]): boolean {`)は `new Set(values).size !== values.length` であり、二重ループではない。したがって **`c` や `v` が増えても二次オーダーへ退化しない**。これが本 unit で記録すべき唯一の「スケール特性」である。

registry(`elections.json`)は 242 行規模へ線形に伸びるが、これは `resolveElectionDir` / `readElectionsRegistry`(`:283`)の関心であり **本 unit は変更しない**(BR-ELRP-30 の隣接境界不干渉)。registry の走査が問題化したときは別 intent の対象になる。

### 2.3 置換として採る設計(cid:nfr-design:c1 の適用)

| 常駐 service 向けの機構 | 本 unit が代わりに置くもの |
| --- | --- | 
| キャッシュ層(読取結果のメモ化) | **毎回検証する fail-closed 契約**(INV-EL-1〜INV-EL-3)。キャッシュは無効化ロジックという新しい非対称の発生源になる |
| circuit breaker / リトライ | **決定的なエラー写像**(§ security-design.md §4 の表)。`not-found` / `io-error` / `corrupt` を呼び出し元へそのまま返し、store 層でリトライしない |
| コネクションプール・バックプレッシャ | **決定的な file 境界** — 1 verb 実行 = 1 ファイル読取。キューイングの対象がない |
| 水平分割・シャーディング | election ごとのディレクトリ分割が既に存在(`<electionId>/election.json`)。本 unit はこのレイアウトを変更しない |

---

## 3. 面 (B) 検証(PBT)— スケールするのは numRuns だけ

読取ホットパスと違い、PBT には**明示的にスケールする軸が 1 本だけ存在する**: `numRuns`。

### 3.1 二階層の実行予算

| 階層 | `numRuns` | 発動 | 実行時間の契約 |
| --- | --- | --- | --- |
| PR CI(既定) | fast-check 既定の **100** | 常時 | requirements.md NFR-4: 新規 PBT ファイル群の直接実行 合計 **2秒以内** |
| 深掘り | 大きな予算(既存 4 ファイルは `50_000`) | `AMADEUS_PBT_DEEP=1` または `"true"` | **本 unit の予算外**。`pbt-deep-ci` unit(services.md S2)が所有 |

既存様式の実文(`tests/unit/t204-audit-escape.pbt.test.ts:41`):

```
const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };
```

同 `:39` = `const DEEP = process.env.AMADEUS_PBT_DEEP === "1" || process.env.AMADEUS_PBT_DEEP === "true";`

本 unit の `t416` / `t417` はこの様式をそのまま採る(BR-ELRP-14〜18 の 4項規約)。**新しい階層・新しい env 変数・新しい CI ジョブを作らない**(`cid:ci-pipeline:c2` — 既存 workflow が唯一の正本)。

### 3.2 numRuns 増加時の線形性

| プロパティ | 1 run あたりのコスト | `numRuns` を 100 → 50,000 にしたときの支配項 |
| --- | --- | --- |
| P-EL1(unit / fs 非依存) | 生成 + `JSON.stringify` / `JSON.parse` + `Election.parse` 1 回 | 純計算。線形にスケールし、深掘り階層で問題なく回る |
| P-EL2(integration / 実 FS) | 生成 + `writeFileSync` 1 回 + `Store.load` 1 回 | **`writeFileSync` の syscall が支配項**。線形だが係数が P-EL1 より大きい |

深掘り階層での P-EL2 の実行時間は `pbt-deep-ci` unit のジョブ予算の問題であり、本 unit は「線形にスケールする形で書く」ことだけを負う。具体的には:

- **1 run あたりのファイル書込を 1 回に保つ**。プロパティ本体で `Store.create` を呼び直さない(fixture として 1 回作り、`election.json` の上書きだけを run ごとに行う)。
- 生成器は**生成側から一意性を保証**し、生成後フィルタ(`fc.pre` による棄却)を使わない(domain-entities.md §6.1)。フィルタは実効試行数を非決定的に増やし、`numRuns` と実行時間の線形関係を壊す。

この 2 点が、numRuns を上げたときに実行時間が予測可能に伸びるための設計条件である。

### 3.3 テストファイル数の増加(本 unit の寄与)

本 unit が CI ブロッキング集合へ加えるのは **2 ファイル**(`t416` / `t417`)。既存スイート全体に対する増分比率は測定していない — 推定を受け入れ基準に使わない方針(`cid:nfr-requirements:estimates-not-acceptance-criteria`)により、必要になった時点で `bash tests/run-tests.sh --ci` の実測で確認する。

---

## 4. 面 (C) 出荷面 — 7 ハーネス投影の「面数」スケール

本 unit は 6 Unit のうち**唯一 `packages/framework/core/` を触る**(business-logic-model.md §6 Step 10)。そのため 1 つの正本変更が **7 つの dist ツリー**へ投影される。

測定コマンド `ls dist/` の出力:

```
claude  codex  cursor  kimi  kiro  kiro-ide  opencode  plugins
```

= ハーネス **7 面**(`claude` / `codex` / `cursor` / `kimi` / `kiro` / `kiro-ide` / `opencode`)+ `plugins`(ハーネスではない)。

これは「負荷のスケール」ではなく**投影面数のスケール**であり、性能ではなく信頼性の問題として reliability-design.md §3 で扱う。本書での記録は以下 1 点に留める:

- 投影面数が増えても本 unit の作業量は `bun scripts/package.ts` + `bun run promote:self` の **2 コマンドで一定**である(面ごとの手作業がない)。5 面で止めると `kiro` / `kiro-ide` が DIFFERS になる(project.md Mandated)ため、面の部分実行という「手抜きのスケール」は存在しない。

---

## 5. N/A の明示(反証可能な非適用根拠)

| 一般的な scalability 論点 | 判定 | 反証可能な根拠 |
| --- | --- | --- |
| horizontal scaling / auto-scaling | **N/A** | 常駐プロセスが存在しない。`Store.load` の全呼び出し元 14 箇所はすべて単発 CLI verb ハンドラ(§2.1) |
| ロードバランシング | **N/A** | ネットワーク境界なし(`amadeus-election-model.ts:4-5` 実文) |
| コネクションプール | **N/A** | DB・外部サービス接続なし。I/O は `node:fs` のみ |
| キャッシュ層 | **意図的に採らない** | fail-closed 契約と両立しない(§2.3)。`cid:nfr-design:c1` |
| circuit breaker | **意図的に採らない** | 同上。エラーは呼び出し元へそのまま返す |
| レート制限・スロットリング | **N/A** | 単一書き手前提(決定 D-09)。競合する呼び出し元が存在しない |
| データ分割・シャーディング | **既存で充足** | election ごとのディレクトリ分割が既存。本 unit は変更しない |
| キューイング・非同期化 | **N/A** | 全 API が同期。`Result` 型で fallible を表現し例外を投げない設計(同上実文) |

いずれも「未検証だから N/A」ではなく、**該当する実行形態が存在しないことを実測で確認したうえでの非適用**である。

---

## 6. 上流からの逸脱

なし。
