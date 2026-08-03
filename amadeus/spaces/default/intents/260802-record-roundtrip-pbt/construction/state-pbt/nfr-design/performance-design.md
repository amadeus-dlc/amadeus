# Performance Design — unit `state-pbt` (#1980)

上流入力(consumes 全数): business-logic-model.md(§4 のプロパティ定義 P-ST1〜P-ST4、§6 の成果物表と実行契約、§7 の NFR-4 当たり、§8 R-2)(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

宣言外の追加入力(同 unit の FD 兄弟成果物): business-rules.md(BR-ST-9 / BR-ST-14 / 完了条件3)、domain-entities.md(§2 の生成器構成)

測定 ref: 本書の file:line・実測値はすべて **worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`**(`git rev-parse HEAD`)。FD 群の測定 ref は `c8702be09` だが、本ステージで business-logic-model.md §3 / §5 が引く `amadeus-state.ts` の 10 行(`:225` `:239` `:242` `:248` `:257` `:261` `:266` `:270` `:278` `:281`)と `amadeus-lib.ts` の 8 行(`:5179` `:5189` `:5237` `:5242` `:5246` `:5248` `:5255` `:5263`)を HEAD で実読し、いずれも同一断面で成立することを確認した(§5 の再確認表)。

---

## 1. 本 unit の性能要件は1本だけである

business-logic-model.md §7 が本 unit への含意として整理したとおり、requirements.md の NFR のうち本 unit に適用されるのは **NFR-4(決定性・実行時間)** と NFR-5(既存ゲート維持)であり、NFR-1(投影同期)/ NFR-2(coverage patch)/ NFR-3(境界契約)は `packages/framework/core/tools/` を触る変更に課される条件のため適用外である。

したがって本書が設計する性能事項は次の1本に収束する。

> **新規 PBT ファイル群(`t418` / `t419`)の `bun test` 直接実行の合計が 2 秒以内**(business-rules.md 完了条件3)。

**プロダクション改修ゼロ unit であることの性能上の含意**: 本 unit は実行時性能を持つコードを1行も出荷しない。`packages/framework/core/` の実行時性能・メモリ・レイテンシは本 unit の設計対象ではない(business-logic-model.md §1「既存プロダクション挙動の記述と固定であって、挙動の設計ではない」)。設計するのは **検証装置自身の実行時間予算** だけである。

---

## 2. 予算の出所と基準値

| 値 | 出所 | 種別 |
| --- | --- | --- |
| 2 秒(上限) | requirements.md NFR-4 | 承認済み受け入れ基準 |
| 151 ms(既存 PBT 4本の直接実行、作業ツリー 2026-08-02) | requirements.md NFR-4 が上限の導出根拠として記録した実測値 | 上流の実測 |
| **123 ms**(同4本、HEAD `26fc7ddb2` で再実測) | 本ステージ実測(下記) | 本書の実測 |

本ステージでの再実測(コマンド出力からの転記):

```
$ bun test tests/unit/t204-audit-escape.pbt.test.ts tests/unit/t352-journal-codec.pbt.test.ts \
           tests/unit/setup-semver.pbt.test.ts tests/unit/setup-manifest.pbt.test.ts
 23 pass
 0 fail
 3399 expect() calls
Ran 23 tests across 4 files. [123.00ms]
```

上限 2000 ms は、この既存4本の実測 123 ms に対して約 16 倍のヘッドルームを持つ。requirements.md NFR-4 が「10倍超のマージンを持つ上限として設定した派生値」と明記したとおり、**この上限は本 unit の実装を締め付ける制約ではなく、桁を1つ間違えた設計(実 FS 走査・spawn・巨大 numRuns の PR CI 常駐)を止めるためのガードレール**である。本書はその前提のうえで、予算をどこへ配分するかを固定する。

---

## 3. 予算配分 — 実測に接地した内訳

### 3.1 被検関数そのもののコスト(本ステージ実測)

repo 外 scratch(`cid:requirements-analysis:scratch-script-discipline`)から対象4関数を直接 import し、既定 numRuns と同じ 100 回のループで計測した。read-only であり repo の状態は変更していない。

| プロパティ | 被検呼び出し | 100 回の実測 |
| --- | --- | --- |
| P-ST1 | `parse(serialize(r))` | 0.434 ms |
| P-ST2 | `parse(非適合テキスト)`(5コンストラクタを巡回) | 0.245 ms |
| P-ST3 | `getField(setField(c, f, v), f)` | 0.123 ms |
| P-ST4 | `fieldExists` + `setField`(不在フィールド) | 0.403 ms |
| **合計** | | **1.205 ms** |

被検関数は4プロパティ合計で **100 runs あたり約 1.2 ms** であり、2000 ms 予算の 0.06% に過ぎない。予算を消費するのは被検関数ではなく、後述の固定費(モジュールロード)と fast-check の生成・縮小である。

### 3.2 プロパティ全体のコスト(代理実測)

FD が定義した P-ST1〜P-ST4 と同型の代理実装(同じ被検関数・同じ既定 numRuns・同じ受理ドメイン)を scratch 上の bun test ファイルとして書き、実行した。**これは代理実測であり `t418` / `t419` そのものの実測ではない**(実装後に business-rules.md 完了条件3 として再測する)。

| 構成 | 実測(bun test の報告値) |
| --- | --- |
| 4プロパティ / 1ファイル / numRuns 100 | **40 ms** |
| 6プロパティ / 2ファイル / numRuns 100 | **41 ms** |
| 4プロパティ / 1ファイル / numRuns 50,000(`AMADEUS_PBT_DEEP=1`) | **391 ms** |

`bun test` プロセス全体の壁時計(`time` 出力の転記)は 4プロパティ / 1ファイルで `0.057 total`。

### 3.3 固定費と変動費の分離(派生値・算出式併記)

> 是正注記(iteration 1 Major): v は「4プロパティ合計・1 runs 単位あたり」の変動費率であり、プロパティ個別実行回数(4×100=400)を乗じるのは単位不整合。§3.4 の変動費は v × runs(100) ≈ 0.70 ms へ訂正した。実測差 41 − 39.3 ≈ 1.7 ms との乖離はプロセス起動ノイズ帯(±数 ms)の内側。なお §3.2 の代理実測は「FD の P-ST1〜P-ST4 と同型の4プロパティを2ファイルへ分割した構成」であり、本 unit の実構成(t418=P-ST1/P-ST2、t419=P-ST3/P-ST4)とプロパティ本数は一致する(ファイル分割も同一)。

上記2点(100 runs = 40 ms、50,000 runs = 391 ms)から、実行時間を「固定費 C(モジュールロード + ランナー起動)+ 変動費 v × runs」と置いて解く。

```
C + 100   × v = 40   [ms]
C + 50000 × v = 391  [ms]
------------------------------
v = (391 − 40) / (50000 − 100) = 351 / 49900 ≈ 0.00703 ms/run(4プロパティ合計あたり)
C = 40 − 100 × 0.00703 ≈ 39.3 ms
```

**派生値(実測2点からの1次外挿)**: 固定費 ≈ **39 ms**、変動費 ≈ **7.0 µs/run**。すなわち PR CI 階層(numRuns 100)の実行時間は **9割以上が固定費**であり、プロパティ本数や numRuns の微調整では動かない。

§3.1 の被検関数直接計測(100 runs で 1.205 ms)は、この変動費の外挿値(100 runs で約 0.70 ms)と同じオーダーにあり、**変動費の支配項が被検関数呼び出しである**ことと整合する。ただし両者は別プロセス・別ウォームアップ条件での計測であり、**加算しない**(片方をもう片方の内訳として扱わない)。

### 3.4 配分の結論

| 項目 | 値 | 予算(2000 ms)比 |
| --- | --- | --- |
| 代理実測(2ファイル・numRuns 100) | 41 ms | 2.1% |
| うち固定費(派生値) | ≈ 39 ms | 2.0% |
| うち変動費(派生値、算出式 v × runs = 0.00703 ms/run × 100 runs) | ≈ 0.70 ms | 0.04% |
| 余裕 | 約 **49 倍**(2000 / 41) | — |

**設計判断**: 予算に対する余裕が2桁あるため、**性能を理由にした設計上の妥協を一切行わない**。具体的には次を禁止する(§6)。

---

## 4. 深掘り階層(`AMADEUS_PBT_DEEP=1`)は予算の対象外

business-logic-model.md §7 が「`AMADEUS_PBT_DEEP=1` の深掘りは上限の対象外(PR CI の階層ではない)」と明記し、requirements.md FR-5b が「既存 CI のブロッキング集合には加えない(非 blocking の手動 QA モード)」と定めるとおり、NFR-4 の 2 秒上限は **PR CI 階層(既定 numRuns 100)にのみ適用される**。

深掘り階層の実測(§3.2)は 4プロパティ × 50,000 runs = **391 ms**。business-rules.md BR-ST-14 が定める `const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };` の形で実装した場合、後続 unit `pbt-deep-ci` が回す深掘り実行において本 unit の2ファイルが占める時間は **1 秒未満**と見込まれる(推定 — 算出根拠: 代理実測 391 ms を2ファイル構成へ広げた場合の固定費増分が §3.2 の 40 ms → 41 ms 実測から約 1 ms であるため、391 + 1 ≈ 392 ms。実測は `pbt-deep-ci` の実装時に当該 unit が行う)。**この推定値は受け入れ基準に使わない。**

### 予算内で許容される numRuns の上限(推定)

§3.3 の派生値から外挿すると、単一ファイル4プロパティで 2000 ms を使い切る numRuns は

```
(2000 − 39.3) / 0.00703 ≈ 278,000 runs
```

**推定値(1次外挿。縮小フェーズ・GC・生成器の分布変化を織り込まない)**。既定の 100 runs はこの 1/2,780 であり、規約第1項(既定 numRuns 100)を変える必要は生じない。**この推定値も受け入れ基準に使わない** — 合否は business-rules.md 完了条件3 の実測(当該2ファイルのみを指定した `bun test` 出力からの転記)で取る。

---

## 5. 予算の測り方(合否の取り方)

business-rules.md 完了条件3 の測定手順を、曖昧さが残らない形へ確定する。

| 項目 | 確定 |
| --- | --- |
| 測定コマンド | `bun test tests/unit/t418-state-receipts-codec.pbt.test.ts tests/unit/t419-state-field-codec.pbt.test.ts`(**2ファイルのみを引数に指定**。tier ランナー経由の実行時間はスイート全体を含むため使わない) |
| 転記する値 | 出力末尾の `Ran N tests across M files. [X ms]` の `X`(`cid:requirements-analysis:numbers-from-command-output-only`) |
| 併記 | 測定 ref(実行時の `git rev-parse HEAD`)を code-generation 成果物へ併記(`cid:reverse-engineering:measurement-ref-in-artifacts`) |
| 母集団の確認 | `M` が **2**、`N` が実装したプロパティ本数と一致することを確認する(`cid:build-and-test:test-path-set-completeness` — bun は不存在 path を無音で除外して exit 0 になりうる) |
| 環境条件 | 並行 fan-out 直後の測定を避ける(`cid:code-generation:fanout-load-settle-before-integration`)。負荷起因の偽赤を予算超過と誤帰属しない |

### 引用行の HEAD 再確認(測定 ref 差分の解消)

FD 群の測定 ref `c8702be09` と本書の `26fc7ddb2` の差により行シフトが起きていないことを、本ステージで実読して確認した(`cid:reverse-engineering:upstream-cite-reresolve-on-shift`)。

| ファイル | 確認した行 | 結果 |
| --- | --- | --- |
| `packages/framework/core/tools/amadeus-state.ts` | `:225` `:239` `:242` `:248` `:257` `:261` `:266` `:270` `:278` `:281` | 全10行が FD 引用と同一(`:242` 実文 `  if (raw === null \|\| raw.trim() === "") return {};`) |
| `packages/framework/core/tools/amadeus-lib.ts` | `:5179` `:5189` `:5237` `:5242` `:5246` `:5248` `:5255` `:5263` | 全8行が FD 引用と同一(`:5246` は `content.replace(regex, ...)` によるテンプレートリテラル置換行 — business-logic-model.md §5 機序2 の引用と同一) |
| `tests/run-tests.ts` | `:117` | 実文 `  --ci            smoke + unit + integration`(requirements.md FR-4b の引用が成立) |
| `tests/unit/t265-engine-boundary.test.ts` | `:13` `:57` `:61` `:67` `:73` | 全5行が FD §3「既存 example テストとの関係」の引用と同一 |

---

## 6. 禁止事項(code-generation への制約)

余裕が2桁あることから、以下は **性能を理由にしても導入しない**。

| 禁止 | 根拠 |
| --- | --- |
| PR CI 階層の numRuns を 100 から下げる | requirements.md FR-4c(既存規約 = numRuns 100)。§3.4 のとおり予算の逼迫は存在せず、下げる動機がない |
| `fc.pre` による事後フィルタで受理ドメインを満たす | business-rules.md BR-ST-9。前提充足率の低下は**実効実行数を無音で目減りさせる**(性能ではなく検証力の問題として禁止。§3.3 のとおり実行時間は固定費支配であり、前提を構成的に満たしても予算を圧迫しない) |
| 生成器のメモ化・キャッシュ・共有可変状態 | `cid:nfr-design:c1`(CLI/テスト基盤に常駐サービス向け最適化を機械適用しない)。決定性を損なう(reliability-design.md §2) |
| 並列化(`--concurrency` 等)による予算捻出 | 同上。§3.3 のとおり固定費支配のため効果がなく、`cid:code-generation:fanout-load-settle-before-integration` の偽赤リスクだけが増える |
| 実行時間の計測目的で本番コードへ計装を入れる | business-rules.md BR-ST-17(`packages/framework/core/` を1行も変更しない)。破れたら停止して conductor へ申告 |
| 実行時間の短縮目的で実 FS / spawn を使う | business-rules.md BR-ST-16(`// size: small` 宣言と SIGNAL_PATTERNS 不一致)。`tests/lib/test-size.ts:36-39` の SIGNAL_PATTERNS(実文 `{ name: "filesystem", size: "medium", re: /\bnode:fs\b\|from ["']fs["']\|\breadFileSync\b\|…/ }` ほか)に一致した時点で unit tier から外れる |

