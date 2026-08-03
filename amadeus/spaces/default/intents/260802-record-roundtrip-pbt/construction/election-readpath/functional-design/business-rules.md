# Business Rules — unit `election-readpath`(#1980)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: **worktree HEAD `c8702be09d74daa8091d99d3eae48987b9fd7527`**(`git diff --stat 5a6f79727..HEAD -- packages/framework/core/tools/ tests/ .github/workflows/` = 空のため上流 AD の file:line は HEAD で成立)。file:line 付きの規則はすべて実読による verbatim 確認済み。

規則 ID は `BR-ELRP-N` 形式。各規則は「テスト可能な述語」として書き、検証手段の列に**どのテストがそれをピンするか**を置く。

---

## 1. 読み側検証の規則(FR-1a / FR-1b / decisions.md ADR-4)

| ID | 規則 | 検証手段 |
| --- | --- | --- |
| **BR-ELRP-1** | `election.json` の読み戻しは `Store.load`・`Store.setState` のどちらの経路でも、必ず `Election.parse`(`amadeus-election-model.ts:101` = `  parse(raw: unknown): Result<Election, "parse-failure"> {`)を通ること。 | P-EL2(全生成入力が棄却される)+ 読み口2箇所の grep 実測(`readJson<ElectionFile>` が 0 件になること) |
| **BR-ELRP-2** | 検証は store 内 private 関数 `parseElectionFile(raw: unknown): Result<ElectionFile, StoreError>` に集約し、検証ロジックを新規に実装しないこと(既存 `Election.parse` と既存 `VALID_STATES` の合成のみ)。 | コードレビュー観点 + `VALID_STATES` 以外の state 判定集合が新設されていないことの grep(`isElectionState` / `ELECTION_STATES` が 0 件のまま) |
| **BR-ELRP-3** | 汎用 `readJson<T>`(`:71` = `function readJson<T>(path: string): Result<T, StoreError> {`)の**本体は変更しない**。呼び方を `readJson<unknown>` にするのみで、`:80` = `    return ok(JSON.parse(text) as T);` は残る。 | `git diff` で `readJson` 本体に差分がないこと。`cast-guard` unit の初期母集団が **33 サイト / 18 ファイル**のまま(components.md U4 依存節) |
| **BR-ELRP-4** | `state` フィールドの妥当性は既存 `VALID_STATES`(`:254` = `const VALID_STATES: ReadonlySet<string> = new Set<ElectionState>([`)で照合すること。新しい集合・新しい型ガードを作らない。 | Step 5/6 の Red→Green(未知 state の棄却)+ BR-ELRP-2 の grep |
| **BR-ELRP-5** | 検証失敗はすべて既存語彙 `err("corrupt")`(`StoreError` union の `:49` = `  \| "corrupt"`)へ写像すること。`StoreError` に新しい値を追加しない。 | P-EL2 の assertion `error === "corrupt"` + `StoreError` union の差分ゼロ |
| **BR-ELRP-6** | ファイル不在は `err("not-found")`(`:72` = `  if (!existsSync(path)) return err("not-found");`)のままとし、`corrupt` に丸めないこと。レジストリの3値(`ok`/`absent`/`corrupt`)は踏襲しない(decisions.md ADR-4 の意図的相違)。 | 不在パスに対する `Store.load` が `"not-found"` を返す example テスト |
| **BR-ELRP-7** | 検証に失敗しても `election.json` のバイト列を書き換えないこと(無音再初期化の禁止)。 | Step 3 の Red→Green(`readFileSync` の前後同一を assert)。既存 `tests/integration/t235-election-store.integration.test.ts:100` 実文 `    // The broken bytes stay untouched on disk (no silent recovery).` と同型 |
| **BR-ELRP-8** | `Store` の公開シグネチャ(`load` の戻り型 `Result<{ election: Election; state: ElectionState }, StoreError>` = `:503` 実文)を変更しないこと。 | `tsc --noEmit` + 既存呼出 10 件(components.md / decisions.md の消費者棚卸し)の無改修 |

### BR-ELRP-1 の充足条件(2箇所同時)

decisions.md ADR-4 Rationale 4 と component-methods.md「適用点(2箇所 — 対称性)」により、**片方だけの改修は BR-ELRP-1 を充足しない**。

| 読み口 | HEAD 実文 | 改修後 |
| --- | --- | --- |
| `Store.load`(`:503`) | `:504` = `    const read = readJson<ElectionFile>(` | `readJson<unknown>` → `parseElectionFile` |
| `Store.setState`(`:512`) | `:515` = `    const read = readJson<ElectionFile>(path);` | 同上 |

