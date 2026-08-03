# Security Design — unit `election-readpath`(#1980)

上流入力(consumes 全数): business-logic-model.md(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

本書は business-logic-model.md §2(現行フロー = 無検査キャストの素通り)、§3(改修後フローの `parseElectionFile` 3手順)、§4.2(INV-EL-1〜INV-EL-6)、§5 P-EL2 / P-EL3、§7(エラー写像表)に依拠する。同 unit の business-rules.md(BR-ELRP-1〜2 の一本化規則、BR-ELRP-9 のオラクル非再実装、BR-ELRP-29〜31 のスコープ規則)と domain-entities.md §6.2(非適合入力の生成境界)も併読した — **宣言外の追加入力**。

測定 ref: worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`(FD の ref `c8702be09` からの `git diff --stat … -- packages/framework/core/tools/ tests/ .github/workflows/` は空)。file:line と verbatim 断片はすべて本 ref の実読。

---

## 1. 本 unit における「security」の意味

本 unit は認証・認可・秘匿情報を扱わない。したがって一般的な意味でのアクセス制御設計は非適用である。**本 unit の security 面は「信頼できない入力の受理境界」に一点集中する** — すなわち、ディスク上の `election.json` を**信頼された構造として無検査に受理していた**箇所を、fail-closed な parse 境界へ変える設計である。

この位置づけは construction ガードレール「システム境界ではすべての入力を検証・サニタイズする」と、inception ガードレールの設計原則 **Parse, Don't Validate**(「検証して証明を捨てるのではなく、検証済みであることを型で運ぶパース関数にする。無効状態は表現不能にする」)に直接対応する。

### 1.1 なぜ「破損台帳の棄却」が security 面なのか

`election.json` は選挙の**定義**(`choices` / `voters`)を保持する唯一の正本であり、下流の集計・定足数判定はこの値だけを見る。定義が壊れた状態で受理されると、集計結果そのものが壊れる。既存コードのコメントがこの因果を明記している(`amadeus-election-model.ts:69-75` 実読、verbatim):

```
// #1459: the definition is the only source of choices and voters downstream, so
// three shapes that used to pass are rejected at the parser (parse-don't-validate,
// no corrupt Election value is constructible): a duplicated choice internalNo
// splits one choice into two ChoiceCount rows counting the same ballots, turning
// a unanimous vote into a tie hold; an empty choice list degenerates the same way
// (top = 0, no leader); a duplicated voter inflates quorum (voters.length) and
// leaves the pending set (voters.filter) permanently unsatisfiable.
```

すなわち破損定義の受理は「**集計結果の改変**(全会一致が同数 hold に化ける)」と「**進行不能化**(定足数が満たせなくなる)」を引き起こす。これは可用性と結果完全性に対する影響であり、機微情報の漏洩ではないが、`amadeus/spaces/default/memory/team.md` の重大度定義でいう **S1-FATAL(監査・ゲート整合性の破壊)** の系に属する。本設計はこの受理境界を閉じる。

---

## 2. 現行の欠陥 — 非対称な信頼境界

`Election.parse`(`amadeus-election-model.ts:101` = `  parse(raw: unknown): Result<Election, "parse-failure"> {`)は #1459 で硬化済みだが、**書き手側だけがこれを通り、読み戻し側が素通りする**。

```
[書込]  Election.parse ──► 硬化済み ──► writeStoreFile(election.json)
[読取]  readJson<ElectionFile> ──► :80  return ok(JSON.parse(text) as T);   ← 無検査キャスト
                                          └ 構文エラーだけが :82 err("corrupt")
```

`:80` の `as T` は TypeScript の型注釈にすぎず、実行時には**何も検査しない**。したがって:

| 攻撃面・事故面 | 現行の帰結 |
| --- | --- |
| 手編集された `election.json`(構文は妥当・定義が不正) | 素通りして集計へ流れる |
| 過去のバグ(#1459 硬化以前)で書かれた破損定義 | 素通りする。硬化は既存ファイルに遡及しない |
| 外部プロセス・並行書き込みによる破損 | 素通りする |
| `Store.setState`(`:515` = `    const read = readJson<ElectionFile>(path);`)経由の再書込 | `:517` = `    const w = writeStoreFile(path, JSON.stringify({ ...read.value, state }, null, 2));` により、**不正な定義を検証なしで再シリアライズしてディスクへ固定する** |

最後の行が最も重い。読取の非検査は「読んだ側が壊れる」だけだが、`setState` の非検査は**破損を正本へ書き戻して永続化する**。business-logic-model.md §4.2 INV-EL-3 と `cid:requirements-analysis:symmetric-pair-review`(write⇔check の対操作対称性)が要求するのはこの対の閉包である。

---

## 3. 設計 — fail-closed な受理境界

### 3.1 唯一の受理点

`parseElectionFile(raw: unknown): Result<ElectionFile, StoreError>` を store 内 private 関数として新設し、`Store.load`(`:503`)と `Store.setState`(`:512`)の **2 読み口が例外なくこれを経由する**(decisions.md ADR-4、BR-ELRP-1 / BR-ELRP-2)。

```
readJson<unknown>(path) ──► ok(raw: unknown)
                                │
                       parseElectionFile(raw)
                                │
    (1) Election.parse(raw)  ── err("parse-failure") ──► err("corrupt")
                                │ ok(election)
    (2) raw.state ∈ VALID_STATES ── 否 ──────────────► err("corrupt")
                                │ 是
    (3) ok({ ...election, state })
```

**設計上の核: 新しい検証ロジックを書かない。** `parseElectionFile` は既存 `Election.parse` と既存 `VALID_STATES`(`:254` = `const VALID_STATES: ReadonlySet<string> = new Set<ElectionState>([`)の**合成器**にすぎない。security 観点でこれが重要なのは、検証を再実装すると**書き手側の受理集合と読み手側の受理集合がずれる**ためである — それは今まさに直そうとしている非対称の再生産になる。ADR-4 Rationale 1 の「書けばそれ自体が発行側とずれる新しい非対称になる」がこの帰結を述べている。

### 3.2 型による受理集合の運搬(Parse, Don't Validate)

`readJson<ElectionFile>` → `readJson<unknown>` への変更が設計の要点である。

| 変更前 | 変更後 |
| --- | --- |
| `readJson<ElectionFile>` — 型パラメータが「これは `ElectionFile` である」という**未証明の主張**を運ぶ | `readJson<unknown>` — 主張しない。`unknown` は「未検証」を型で表す |
| 呼び出し元は検証済みだと**思い込む** | 呼び出し元は `parseElectionFile` を通さないと `ElectionFile` を得られない(型が強制する) |

これにより「検証を忘れる」ことが型エラーになる。将来 3 つ目の読み口が追加されても、`unknown` から `ElectionFile` への経路は `parseElectionFile` しかない。**構造的保証をここで一枚岩に主張はしない** — 同一モジュール内で `as ElectionFile` を書けば回避できる。回避の検出は `cast-guard` unit(components.md U4)の静的ガードが担う二層目であり、本 unit はその母集団を増やさないことだけを負う(§5.2)。

### 3.3 汎用 `readJson` を変更しない理由(security 上の判断)

`readJson<T>`(`:71` = `function readJson<T>(path: string): Result<T, StoreError> {`)本体は**不変**とする(requirements.md A-3、ADR-4 Decision)。

- 汎用化(`readJson` にバリデータを引数で渡す形)は、ledger / pending / tally / timeline の 4 境界に**一斉に**影響する。本 unit の walking skeleton としての目的は election 境界 1 本を確実に閉じることであり、4 境界を同時に触ることは変更リスクの拡大に他ならない(BR-ELRP-29 / BR-ELRP-30)。
- `:80` の `as T` は残るため、`cast-guard` unit のガード母集団は不変(components.md U4 依存節「初期値 33/18 は不変」)。他 3 境界の未検証性は**可視のまま残る**。これは意図的であり、「直したふり」で母集団から消える方が危険である。

---

## 4. エラー写像 — 情報を増やさない設計

| 入力の状態 | 現行 | 改修後 | 根拠 |
| --- | --- | --- | --- |
| ファイル不在 | `err("not-found")` | 変更なし | `:72` = `  if (!existsSync(path)) return err("not-found");`、INV-EL-5 |
| 読取不能(権限等) | `err("io-error")` | 変更なし | `readJson` の read catch |
| JSON 構文エラー | `err("corrupt")` | 変更なし | `:82` |
| 構文妥当・定義部が不正 | **`ok`(素通り)** | `err("corrupt")` | 新設手順 (1) |
| 構文妥当・`state` が未知/非文字列 | **`ok`(素通り)** | `err("corrupt")` | 新設手順 (2) |
| すべて妥当 | `ok` | `ok`(同値) | 手順 (3) |

### 4.1 新しいエラー種別を導入しない(INV-EL-4)

検証失敗はすべて既存語彙 `"corrupt"` へ写像する。security 上の意味:

- **診断情報の非拡散**: 「どのフィールドが、なぜ不正だったか」を戻り値に載せない。呼び出し元 8 箇所(`amadeus-election.ts` の各 verb)のエラー分岐を変えずに済み、かつ入力の形状に応じて出力が分岐する面を作らない。
- **オラクル相殺の回避と表裏**: P-EL2 の assertion が `error === "corrupt"` の 1 点で済むのは、写像が単一だからである。理由別のエラー種別を作れば、テスト側が「どの理由になるべきか」を判定せざるを得ず、それは棄却規則のテスト側再実装(`cid:build-and-test:pbt-oracle-cancellation`)を誘発する。

### 4.2 不在を `"corrupt"` にしない(意図的相違)

`readElectionsRegistry`(`:283`)は 3 値(`ok` / `absent` / `corrupt`)を返すが、`Store.load` はこれを踏襲しない。**登録済み election の定義ファイルが無いのは異常である**(ADR-4「引用元 idiom との意味論照合」)。不在は `"not-found"` のまま、破損は `"corrupt"` のまま — 2 つの異常を混ぜない。これは `cid:application-design:citation-semantics-check`(引用元のエラー分岐方針が自要件と一致するかを設計時に明文照合する)の適用結果であり、本 unit の意図的相違として INV-EL-5 に固定済みである。

---

## 5. fail-closed の保証機構(層別 — 一枚岩の断定をしない)

`cid:nfr-design:c4` に従い、「構造的に保証される」と一括で主張せず、層ごとに何が保証され、何が保証されないかを書く。

| 層 | 機構 | 保証されること | 保証されないこと |
| --- | --- | --- | --- |
| L1 型 | `readJson<unknown>` + `parseElectionFile` が唯一の `unknown → ElectionFile` 経路 | 新しい読み口を素通しで書くと型エラーになる | 同一モジュール内の `as ElectionFile` による回避 |
| L2 実装 | 読み口 2 箇所の同時一本化(`Store.load` / `Store.setState`) | 現存する全読み口が検証を経る | 将来 store 外に別の `election.json` 読み口が生えること(§5.3) |
| L3 検証(PBT) | P-EL2 — 8 種の非適合変換すべてで `err("corrupt")`(domain-entities.md §6.2) | 生成器が到達する非適合クラスでの棄却 | 生成器が到達しないクラス(未知の破損形) |
| L4 検証(ピン) | P-EL3 — #1459 の 3 反例(重複 internalNo / 空 choices / 重複 voter)を example 固定 | seed 変更後も #1459 回帰が残る | ピンしていない形 |
| L5 静的 | `cast-guard` unit のガード(**別 unit**) | 未検査キャストの母集団監視 | 本 unit の責務外。母集団を増やさないことのみ本 unit が負う |
| L6 書込 | `writeStoreFile` の tmp+rename(`:60-69`) | 途中書き込みによる破損の防止 | 外部プロセスによる直接書換 |

### 5.1 無音再初期化をしない(INV-EL-6)

検証失敗時、ディスク上のバイト列は**変更しない**。ファイル冒頭コメント実文(`amadeus-election-store.ts:17-18`)がこの方針の既存宣言である:

```
// prevented by tmp+rename (writeStoreFile). Parse failures of existing files
// reject with "corrupt" (fail-closed load; never silently re-initialize).
```

security 上の意味: 破損の**証拠を消さない**。壊れたファイルを黙って作り直せば、原因調査が不能になり、かつ「壊れていたこと」自体が隠蔽される。`Store.setState` の Red テスト(business-logic-model.md §6 Step 3)が「ディスク上のバイト列が変わらない」ことを assertion に含めるのは、この不変量の実測面である。

### 5.2 `cast-guard` 母集団を増やさない

`readJson` の `:80` `as T` は残す(§3.3)。本 unit は `as` を新規に書かない。`parseElectionFile` は `raw as Record<string, unknown>` 相当の narrowing を必要とするが、これは `Election.parse` 内部で既に行われている形(`amadeus-election-model.ts:103` 実文 `    const r = raw as Record<string, unknown>;`)と同型であり、`parseElectionFile` 自身は `state` 参照のために最小限の narrowing を 1 箇所持つ。実装時にこの 1 箇所が `cast-guard` の母集団に入る場合は、**母集団の数値変化を conductor へ申告**する(components.md U4 依存節「初期値 33/18 は不変」との整合確認)。

### 5.3 将来の読み口に対する非保証(明示)

`election.json` を store 外から直接読む経路は現存する: `scripts/amadeus-election-migrate.ts:229`(実文 `      const raw = JSON.parse(readFileSync(join(dir, "election.json"), "utf8")) as Record<`)。これは移行ツールの独自読み口であり `Store` を経由しない(BR-ELRP-23)。本 unit は**この経路を変更しない**。

したがって「`election.json` を読むすべての経路が検証される」とは主張しない。主張するのは「`Store` を経由する読み取りは検証される」である。移行ツールは 1 回限りの実行かつ本 unit のスコープ外であり、これを同時に触ることは surgical 原則(P5)に反する。

---

## 6. 前提条件と信頼モデル

| 前提 | 内容 | 根拠 |
| --- | --- | --- |
| 単一書き手 | conductor のみが書く(決定 D-09)。ロックなし、torn write は tmp+rename で防ぐ | ファイル冒頭コメント `// Single writer (conductor) by decision D-09 — no locking; torn writes are` |
| registry 前提 | `Store.load` は `resolveElectionDir`(`:326`)を経由し、未登録 id では **throw する**(`:341` = `  throw new Error(\`election not in registry: ${electionId}\`);`) | 実読。P-EL2 は `Store.create` で作った election の `election.json` を上書きしてから読む形を取る(business-logic-model.md §5 P-EL2 前提) |
| 脅威モデル | 敵対的な外部入力ではなく、**手編集・過去バグ・並行事故による破損**。認証境界ではない | requirements.md Intent analysis / §1 |

`resolveElectionDir` の throw は本 unit の変更対象外である。未登録 id は `StoreError` ではなく例外という既存の非対称だが、これを直すことは requirements のスコープ外であり、**逸脱として実装しない**(BR-ELRP-36)。

---

## 7. 秘匿情報・入力サニタイズ

| 観点 | 本 unit での該当 |
| --- | --- |
| 認証情報・API キー・シークレットのハードコード | **なし**。本 unit は資格情報を一切扱わない |
| ログ・エラー出力への機微情報混入 | **なし**。`err("corrupt")` は入力内容を一切含まない(§4.1) |
| パス・トラバーサル | 本 unit はパス構築を変更しない(`resolveElectionDir` / `join` は不変) |
| 認証・認可のバイパス | **該当なし**(認可境界を持たない) |
| 出荷面の情報境界 | `t258-boundary-guard` — 出荷 `core/tools` のコメント・文字列に `scripts/<file>` 形のパストークンを書かない(BR-ELRP-26、`cid:code-generation:c1-1569-shipped-comment-vocab`)。`parseElectionFile` の説明コメントを書く際の実装制約 |

---

## 8. 検証手段の対応表

| 保証 | 検証 | 層 |
| --- | --- | --- |
| INV-EL-1(`load` の `ok` は `Election.parse` 通過値) | P-EL2 の全生成入力棄却 + `readJson<ElectionFile>` の grep 0 件 | integration + 静的 |
| INV-EL-2(`state ∈ VALID_STATES`) | P-EL2 変換 6 + Step 5 の example。lcov DA で手順 (2) 到達確認(`cid:build-and-test:error-path-reach-lcov`) | integration |
| INV-EL-3(`setState` 書き戻し前の検証) | Step 3 の Red → Step 4 の Green。ディスク不変の assertion 込み | integration |
| INV-EL-4(新エラー種別なし) | `StoreError` union の差分ゼロ | 型 + レビュー |
| INV-EL-5(不在は `not-found`) | 既存 t235 の緑維持 | integration |
| INV-EL-6(無音再初期化なし) | Step 3 のバイト列不変 assertion | integration |
| #1459 回帰 | P-EL3 の 3 反例ピン(AC-2 の実測面) | integration |

---

## 9. 上流からの逸脱

なし。§5.3(store 外読み口の非保証を明示)と §5.2(`cast-guard` 母集団への申告条件)は、`cid:nfr-design:c4`(保証機構を層別に書き、一枚岩の断定を避ける)に従った**保証範囲の明示**であり、上流の裁定を変更しない。