---

## 7. 予算超過時の縮退規則(発動条件つき)

実測が 2000 ms を超えた場合、**numRuns を下げる前に原因を固定費/変動費へ帰属させる**(§3.3 の2点測定を `t418` / `t419` 自身に対して行う)。

| 帰属 | 想定原因 | 一次手当 |
| --- | --- | --- |
| 固定費が支配(numRuns を 10 倍にしても時間が伸びない) | import 面が重い / 意図せず実 FS・spawn 経路を引き込んだ | import 面を確認する。`packages/framework/core/tools/` 正本のみ(business-rules.md BR-ST-15)。dist 経由 import を書いていないか `grep -n "dist/"` で実測 |
| 変動費が支配(numRuns に比例して伸びる) | 生成器が過大な文字列長・過大な構造を生む | `fc.string` の `maxLength` を絞る(受理ドメインの意味は変えない)。除外条件を増やして生成空間を狭めることは **しない**(business-logic-model.md R-2「除外は行終端子4種と `$` のみ」、プロパティの空洞化を招く) |
| どちらでもない(実行ごとに揺れる) | 負荷起因の偽赤 | 単独実行で再測(`cid:code-generation:fanout-load-settle-before-integration`)。それでも超過するなら実装を止めて conductor へ申告 |

いずれの手当も **プロパティの本数・向き・受理ドメインの立て方を変えない**。それらを変える必要が生じた場合は FD からの逸脱であり、実装せず停止して申告する(`cid:code-generation:deviation-stop-before-implement`)。

