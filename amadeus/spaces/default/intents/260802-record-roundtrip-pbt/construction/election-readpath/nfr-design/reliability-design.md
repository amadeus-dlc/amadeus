# Reliability Design — unit `election-readpath`(#1980)

上流入力(consumes 全数): business-logic-model.md(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

本書は business-logic-model.md §4.2(INV-EL-1〜INV-EL-6)、§5(P-EL1〜P-EL3 の層と受理ドメイン)、§6 Step 0〜Step 11(TDD 手順・出荷条件・walking skeleton ゲート)、§7(エラー写像表)に依拠する。同 unit の business-rules.md(BR-ELRP-19〜28)と domain-entities.md §6(生成境界)も併読した — **宣言外の追加入力**。

測定 ref: worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`。数値はすべてコマンド出力からの転記、または明示式による派生値(「推定」ラベル付き)。

---

## 1. 本 unit の信頼性目標(3 本)

| ID | 目標 | 強制メカニズム |
| --- | --- | --- |
| R-1 | 破損した `election.json` を受理しない(fail-closed)。受理失敗時にディスクを変更しない | `parseElectionFile` + P-EL2 / P-EL3 + Step 3 のバイト列不変 assertion |
| R-2 | PBT が flake しない(同一入力で同一結果) | 固定 `PBT_SEED`・既定 `numRuns` 100・反例ピン・生成側からの一意性保証 |
| R-3 | 出荷面(7 ハーネス dist + self-install)が正本と乖離しない | `dist:check` / `promote:self:check` / `t258-boundary-guard` / coverage patch gate |

以下、各目標の保証機構を層別に書く(`cid:nfr-design:c4` — 一枚岩の「構造的保証」断定をしない)。

---

## 2. R-1 fail-closed の信頼性

### 2.1 保証の層(何が保証され、何が保証されないか)

| 層 | 機構 | 保証されること | 保証されないこと |
| --- | --- | --- | --- |
| L1 型 | `readJson<unknown>` + `parseElectionFile` が唯一の `unknown → ElectionFile` 経路 | 素通しの新規読み口は型エラーになる | 同一モジュール内の `as ElectionFile` による回避 |
| L2 読み口 | `Store.load`(`:503`)/ `Store.setState`(`:512`)の同時一本化 | 現存する store 経由の全読み取り | `scripts/amadeus-election-migrate.ts:229` の store 外読み口(BR-ELRP-23、本 unit 対象外) |
| L3 書込 | `writeStoreFile` の tmp+rename(`:60-69`) | 途中書き込みによる破損の防止 | 外部プロセスによる直接書換 |
| L4 検証 | P-EL2(8 変換)/ P-EL3(3 反例ピン) | 生成器が到達する非適合クラスでの棄却 | 生成器が到達しない未知の破損形 |
| L5 静的 | `cast-guard` unit のガード(**別 unit**) | 未検査キャストの母集団監視 | 本 unit の責務外 |

### 2.2 無音再初期化をしない(INV-EL-6)

検証失敗時にディスク上のバイト列を変更しない。既存宣言(`amadeus-election-store.ts:17-18` 実文):

```
// prevented by tmp+rename (writeStoreFile). Parse failures of existing files
// reject with "corrupt" (fail-closed load; never silently re-initialize).
```

信頼性上の意味: 「壊れていたこと」の証拠が残る。黙って作り直す設計は、障害を隠蔽したうえで**次の障害の原因調査も不能にする**。business-logic-model.md §6 Step 3 の Red テストがこの不変量の実測面である(`Store.setState` 呼び出し後にディスクのバイト列が不変であること)。

### 2.3 後方互換フォールバックを持たない

`amadeus/spaces/default/memory/org.md` Forbidden(要求されていない後方互換レイヤー・フォールバック分岐・移行シム・二重実装の禁止)と inception ガードレールに従い、以下を**作らない**。

| 作らないもの | 理由 |
| --- | --- |
| 「検証に失敗したら旧挙動(素通り)へ落ちる」env フラグ・分岐 | fail-closed の目的そのものを無効化する。緩和経路の存在は検証劇場と同じ危険(org.md Forbidden) |
| 「旧形式の `election.json` を受理する互換モード」 | 旧形式という概念が存在しない。#1459 硬化は形式変更ではなく受理集合の縮小 |
| `parseElectionFile` 失敗時のリトライ | 決定的な失敗であり、リトライしても結果は同じ |

fail-closed 化は**置換であって併存ではない**(BR-ELRP-35)。

### 2.4 埋め込み fallback の二重保持をしない(`cid:nfr-design:c3`)

> Git 管理資産では埋め込み fallback を二重保持せず、Git 履歴からの復元、単一ソース、drift 検出を優先する。

本 unit への適用:

| 二重保持の誘惑 | 本設計での回避 |
| --- | --- |
| `parseElectionFile` 内に「既定の election 定義」を埋め込み、破損時にそれを返す | **しない**。破損は `err("corrupt")` として返し、復旧は Git 履歴(`amadeus/spaces/default/elections/` はバージョン管理下)から行う |
| `VALID_STATES` を store 側と検証側で別々に持つ | **しない**。`:254` の 1 定義のみ。`parseElectionFile` はこれを参照する(BR-ELRP-2、`isElectionState` / `ELECTION_STATES` の新設が 0 件であることは grep で確認済み) |
| 検証規則を `Election.parse` とテスト側で二重に持つ | **しない**。P-EL2 の assertion は `ok === false` と `error === "corrupt"` の 2 点のみ。棄却規則をテスト側で再実装しない(BR-ELRP-9、`cid:build-and-test:pbt-oracle-cancellation`) |

最後の行は R-1 と R-2 の交点である。テスト側に判定を二重実装すると、**両者が同じ箇所で同時に間違ったときに欠陥が観測面へ出ない**(オラクル相殺)。P-EL1(round-trip = メタモルフィック)と P-EL2(棄却は被検側が判定)はどちらも独立オラクルを持たない形で設計されており、この相殺クラスに構造的に該当しない。

---

## 3. R-2 テストの決定性 — flake を作らない設計

### 3.1 flake 源の棚卸しと封じ方

| flake 源 | 本 unit での封じ方 |
| --- | --- |
| 乱数系列の非再現 | `const PBT_SEED = <新規値>;` をファイル冒頭に固定。既存 distinct 5 値と重複させない(§3.2) |
| 実効試行数の揺れ | 生成器は**生成側から一意性を保証**(`fc.uniqueArray` 等)。`fc.pre` による生成後棄却を使わない(domain-entities.md §6.1) |
| 生成器の受理ドメイン外れ | P-EL1 の赤は**実装ではなく生成器を直す**(BR-ELRP-20)。`Election.parse` は既知 5 フィールドのみを再構築するため、余剰フィールドを持つ値では round-trip が原理的に成立しない |
| `description` の表現ゆれ | キーごと省略が正。`null` でも `undefined` 明示代入でもない(`amadeus-election-model.ts:51` 実文 `export type Choice = { internalNo: number; label: string; description?: string };`)。生成器は `fc.option` の `undefined` 明示代入を使わない |
| FS の残留状態 | `t417` は run ごとに一時ルートを使う。書込先は生成入力から一意に決まり、assertion 対象に含まれない |
| 時刻・env 依存 | 生成器は時刻・env・fast-check 外の乱数を読まない。`election.json` の 5 フィールドはすべて生成器由来の純値 |
| 並列負荷による timeout | `t416` / `t417` は入れ子 spawn を持たない純テスト。負荷起因の偽赤クラス(`cid:code-generation:fanout-load-settle-before-integration`)に該当しない |
| 未登録 id の throw | P-EL2 は `Store.create` で作った election の `election.json` を上書きする形を取る。`resolveElectionDir`(`:326`)は未登録 id で `:341` = `  throw new Error(\`election not in registry: ${electionId}\`);` を投げるため、この前提を外すとテスト自体が壊れる(business-logic-model.md §5 P-EL2 前提) |

### 3.2 `PBT_SEED` の衝突回避(実測)

測定コマンド `grep -rn "^const PBT_SEED" tests/`(全 6 件を転記):

```
tests/unit/setup-semver.pbt.test.ts:41:const PBT_SEED = 0x5e_6970;
tests/unit/setup-manifest.pbt.test.ts:29:const PBT_SEED = 0x5e_6970;
tests/unit/t204-audit-escape.pbt.test.ts:38:const PBT_SEED = 0xa0_d17;
tests/unit/setup-plan-decisions.test.ts:32:const PBT_SEED = 0x5e_706c; // "Xpl"
tests/unit/t352-journal-codec.pbt.test.ts:25:const PBT_SEED = 16280702;
tests/integration/t364-journal-v2.pbt.test.ts:41:const PBT_SEED = 26072903;
```

distinct 値は **5**(`grep -rh "^const PBT_SEED" tests/ | sed 's/;.*//' | sort -u` → 5 行)。上流 FD が列挙する 5 ファイルに対し、本 ref の全域 grep では `setup-plan-decisions.test.ts` を含む **6 ファイル**が実在する(実装時の独立再列挙による精密化、`cid:requirements-analysis:enumeration-reverify-at-implementation`)。選定制約は「distinct 5 値のいずれとも重複しない」。

### 3.3 反例ピン(P-EL3)— seed を跨いだ回帰の保存

固定 seed だけでは「seed を変えた瞬間に回帰が消える」。shrink 最小反例を example-based テストへ昇格させることで、seed 非依存の回帰を残す。初期 example は #1459 の既知 3 形:

| # | 壊し方 | 拒否する実装位置(実読) |
| --- | --- | --- |
| 1 | `choices` 内の `internalNo` 重複 | `parseChoices` 末尾の `hasDuplicates(choices.map((c) => c.internalNo))`(判定基盤は `amadeus-election-model.ts:65`) |
| 2 | `choices` が空配列 | `amadeus-election-model.ts:77` = `  if (!Array.isArray(raw) || raw.length === 0) return null;` |
| 3 | `voters` 重複 | `Election.parse` 内 `hasDuplicates(r.voters)` |

requirements.md FR-1c(AC-2)の実測面。

### 3.4 テスト層の配置(決定性と計測の 2 軸)

| プロパティ | 層 | 根拠 |
| --- | --- | --- |
| P-EL1 | `tests/unit/`(t416) | 純関数のみ・fs 非依存。`cid:code-generation:fs-tests-integration-first` |
| P-EL2 / P-EL3 | `tests/integration/`(t417) | 実 FS を触る。既存 `tests/integration/t235-election-store.integration.test.ts` のヘッダ実文 `// Layer: integration (touches a tmp elections root — fs-tests-integration-first).` と同じ層規約 |

**in-process 駆動(計測の軸)とテスト層(配置の軸)は独立**である(`cid:code-generation:fs-tests-integration-first` の追補)。`t417` は integration 層に置いたまま `Store.load` を in-process で呼ぶため、lcov が有効に効く(§4.2)。

### 3.5 Red を「テストが実際に読む面」で測る

本 unit は core 正本 import(BR-ELRP-13 / ADR-1 Rationale 1)であり、Red→Green のループに `bun scripts/package.ts` を挟まない。挟むとステールバイナリ(`cid:code-generation:code-generation:stale-binary`)の偽緑・偽赤を招く。dist 再生成は**出荷直前に 1 回**行う(§4.1)。

---

## 4. R-3 出荷面の drift 防止

### 4.1 7 ハーネス投影

`packages/framework/core/tools/amadeus-election-store.ts` を触るため、同一 PR で `bun scripts/package.ts` + `bun run promote:self` を実行し、dist **7 ハーネス**を再生成する(BR-ELRP-24、project.md Mandated)。

測定コマンド `ls dist/` の出力:

```
claude  codex  cursor  kimi  kiro  kiro-ide  opencode  plugins
```

= ハーネス 7 面(`claude` / `codex` / `cursor` / `kimi` / `kiro` / `kiro-ide` / `opencode`)+ `plugins`(ハーネスではない)。**5 面で止めると `kiro` / `kiro-ide` が DIFFERS になる**(project.md の実測記録 `cid:build-and-test:bt-dist-regen-seven-harnesses`)。

| ゲート | コマンド(package.json 実読) |
| --- | --- |
| dist drift | `"dist:check": "bun scripts/package.ts --check"` |
| self-install drift | `"promote:self:check": "bun scripts/promote-self.ts --check"` |

### 4.2 coverage patch ゲート

新設される `parseElectionFile` の全行が patch 母集団に入る。設計上の要件:

| 要件 | 設計 |
| --- | --- |
| spawn 盲点を踏まない | `Store.load` は既存 `t235` が **in-process で呼ぶ**(business-logic-model.md §6 Step 10、ADR-4 Consequences)。新設分岐も `t417` から in-process で駆動される。CLI 直叩きのみで通る行を作らない(`cid:requirements-analysis:bun-coverage-spawn-blindspot`) |
| 全分岐の到達 | `Election.parse` 失敗 / `state` 不正 / 成功 の 3 分岐。`state` 不正分岐は `invalidElectionFileArb` 変換 6 が唯一の到達路であり、到達は lcov の DA で確認する(`cid:build-and-test:error-path-reach-lcov`) |
| lcov の構造的 false-red 回避 | 関数本体内の standalone コメント行を置かない(説明コメントは関数宣言直上へ = `cid:code-generation:bun-inbody-comment-da0`)。多行の関数呼び出し引数は単一行へ collapse する(`cid:code-generation:bun-multiline-arg-da0`)。bare な `case` ラベル行を作らない(`cid:code-generation:cg-bare-case-label-da0`) |
| push 前実測 | ローカル lcov で diff 追加行未カバー **0** を確認してから push(`cid:code-generation:local-lcov-pre-push`)。判定コマンドは `bun tests/coverage-patch-gate.ts --check`(実在確認済み) |

### 4.3 allowlist 行ピンの remap と span 膨張検査

`tests/.coverage-patch-allowlist.json` に `amadeus-election-store.ts` の行ピンが **2 件**存在する(出典 = 当該 JSON の本ステージ直読):

| 位置 | 実文 |
| --- | --- |
| `:94` | `    "lines": "476-477",` |
| `:100` | `    "lines": "491",` |

`parseElectionFile` は `readJson`(`:71-84`)と `Store` 本体(`:503` 以降)の間に挿入されるため、**両ピンとも下方へシフトする**。手順:

1. base→head の行マップ(difflib 等)から **全エントリを機械 remap** する(`cid:code-generation:c1-allowlist-mechanical-remap`)。stale 検査に映るエントリだけを直す部分是正は、別の測定可能行への無音転位を残す。
2. remap 後、**全エントリの `reason` 記述と現行行内容の一致を直読照合**する(`cid:code-generation:allowlist-line-pin-stale` の追補)。2 件の `reason` はいずれも `Store.create` の防御的 catch(`readdirSync` / `mkdirSync`)を指す — remap 後もその行を指しているかを実読で確認する。
3. **span 膨張(straddle)を検査**する(`cid:code-generation:cg-allowlist-straddle-swell`)。既存レンジ `476-477` の**内側**へ新規コードが入らないこと(= 挿入位置が `:476` より上か `:477` より下であること)を確認する。膨張が起きた場合はコード移設で straddle を解消する。

`parseElectionFile` の挿入位置は `readJson` 定義の直後(`ElectionFile` 型宣言の近傍)が自然であり、`:476-477` / `:491` はいずれも `Store.create` 内部でそれより下方にある。したがって**両ピンは純粋な下方シフトであり span は不変になる**見込みだが、これは設計上の予測であって実測ではない — 実装時に手順 1〜3 を実行して確認する。

### 4.4 出荷境界ガード(t258)

`t258-boundary-guard`: 出荷される `core/tools` のコメント・文字列に `scripts/<file>` 形のパストークンを書かない(BR-ELRP-26、`cid:code-generation:c1-1569-shipped-comment-vocab`)。

本 unit で `parseElectionFile` に説明コメントを付ける際の実装制約である。この unit は core 正本を触る唯一の unit であるため、6 unit のうち t258 に接触しうるのは本 unit だけである。allowlist 追加ではなくコメントの reword でトークンを除去する。

`t258` は unit / integration の双子構成(`tests/unit/t258-boundary-guard.test.ts` = 純述語、`tests/integration/t258-boundary-guard.integration.test.ts` = 実 FS + `git ls-files` の live scan)。integration 側ヘッダ実文が決定性の設計根拠を記す:

```
// Determinism (reliability-design core): the corpus is the set of GIT-TRACKED
// files under SCAN_ROOTS.
```

= 走査母集団は git 追跡ファイルに限られ、machine-local の未追跡ファイルは除外される。本 unit の新規コードは追跡ファイルであるため、この母集団に入る。

---

## 5. 既存契約の非破壊(回帰の防止)

decisions.md ADR-4 Consequences が列挙する既存 election テスト群 **t234 / t235 / t236 / t238 / t239 / t240 / t242 / t259 / t262** の緑を実測で確認する(BR-ELRP-21)。確認は `Ran N tests across M files` の **M と宣言パス数の照合**まで行う — Bun は不存在パスを無音で除外したまま exit 0 になりうる(`cid:build-and-test:test-path-set-completeness`)。zsh ではパス集合を配列で展開する(`cid:build-and-test:bt-path-existence-array-expansion`)。

特記:

| テスト | 本 unit の影響 |
| --- | --- |
| `tests/integration/t235-election-store.integration.test.ts:93` 実文 `  test("fail-closed load: a corrupt election.json rejects with corrupt, never re-initializes", () => {` | 契約は**拡張されるが破られない**(構文破損に加え意味的不正も `corrupt`)。既存 assertion は緑を維持(BR-ELRP-22) |
| `t236` | スプレッドで定義部を保つため壊れない |
| `t262:114` | 移行ツール独自の読み口(`readCandidates`)を通り `Store.load` を通らないため独立 |

本 ref での基準実測(転記): `bun test tests/integration/t235-election-store.integration.test.ts` → `Ran 10 tests across 1 file. [93.00ms]`(10 pass / 0 fail)。

---

## 6. 障害モードと復旧

| 障害 | 検知 | 復旧 |
| --- | --- | --- |
| `election.json` が破損している | `Store.load` が `err("corrupt")` を返す(その場で loud に失敗) | Git 履歴から復元(`amadeus/spaces/default/elections/` はバージョン管理下)。埋め込み既定値による自動復旧はしない(§2.4) |
| `parseElectionFile` が正当な定義を誤って棄却する(過剰拒否) | P-EL1 の round-trip が赤になる、または既存 t234〜t262 が赤になる | `parseElectionFile` は既存 `Election.parse` の合成にすぎないため、過剰拒否は `Election.parse` の受理集合と `VALID_STATES` の外側にしか起こりえない。実際に起きたら実装せず conductor へ申告(BR-ELRP-36) |
| PBT が CI で赤・手元で緑 | 固定 seed により同一系列を再現可能 | 失敗 seed と反例をログから取り、P-EL3 のピンへ昇格させる |
| dist / self-install が乖離 | `dist:check` / `promote:self:check` が赤 | 正本を編集し直して再生成。`dist/` を直接編集しない(project.md Forbidden) |
| coverage patch gate が赤 | `bun tests/coverage-patch-gate.ts --check` | まず in-process seam の追加/移設で解消を図る。allowlist 追加は残余行のみ(`cid:code-generation:spawn-blindspot-two-step`) |

---

## 7. walking skeleton としてのリスク制御

本 unit は Bolt 1(単独・ゲート付き)であり、**単独で PR を出しユーザー承認を得てから**残 Bolt へ進む(BR-ELRP-34、requirements.md C-3)。信頼性設計上の意味:

- core 正本を触る唯一の unit を先に単独で通すことで、7 ハーネス投影・coverage patch・t258 という**出荷面の 3 ゲートを最小の diff で 1 回通す**。以後の 5 unit はテスト面のみを触るため、これらのゲートに対する diff が小さい。
- 承認前に `cast-guard` / `pbt-deep-ci` を先行させない(依存エッジ `election-readpath → {cast-guard, pbt-deep-ci}`)。`cast-guard` の母集団(初期値 33/18)は本 unit の着地後に確定する。

---

## 8. 上流からの逸脱

なし。§4.3 の「両ピンは純粋な下方シフトであり span は不変になる見込み」は**設計上の予測であって実測ではない**と明記しており、受け入れ基準には使わない(判定は実装時の remap 結果と patch gate の実出力で行う)。§3.2 の `PBT_SEED` 実在ファイル数(5 → 6)は上流列挙の精密化であり、選定制約(distinct 値と重複しない)は不変。