`Store.setState` は `:517` = `    const w = writeStoreFile(path, JSON.stringify({ ...read.value, state }, null, 2));` で読んだ値を**書き戻す**ため、未検証のままだと不正な定義をディスクに固定する書き手側の穴でもある。

---

## 2. 受理・棄却の判定表(P-EL2 の仕様)

| 入力クラス | 例 | 期待 | 拒否する実装位置(実読) |
| --- | --- | --- | --- |
| 妥当 | `Store.create` が書いた形 | `ok` | — |
| JSON 構文エラー | `'{"electionId": "E-STORE-1", "state": '` | `err("corrupt")` | `:82` = `    return err("corrupt");`(既存) |
| 非オブジェクト(配列・数値・null) | `[]` / `3` / `null` | `err("corrupt")` | `Election.parse` 冒頭 `if (typeof raw !== "object" \|\| raw === null)` |
| `electionId` が空文字/非文字列 | `{"electionId": ""}` | `err("corrupt")` | `Election.parse` の `r.electionId.length === 0` 判定 |
| `kind` / `question` が非文字列 | `{"kind": 1}` | `err("corrupt")` | `:105` = `    if (typeof r.kind !== "string" \|\| typeof r.question !== "string") return err("parse-failure");` |
| `choices` が空配列 | `{"choices": []}` | `err("corrupt")` | `:77` = `  if (!Array.isArray(raw) \|\| raw.length === 0) return null;` |
| `choices[].internalNo` 重複 | `[{internalNo:1,…},{internalNo:1,…}]` | `err("corrupt")` | `parseChoices` 末尾の `hasDuplicates(choices.map((c) => c.internalNo))`(判定基盤 `:65`) |
| `choices[].description` が非文字列 | `{"description": 5}` | `err("corrupt")` | `parseChoices` の `cc.description !== undefined && typeof cc.description !== "string"` |
| `voters` が空配列 | `{"voters": []}` | `err("corrupt")` | `:108` = `    if (!isStringArray(r.voters) \|\| r.voters.length === 0) return err("parse-failure");` |
| `voters` 重複 | `["a","a"]` | `err("corrupt")` | `:109` = `    if (hasDuplicates(r.voters)) return err("parse-failure");` |
| `state` が未知文字列 | `"unknown-state"` | `err("corrupt")` | 新設手順 (2) の `VALID_STATES`(`:254`)照合 |
| `state` が非文字列・不在 | `1` / キー無し | `err("corrupt")` | 同上 |
| ファイル不在 | — | `err("not-found")` | `:72`(BR-ELRP-6) |
| 読み取り不能 | 権限 0 | `err("io-error")` | `:77` = `    return err("io-error");` |

**BR-ELRP-9**: 上表の「期待」列は**プロパティの assertion 側で再実装してはならない**。P-EL2 の assertion は `loaded.ok === false` と `error === "corrupt"` のみで、なぜ不適合かの再判定を書かない(requirements.md FR-4a、`cid:build-and-test:pbt-oracle-cancellation`)。表は生成器の**壊し方の列挙**の根拠であり、判定の再実装ではない。

---

## 3. PBT の規則(FR-4a〜4d)

| ID | 規則 | 検証手段 |
| --- | --- | --- |
| **BR-ELRP-10** | round-trip プロパティ(P-EL1)と fail-closed プロパティ(P-EL2)を**別のプロパティとして書き分ける**。1本にまとめない。 | 成果物のテスト構造(2つの `test(...)` ブロック) |
| **BR-ELRP-11** | P-EL1 は `tests/unit/`(fs 非依存)、P-EL2 / P-EL3 は `tests/integration/`(実 FS)に置く。 | ディレクトリ配置 + 各ファイル冒頭の Layer 注記(`t234` / `t235` 既存様式) |
| **BR-ELRP-12** | arbitrary は `tests/helpers/arbitraries/election.ts` に置き、既存 `semver.ts` / `manifest.ts` と同じ「生成器はパーサの入力境界で止め、ブランド型を直接作らない」方針に従う。 | 配置 + `Goa` 等のブランド型を生成器が直接構築していないこと |
| **BR-ELRP-13** | import は **core 正本**(`packages/framework/core/tools/…`)に統一する(decisions.md ADR-1)。dist 出荷コピーを import しない。 | 新規テスト・helper の import 行 grep(`dist/claude/.claude/tools/` が 0 件) |
| **BR-ELRP-14** | 各 PBT ファイル冒頭に t204 の4項規約ヘッダ(`tests/unit/t204-audit-escape.pbt.test.ts:16-28`)を置き、**4項すべてを充足**する: (1) 固定 `PBT_SEED` + numRuns 既定 100、(2) 失敗時の seed / replay / 縮小反例出力、(3) 縮小反例の example-based ピン、(4) `AMADEUS_PBT_DEEP=1` 階層。 | ヘッダの実在 + `const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };` 同型行の実在 |
| **BR-ELRP-15** | `PBT_SEED` は既存値と重複しない値をファイルごとに固定する。HEAD 実測の既存値(測定: `grep -rn "PBT_SEED = " tests/`)は `setup-semver.pbt.test.ts:41` `0x5e_6970` / `setup-manifest.pbt.test.ts:29` `0x5e_6970` / `t204:38` `0xa0_d17` / `t352:25` `16280702` / `t364:41` `26072903` の **5 行 / 相異なり 4 値**。 | 新規ファイルの `PBT_SEED` が上記4値のいずれとも異なること |
| **BR-ELRP-16** | P-EL3 として #1459 の既知3形(重複 internalNo / 空 choices / 重複 voter)を example-based で固定する。property は探索を継続する(example がプロパティを置換しない)。 | 3件の example テストの実在 + P-EL2 プロパティの併存 |
| **BR-ELRP-17** | 新規 PBT ファイル群の `bun test` 直接実行の合計が **2秒以内**(requirements.md NFR-4。基準 = 既存 PBT 4本の直接実行 151ms の10倍超マージン)。 | 実行時間の実測転記 |

