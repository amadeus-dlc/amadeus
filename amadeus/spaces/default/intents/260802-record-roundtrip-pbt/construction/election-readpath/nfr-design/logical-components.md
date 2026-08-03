# Logical Components — unit `election-readpath`(#1980)

上流入力(consumes 全数): business-logic-model.md(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

本書は business-logic-model.md §1(3層境界)、§3(`parseElectionFile` の合成構造と `readJson` 不変)、§4.2(INV-EL-1〜INV-EL-6)、§5(P-EL1〜P-EL3 の層)、§6 Step 0〜Step 11、§7(エラー写像)に依拠する。同 unit の domain-entities.md §1(型の所有マップ)/ §6(生成器のシグネチャと生成境界)、business-rules.md(BR-ELRP-1〜36)も併読した — **宣言外の追加入力**。

本書のインベントリ(§4)は、performance-design.md / security-design.md / scalability-design.md / reliability-design.md の設計判断が確定した**後**に導出した(`cid:nfr-design:c7` — 設計途中の早期断定を避ける)。

測定 ref: worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`。

---

## 1. コンポーネント図(論理)

```
┌─ プロダクション(packages/framework/core/tools/) ─────────────────┐
│                                                                   │
│  amadeus-election-model.ts        [不変 — 参照のみ]               │
│    Election.parse (:101)  ◄────────────┐                          │
│    parseChoices (:76) / hasDuplicates (:65)                       │
│                                        │ 合成(検証を書かない)    │
│  amadeus-election-store.ts        [本 unit の唯一の変更対象]      │
│    readJson<T> (:71-84)           [不変 — 呼び方のみ変更]         │
│    VALID_STATES (:254)            [不変 — 参照のみ] ──┐           │
│    ★ parseElectionFile            [新設 private]  ◄───┴───────┐   │
│    Store.load (:503)              [読み口を差し替え] ─────────┤   │
│    Store.setState (:512)          [読み口を差し替え] ─────────┘   │
│    Store.create (:458)            [不変 — 書き手側]               │
└───────────────────────────────────────────────────────────────────┘
                              ▲ in-process import(dist を挟まない)
┌─ 検証(tests/) ──────────────┴────────────────────────────────────┐
│  tests/helpers/arbitraries/election.ts   [新設]                   │
│    validElectionArb / validElectionFileArb / invalidElectionFileArb│
│                          │                                        │
│  tests/unit/t416-…       ├─► P-EL1  round-trip(純関数)          │
│  tests/integration/t417-…└─► P-EL2  fail-closed(実 FS)          │
│                             P-EL3  #1459 反例ピン                 │
└───────────────────────────────────────────────────────────────────┘
                              │ 正本 → 生成
┌─ 出荷(生成物 — 手編集禁止) ─┴────────────────────────────────────┐
│  dist/{claude,codex,cursor,kimi,kiro,kiro-ide,opencode}/  [7 面]  │
│  self-install ツリー                                              │
└───────────────────────────────────────────────────────────────────┘
```

---

## 2. モジュール別の責務と保証(層別 — 一枚岩の断定をしない)

`cid:nfr-design:c4` に従い、モジュールごとに「保証する機構」と「保証しない範囲」を対で書く。全称的な「構造的に保証される」という記述は用いない。

### 2.1 `amadeus-election-model.ts`(不変・参照のみ)

| 項目 | 内容 |
| --- | --- |
| 責務 | ドメイン定義の唯一のバリデータ。fs / network / clock を知らない(`:4-5` 実文 `// ballot acceptance. No fs/network/clock access — every fallible API returns a` / `// discriminated-union Result and never throws (functional-domain-modeling-ts).`) |
| 保証する | `Election.parse`(`:101`)を通った値は 5 フィールド(`electionId` / `kind` / `question` / `choices` / `voters`)のみを持ち、#1459 の 3 形(重複 internalNo / 空 choices / 重複 voter)を含まない |
| 保証しない | `state` の妥当性(ストレージ層の関心)。ディスク上のファイルが検証を経ていること(呼ばれなければ何も起きない) |
| 本 unit の変更 | **なし**。`Election.parse` を `state` 込みへ拡張しない(ADR-4 代替 C の却下、BR-ELRP-31) |

### 2.2 `readJson<T>`(`:71-84`、不変・呼び方のみ変更)

| 項目 | 内容 |
| --- | --- |
| 責務 | ファイルの存在確認・読取・JSON 構文解析。**意味的検証はしない** |
| 保証する | `not-found`(`:72`)/ `io-error` / `corrupt`(構文、`:82`)の 3 種の失敗を型付きで返す |
| 保証しない | 返り値が `T` であること。`:80` = `    return ok(JSON.parse(text) as T);` の `as T` は実行時に何も検査しない |
| 本 unit の変更 | 関数本体は**不変**(requirements.md A-3 / ADR-4 Decision)。呼び出し側の型引数を `ElectionFile` → `unknown` へ変えるのみ |
| 波及の非拡大 | 4 境界(election / ledger / pending / tally / timeline)のうち election 以外は現状のまま。`:80` の `as T` は残るため `cast-guard` unit のガード母集団は不変(components.md U4 依存節「初期値 33/18 は不変」) |

### 2.3 `parseElectionFile`(新設 private)

| 項目 | 内容 |
| --- | --- |
| シグネチャ | `parseElectionFile(raw: unknown): Result<ElectionFile, StoreError>` |
| 可視性 | store 内 **private**(export しない)。ADR-4 の裁定 |
| 責務 | 既存 `Election.parse` と既存 `VALID_STATES`(`:254`)の**合成器**。検証ロジックを新規に実装しない(BR-ELRP-2) |
| 手順 | (1) `Election.parse(raw)` — 失敗は `err("corrupt")` へ写像 / (2) `raw.state` を `VALID_STATES` で照合 — 不一致・非文字列は `err("corrupt")` / (3) 合成 `ok({ ...election, state })` |
| 保証する | 返り値 `ok` の `ElectionFile` は、定義部が `Election.parse` を通過し、`state` が `VALID_STATES` の元である |
| 保証しない | 呼び出し元がこれを**呼ぶ**こと(呼び出しは L2 の読み口一本化が担保)。同一モジュール内で `as ElectionFile` を書いて迂回する経路 |
| 実装制約 | 説明コメントは関数宣言**直上**に置く(`cid:code-generation:bun-inbody-comment-da0`)。多行の関数呼び出し引数は単一行へ collapse(`cid:code-generation:bun-multiline-arg-da0`)。`scripts/<file>` 形のパストークンをコメント・文字列に書かない(`t258-boundary-guard` / BR-ELRP-26) |

### 2.4 `Store.load`(`:503`)/ `Store.setState`(`:512`)

| 項目 | 内容 |
| --- | --- |
| 変更 | 読み口を `readJson<ElectionFile>` → `readJson<unknown>` + `parseElectionFile` へ差し替え(2 箇所を**同時に**) |
| 保証する | store を経由する `election.json` の読み取りは検証を経る。`setState` は検証済みの定義部のみを書き戻す(INV-EL-3) |
| 保証しない | store を経由しない読み取り。実在例: `scripts/amadeus-election-migrate.ts:229` 実文 `      const raw = JSON.parse(readFileSync(join(dir, "election.json"), "utf8")) as Record<`(移行ツール独自の読み口、本 unit 対象外 — BR-ELRP-23) |
| 変更しない | `Store.create`(書き手側は既に `Election.parse` を通る)、`resolveElectionDir`(`:326`)の未登録 id throw(`:341`)、`updateElectionStatus` の registry 同期、エラー種別の集合(INV-EL-4) |
| 対称性 | 2 箇所の同時変更が `cid:requirements-analysis:symmetric-pair-review`(write⇔check の対操作)の充足点。片方だけの変更は「読んだ側が壊れる」を直して「破損を書き戻す」を残す |

### 2.5 `tests/helpers/arbitraries/election.ts`(新設)

| 項目 | 内容 |
| --- | --- |
| 公開シグネチャ(domain-entities.md §6 から転記) | `export const validElectionArb: fc.Arbitrary<Election>;` / `export const invalidElectionFileArb: fc.Arbitrary<unknown>;` / `export const validElectionFileArb: fc.Arbitrary<unknown>;` |
| 責務 | 妥当値の生成と、妥当基底値から**1 不変条件だけを壊す**変換(8 種)の提供 |
| 保証する | 生成される妥当値が `Election.parse` の受理ドメインに収まる(一意性は `fc.uniqueArray` 等で生成側から保証、`description` はキーごと省略) |
| 保証しない | **なぜ非適合なのかの判定**。棄却規則をテスト側で再実装しない(BR-ELRP-9、`cid:build-and-test:pbt-oracle-cancellation`) |
| 非交差 | 同ディレクトリの既存 `semver.ts` / `manifest.ts` および `state-pbt` unit が置く `state-receipts.ts` / `state-field.ts` と**ファイル単位で非交差**(unit-of-work-dependency.md「helpers 内は別ファイル」) |
| 健全性の 1 点 | 変換 6(`state` を未知文字列にする)は、生成文字列が偶然 `VALID_STATES` の 7 値に一致しないことを**生成側で**保証する。これは棄却規則の再実装ではなく「意図した非適合クラスを実際に作れていること」の保証(domain-entities.md §6.2) |

### 2.6 `tests/unit/t416-…`(P-EL1)

| 項目 | 内容 |
| --- | --- |
| 層 | unit(純関数のみ・fs 非依存)。`cid:code-generation:fs-tests-integration-first` |
| プロパティ | `∀ e ∈ validElectionArb: Election.parse(JSON.parse(JSON.stringify(e))) = ok(e)` |
| 保証する | 符号化層の全単射性(round-trip)。メタモルフィックであり独立オラクルを持たない |
| 保証しない | 破損入力の棄却(P-EL2 の担当)。現行実装でも成立するプロパティであり、**本 unit の挙動変更を証明しない** |
| 赤時の扱い | 実装ではなく**生成器を直す**(BR-ELRP-20) |
| 規約 | 固定 `PBT_SEED`(distinct 既存 5 値と非重複)/ 既定 `numRuns` 100 / `AMADEUS_PBT_DEEP` 階層(既存様式 `tests/unit/t204-audit-escape.pbt.test.ts:41` 実文 `const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };`) |

### 2.7 `tests/integration/t417-…`(P-EL2 / P-EL3 + TDD の example 群)

| 項目 | 内容 |
| --- | --- |
| 層 | integration(実 FS)。既存 `tests/integration/t235-election-store.integration.test.ts:2` 実文 `// Layer: integration (touches a tmp elections root — fs-tests-integration-first).` と同じ層規約 |
| プロパティ | `∀ raw ∈ invalidElectionFileArb: 書込 → Store.load(...).ok === false ∧ error === "corrupt"` |
| 保証する | 生成器が到達する 8 変換クラスでの棄却。#1459 の 3 反例が seed 非依存で固定される(P-EL3) |
| 保証しない | 生成器が到達しない未知の破損形。`Store` 外の読み口 |
| in-process 駆動 | `Store.load` / `Store.setState` を直接呼ぶ(spawn しない)。integration 層に置いたまま lcov が有効(`cid:code-generation:fs-tests-integration-first` の追補 — 計測の軸と配置の軸は独立) |
| 前提 | `Store.create` で作った election の `election.json` を上書きしてから読む(未登録 id は `:341` で throw するため) |

### 2.8 出荷面(生成物)

| 項目 | 内容 |
| --- | --- |
| 対象 | `dist/{claude,codex,cursor,kimi,kiro,kiro-ide,opencode}/` の **7 面** + self-install ツリー(測定コマンド `ls dist/` → 上記 7 + `plugins`) |
| 生成手順 | `bun scripts/package.ts` + `bun run promote:self` |
| 検査 | `"dist:check": "bun scripts/package.ts --check"` / `"promote:self:check": "bun scripts/promote-self.ts --check"`(package.json 実読) |
| 保証する | 正本と生成物のバイト一致(drift ゼロ) |
| 保証しない | 正本自体の正しさ(それは §2.1〜2.7 の責務) |
| 禁止 | `dist/` の手編集(project.md Forbidden)。Red→Green ループ中の dist 再生成(ステールバイナリの偽緑/偽赤 — BR-ELRP-19) |

---

## 3. 依存方向と情報隠蔽

```
tests/unit/t416      ──► arbitraries/election.ts ──► amadeus-election-model.ts
tests/integration/t417 ──► arbitraries/election.ts
                       └─► amadeus-election-store.ts ──► amadeus-election-model.ts
```

| 原則 | 本 unit での成立 |
| --- | --- |
| 循環依存なし | `store → model` の単方向。`model` は `store` を知らない(fs を知らないため知りようがない) |
| 情報隠蔽 | `parseElectionFile` は private。外部からは `Store.load` / `Store.setState` の**戻り値の型**だけが見える。新しい公開 API を増やさない |
| 狭い API | 本 unit が増やす公開シンボルは `tests/helpers/arbitraries/election.ts` の 3 つのみ(§2.5)。プロダクション側の公開面は**増分ゼロ** |
| 変更理由の凝集 | 「election 定義の受理規則が変わったとき」に変わるのは `amadeus-election-model.ts` の 1 箇所。`parseElectionFile` は合成器であるため追従不要 |
| Parse, Don't Validate | `readJson<unknown>` → `parseElectionFile` → `ElectionFile` の一方向。検証済みであることを型が運ぶ(security-design.md §3.2) |
| Tell, Don't Ask | 呼び出し元は「妥当か?」を尋ねてから使うのではなく、`Result` を受けて分岐する。`ElectionFile` 値を得た時点で妥当性は済んでいる |

---

## 4. 変更ファイル・インベントリ(全設計判断の確定後に導出)

`cid:nfr-design:c7` に従い、本節は performance / security / scalability / reliability の 4 設計が確定した後に導出した。

### 4.1 プロダクション

| ファイル | 変更種別 | 内容 |
| --- | --- | --- |
| `packages/framework/core/tools/amadeus-election-store.ts` | 変更 | `parseElectionFile` 新設 / `Store.load`(`:503-504`)と `Store.setState`(`:512-517`)の読み口差し替え。`readJson` 本体・`VALID_STATES`・`Store.create` は不変 |

**プロダクション変更ファイルは 1 件**(上表の行数からの機械的再計上 — `cid:requirements-analysis:ledger-count-mechanical-recalc`)。`amadeus-election-model.ts` は**参照のみで差分ゼロ**であるため変更ファイルに数えない。

### 4.2 テスト

| ファイル | 変更種別 | 内容 |
| --- | --- | --- |
| `tests/helpers/arbitraries/election.ts` | 新規 | 3 arbitrary(§2.5) |
| `tests/unit/t416-…` | 新規 | P-EL1 |
| `tests/integration/t417-…` | 新規 | P-EL2 / P-EL3 / Step 1・3・5 の example |

**テスト新規ファイルは 3 件**(同上、機械的再計上)。テスト番号は business-logic-model.md §6 Step 0 の予約(`t416` / `t417`)を採り、**再接地時は固定 base SHA の `tests/` 実測で再確認**する(`cid:code-generation:c1-tnnn-collision-on-regrounding`)。HEAD 実測の最大既存番号は上流 FD の測定(`t415`)を踏襲する。

### 4.3 生成物・台帳(手順の産物)

| ファイル群 | 変更種別 | 契機 |
| --- | --- | --- |
| `dist/<harness>/**` × 7 面 | 再生成 | `bun scripts/package.ts` |
| self-install ツリー | 再生成 | `bun run promote:self` |
| `tests/.coverage-patch-allowlist.json` | 行ピン remap(**条件付き**) | 行シフトが生じた場合のみ。対象は `:94` `    "lines": "476-477",` と `:100` `    "lines": "491",` の 2 件(reliability-design.md §4.3) |

`.coverage-patch-allowlist.json` の変更は「必ず起きる」とは断定しない — 挿入位置に依存する。実装時の行マップで判定する。

### 4.4 変更しないファイル(明示)

| ファイル | 理由 |
| --- | --- |
| `packages/framework/core/tools/amadeus-election-model.ts` | 検証ロジックを新規に書かない設計の帰結(ADR-4 Rationale 1)。`Election.parse` の `state` 拡張は却下済み(代替 C) |
| `scripts/amadeus-election-migrate.ts` | 移行ツール独自の読み口。`Store` を経由しない(BR-ELRP-23) |
| `packages/framework/core/tools/amadeus-state.ts` | state 境界は `state-pbt` unit の所有(BR-ELRP-32) |
| `tests/unchecked-cast-guard.ts` 等 | `cast-guard` unit の所有(BR-ELRP-33) |
| `.github/workflows/**` | 新規 CI ジョブを作らない(`cid:ci-pipeline:c2`)。深掘り階層は `pbt-deep-ci` unit の所有 |

---

## 5. ゲート対応表(どのコンポーネントがどのゲートに接触するか)

| ゲート | 接触するコンポーネント | 本書の根拠節 |
| --- | --- | --- |
| `dist:check` / `promote:self:check` | §2.8(core 正本を触る唯一の unit) | §2.8 |
| coverage patch(`bun tests/coverage-patch-gate.ts --check`) | §2.3 の新規行 × §2.7 の in-process 駆動 | reliability-design.md §4.2 |
| `t258-boundary-guard` | §2.3 のコメント文言 | §2.3 実装制約 |
| complexity / relative coverage / plugin-conformance-e2e | 既存ブロッキング集合(requirements.md NFR-5) | reliability-design.md §1 R-3 |
| PBT 4 項規約 | §2.6 / §2.7 | reliability-design.md §3 |
| 実行時間(NFR-4: 2 秒以内) | §2.6 / §2.7 | performance-design.md §3 |
| 既存 election テスト群(t234〜t262) | §2.4 の挙動変更 | reliability-design.md §5 |
| walking skeleton ゲート | unit 全体(Bolt 1 単独 PR) | reliability-design.md §7 |

---

## 6. 上流からの逸脱

なし。§4 のインベントリは上流(components.md / component-methods.md / decisions.md)の裁定をファイル単位へ展開したものであり、新しい変更対象を追加していない。§4.3 の allowlist 行ピン remap を「条件付き」と記したのは、断定的インベントリを設計途中で書かない方針(`cid:nfr-design:c7`)に従った精密化であり、上流の出荷条件(business-logic-model.md §6 Step 10 の表)を弱めるものではない — 手順自体は無条件に実施し、結果として差分が出るかが条件依存である。