---

## 8. 未実測として残す項目(受け入れ基準に使わない)

| 項目 | 状態 | 理由 |
| --- | --- | --- |
| `t418` / `t419` そのものの実行時間 | **未実測**(実装後に測る) | 本ステージ時点でファイルが存在しない。§3.2 は代理実測 |
| coverage patch ゲートへの影響 | **未実測** | coverage 実行は同一 worktree で単独所有者を決めて直列化する規範(`cid:code-generation:c1-coverage-single-owner`)により、本ステージの subagent は実行しない。NFR-5 の判定は conductor 所有の実行で取る |
| 深掘り階層で本 unit が占める時間 | **推定**(§4) | 実測は `pbt-deep-ci` unit の帰属 |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:28:14Z
- **Iteration:** 1
- **Scope decision:** none

FD 整合・N/A 根拠・cid 遵守は良好だが、performance §3.4 の派生値 2.8ms が v の単位(runs あたり)と 400 の誤乗算で算出式と不整合(正: v×100≈0.70ms / 実測差 41−39.3≈1.7ms)、サロゲート構成の明示不足の Major で REVISE(GoA 5)。

### Findings

- [Major] performance-design.md §3.3-3.4 — 変動費 2.8ms は単位不整合の誤乗算。v×100≈0.70ms へ訂正し、代理実測の構成差を明示すること

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:31:54Z
- **Iteration:** 2
- **Scope decision:** none

Major(変動費の単位不整合)は v×100≈0.70ms へ算出式どおり訂正・再検算一致、サロゲート構成の明示も追加。新規誤りなし。GoA 1-2。

### Findings

- None