---

## 4. TDD の規則(C-1)

| ID | 規則 | 検証手段 |
| --- | --- | --- |
| **BR-ELRP-18** | プロダクション改修(`parseElectionFile` 新設、読み口2箇所の切替、`state` 照合)は、それぞれ**失敗テスト1件を先に書いて Red を実測**してから最小実装で Green にする。テストの一括先行・実装後のテスト追加は TDD 実施とみなさない(`cid:code-generation:tdd-default-with-narrow-exceptions`)。 | stage diary への Red 実測記録(赤の出力)+ コミット順序 |
| **BR-ELRP-19** | Red は「テストが実際に読む面」で測る。本 unit は core 正本 import(BR-ELRP-13)のため dist 再生成を挟まずに Red→Green を回す(decisions.md ADR-1 Rationale 1、`cid:code-generation:code-generation:stale-binary` の回避)。 | Red 実測時に `bun scripts/package.ts` を挟んでいないこと |
| **BR-ELRP-20** | P-EL1 の実装中に赤が出た場合、**実装(`Election.parse`)を変えず生成器を直す** — P-EL1 は現行実装で成立するプロパティであり、赤は生成器が受理ドメイン(`Election` 型の5フィールドのみ、`description` はキーごと省略)を外したことを意味する。 | 赤時の是正 diff が `tests/helpers/arbitraries/` 側に閉じていること |

---

## 5. 既存契約の非破壊規則

| ID | 規則 | 検証手段 |
| --- | --- | --- |
| **BR-ELRP-21** | 既存 election テスト群 **t234 / t235 / t236 / t238 / t239 / t240 / t242 / t259 / t262**(decisions.md ADR-4 Consequences の列挙)が全て緑であること。 | 当該ファイル群の実行と件数照合(`Ran N tests across M files` の M と宣言パス数の一致 — `cid:build-and-test:test-path-set-completeness`) |
| **BR-ELRP-22** | `tests/integration/t235-election-store.integration.test.ts:93` の既存契約(`fail-closed load: a corrupt election.json rejects with corrupt, never re-initializes`)は**拡張されるが破られない** — 構文破損に加えて意味的不正も `corrupt` になる。 | t235 の緑維持 |
| **BR-ELRP-23** | `scripts/amadeus-election-migrate.ts` の独自読み口(`:229` 実文 `      const raw = JSON.parse(readFileSync(join(dir, "election.json"), "utf8")) as Record<`。component-methods.md が併記する `:252` は HEAD 実読では `      const path = relative(projectDir, join(dir, "election.json"));` = リテラル出現であり読み口ではない)は本 unit の対象外。移行ツールは `Store` を経由しない(component-methods.md 消費者棚卸し)。 | 当該ファイルの差分ゼロ + t262 の緑維持 |

---

## 6. 出荷ゲートの規則(NFR-1〜NFR-5)

| ID | 規則 | 検証手段 |
| --- | --- | --- |
| **BR-ELRP-24** | `packages/framework/core/tools/` を触るため、同一 PR で `bun scripts/package.ts` + `bun run promote:self` を実行し、dist **7ハーネス**(claude / codex / cursor / opencode / kimi / kiro / kiro-ide)を再生成する。 | `bun run dist:check` exit 0 / `bun run promote:self:check` exit 0 |
| **BR-ELRP-25** | 新設コード行は coverage patch 母集団に入る。`parseElectionFile` の全分岐(`Election.parse` 失敗 / `state` 不正 / 成功)を **in-process** で駆動する。push 前にローカル lcov で diff 追加行未カバー **0** を実測する。 | `bun tests/coverage-patch-gate.ts --check` の出力転記 |
| **BR-ELRP-26** | 出荷 core/tools のコメント・文字列に `scripts/<file>` 形のパストークンを書かない(`t258-boundary-guard`、`cid:code-generation:c1-1569-shipped-comment-vocab`)。 | t258 の緑 |
| **BR-ELRP-27** | `tests/.coverage-patch-allowlist.json` の `amadeus-election-store.ts` 行ピン2件(出典 = 当該 JSON ファイルの本ステージ直読。HEAD 実読 `:94` `    "lines": "476-477",` / `:100` `    "lines": "491",`)は、新設関数の挿入で行シフトが起きた場合に**全エントリを機械 remap** し、remap 後に reason 記述と現行行内容の直読照合を行う。既存レンジ内部への挿入による span 膨張がないことも確認する。 | remap 前後の行マップ出力 + patch gate PASS(`cid:code-generation:c1-allowlist-mechanical-remap` / `cid:code-generation:cg-allowlist-straddle-swell`) |
| **BR-ELRP-28** | complexity / relative coverage / dist drift / plugin-conformance-e2e を含む現行ブロッキング集合を全緑で維持する(requirements.md NFR-5)。 | `bash tests/run-tests.sh --ci` ほか各ゲートの exit code |

---

## 7. スコープ規則(逸脱防止)

| ID | 規則 | 出所 |
| --- | --- | --- |
| **BR-ELRP-29** | 4境界を貫く汎用バリデータ層を作らない。一本化は **election 境界のみ**。 | requirements.md C-4、components.md スコープ外節 |
| **BR-ELRP-30** | `readJson` にバリデータを引数で渡す汎用形(decisions.md ADR-4 代替 A)へ寄せない。ledger / pending / tally / timeline の検証は本 unit で書かない。 | requirements.md A-3、decisions.md ADR-4 Alternatives Rejected |
| **BR-ELRP-31** | `Election.parse` 自体を `state` を含む形へ拡張しない(decisions.md ADR-4 代替 C)。`state` はストレージ層の関心であり `amadeus-election-model.ts` は fs/storage を知らない(同ファイル冒頭 `:4-5` 実文 `// ballot acceptance. No fs/network/clock access — every fallible API returns a` / `// discriminated-union Result and never throws (functional-domain-modeling-ts).`)。 | decisions.md ADR-4 |
| **BR-ELRP-32** | state 境界(`parseMirrorBoundaryReceipts` / `getField` / `setField`)には触れない。P-ST1〜P-ST4 は `state-pbt` unit の所有。 | components.md U3、unit-of-work.md |
| **BR-ELRP-33** | 静的ガード(`cast-guard`)・深掘り CI(`pbt-deep-ci`)・台帳(`scope-ledger`)・mirror property(`mirror-property`)は本 unit で実装しない。 | unit-of-work.md Unit 一覧、unit-of-work-dependency.md の edge block |
| **BR-ELRP-34** | 本 unit は **Bolt 1(単独・ゲート付き)** として PR を出し、ユーザー承認を得るまで後続 Bolt に進まない。 | requirements.md C-3、unit-of-work-dependency.md「並行編成の含意」 |
| **BR-ELRP-35** | 要求されていない後方互換レイヤー・移行シム・二重実装を追加しない(旧挙動へのフォールバック分岐を作らない)。fail-closed 化は置換であって併存ではない。 | org.md Forbidden、inception ガードレール |

---

## 8. 逸脱時の手続き

**BR-ELRP-36**: 上記規則または上流(requirements.md / components.md / component-methods.md / decisions.md)の確約から逸脱する必要に気づいた場合、実装者は**その場で逸脱を実装せず作業を停止し**、conductor へ申告して裁定を得てから続行する(`cid:requirements-analysis:implementation-deviation-election` / `cid:code-generation:deviation-stop-before-implement`)。「既存様式への準拠と判断する場合も停止対象」とする(`cid:code-generation:deviation-applicability-not-solo`)。

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段1(破損した選挙台帳の読取時その場棄却=配布面/非対称バグの実装前検出=開発面)に対応する。
- services.md との関係: 本 unit は S1/S2 の実装に非関与だが、S2(pbt-deep-ci)のジョブ契約が「新規 PBT ファイル群」として本 unit の PBT を深掘り対象に含むため、テストファイル命名・AMADEUS_PBT_DEEP 階層は services.md S2 の実行コマンド契約から参照される。
