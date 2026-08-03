# Business Logic Model — cast-guard (#1980 / AD U4)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: 本書の file:line・件数・実測値はすべて **worktree HEAD `c8702be09`** の実測。`git diff --stat 5a6f79727..HEAD -- packages/framework/core/tools/ packages/framework/core/otel/ tests/ .github/workflows/ scripts/` は空(出力 0 行、exit 0)であり、application-design(measured ref `5a6f79727`)および RE observed `9750f8aea` が確定した file:line・件数は HEAD でそのまま成立する。

## 1. 本 unit の業務ロジックの位置づけ

本 unit(cast-guard)は requirements.md `FR-3a`(:29)が定める「共有バリデータを経由しない読み戻し経路の残存を検出する専用静的ガードを `tests/callsite-guard.ts` 同型の allowlist ratchet として追加する — 新規違反のみ fail、既存残存は allowlist に固定して縮小方向のみ許す」を実装する単位である。`FR-3b`(:30)が application-design へ委譲した述語設計は decisions.md `ADR-2`(:65-147)で確定済みであり、本書はその裁定を**業務ロジック(処理フロー・状態・不変量)として固定する**。裁定の再検討は行わない。

unit-of-work.md の Unit 一覧(:13)は本 unit を「AD U4(`tests/unchecked-cast-guard.ts` + allowlist + ガード自身のテスト、365〜480)。AST 走査・(file,kind) 単位・shrink-only(ADR-2)。落ちる実証必須(FR-3c)」と規定し、対応 FR を `FR-3a〜3c` に限定する。components.md `U4`(:37-43)の所在規定(`tests/` 配下の新規ガード本体 + allowlist JSON + ガード自身のテスト)がそのまま本 unit の変更面であり、**プロダクションコード(`packages/framework/core/`)には一切書き込まない**。走査対象としてプロダクション源を読むだけである。

unit-of-work-dependency.md の YAML edge block(:16)は `cast-guard` の `depends_on` を `[election-readpath]` と定める。理由は同書 :41 の「batch 3: cast-guard(election-readpath 着地後の allowlist 初期採取)」であり、components.md `U4` の依存記述(:43)が根拠を明示する — ただし同記述が確定するとおり `amadeus-election-store.ts:80` の `as T` は `readJson<T>` 本体の構文であり、AST 述語は呼出し側の型引数に依存しないため **U1 着地後も検出され続け、初期母集団は 33 サイト / 18 ファイルのまま不変**である。したがって本 unit にとって U1 への依存は「台帳の書き直し往復を避ける弱順序」であって、値の前提ではない。

decisions.md `ADR-1`(:9-61)は「新規 PBT(U2 / U3 / U7)と新規 arbitrary(U8)は `packages/framework/core/tools/` の正本を import する」と定めるが、**本 unit はその適用対象に入らない** — 本 unit は PBT でも arbitrary でもなく、プロダクション源を `import` せず**テキストとして読み AST へ解析する**からである(この差は同 ADR の Decision 文が対象を U2/U3/U7/U8 と名指ししていることで確定する)。ガード自身のテストは `tests/callsite-guard.ts` の兄弟様式どおりガード本体を相対 import する(実例: `tests/unit/t367-callsite-guard.test.ts:22` 実文 `} from "../callsite-guard.ts";`)。

decisions.md `ADR-3`(:151-197)は本 unit の直接の裁定ではない(対象は pbt-deep-ci の CI ジョブ)が、その Consequences(:179)が記録する「`tests/fixtures/formal-verif-ci-baseline.sha256` の再 baseline が必要」という手順は、本 unit の CI ステップ追加にも同一に適用される(§6)。

## 2. 対象ドメイン — 「無検査キャスト」とは何か

requirements.md の Intent analysis(:9)が特定した患部クラスは「ディスク/外部から読んだ JSON を、型の証明なしにドメイン値として名乗らせるキャスト」である。本 unit が扱う業務上の対象は、その構文的痕跡である。

**対象(母集団に入る)**: `JSON.parse(...)` の呼び出し結果に対する `as T` 型アサーション。ここで `T` は `unknown` 以外。

**非対象(母集団に入れない)**:

| 形 | 理由 |
| --- | --- |
| `JSON.parse(x) as unknown` | `unknown` へのキャストは型の証明を主張せず、parse-don't-validate と両立する安全形。decisions.md ADR-2 Context(:86)が「母集団に入れるべきではない」と裁定済み。HEAD 実測で SCAN_ROOTS 上に **8 件** |
| `JSON.parse(x)`(キャストなし) | 戻り値は `any` だが、本 unit の述語は `as` の存在を要件とする(ADR-2 Decision (a) :92)。射程外 |
| `dist/` 配下の同形 | core の投影であり、走査スコープ外(ADR-2 Decision (c) :96) |
| `tests/` 配下の同形 | SCAN_ROOTS の外(`tests/callsite-guard.ts:61` 実文 `export const SCAN_ROOTS = ["packages/framework/core", "scripts"] as const;`) |

述語の確定形は decisions.md ADR-2 Decision (a)(:92)の逐語どおり: 「`ts.isAsExpression(node)` かつ `unwrapExpression(node.expression)` が `JSON.parse(...)` の `CallExpression` であり、かつ `node.type.kind !== ts.SyntaxKind.UnknownKeyword`」。

## 3. 初期母集団(本ステージでの独立再測定)

component-methods.md `U4`(:203)の述語をそのまま実装した read-only スクリプト(repo 外 scratch、`cid:requirements-analysis:scratch-script-discipline` 準拠)で SCAN_ROOTS 全域を走査した結果:

```
{"typed":33,"files":18,"multi":5,"unknownCasts":8}
```

components.md の初期母集団表(:110-116)が記録する **33 サイト / 18 ファイル(うち多行 5)/ `as unknown` 8** と**完全一致**する(`cid:requirements-analysis:enumeration-reverify-at-implementation` の実装段第3再列挙)。ファイル別内訳は domain-entities.md §5 に転記した。

この 33 という値は「可視化された技術的負債の総量」であり(decisions.md ADR-2 Consequences :123、requirements.md `A-3` :73 の「残余は FR-3 の allowlist ratchet が可視化・縮小方向で管理する」に一致)、本 unit の成功はこの値をゼロにすることではなく、**この値が増えないことを機械的に保証すること**である。

## 4. 処理フロー

ASCII フロー(Mermaid 不使用)。角括弧は状態、矢印は遷移。

```
        argv
          |
          v
   [ARGS-PARSE] --未知引数--> (USAGE_ERROR)          exit 2
          |
     --check / --update
          |
    +-----+------------------------------+
    |                                    |
  --update                             --check
    |                                    |
    v                                    v
 [SCAN] 実走査                    [ALLOWLIST-LOAD]
    |                                    |
    v                            +-------+--------+
 [CENSUS]                     不読|                |読めた
    |                             v                v
    v                       (ALLOWLIST_       [CENSUS-RESOLVE]
 [RENDER-ALLOWLIST]          UNREADABLE)       census 注入あり? --はい--> 注入値
    |                          exit 1              |いいえ
    v                                              v
 台帳を書き出す                                  [SCAN] 実走査
    |                                              |
    v                                              v
  exit 0                                     [RESIDUAL-REPORT]
                                                   |
                                          --report 指定あり? --はい--> JSON 書出
                                                   |
                                                   v
                                              [DIFF] 台帳と突合
                                                   |
                                     +-------------+-------------+
                                     |超過あり                    |超過なし
                                     v                           v
                                (NEW_CAST)                     (OK)
                                  exit 1              過小 entry あれば prune 案内
                                                            exit 0
```

各段の責務は component-methods.md `U4`(:179-201)の関数群に 1:1 対応する。

| 段 | 関数(component-methods.md :179-201) | 純粋性 | テスト層 |
| --- | --- | --- | --- |
| SCAN(ファイル列挙 + 読取) | `scanRepository`(兄弟様式 `tests/callsite-guard.ts:235`) | 不純(FS) | integration |
| 検出 | `detectUncheckedCasts(file, source)` | 純関数 | unit |
| CENSUS | `buildCensus(matches)` | 純関数 | unit |
| DIFF | `diffAgainstAllowlist(census, allowlist)` | 純関数 | unit |
| ALLOWLIST-LOAD | `parseAllowlist`(兄弟 `:248`)+ 不在検査 | parse は純関数 / 読取は不純 | unit + integration |
| RESIDUAL-REPORT | `buildResidualReport`(兄弟 `:287`) | 純関数 | unit |
| CLI | `runCheck(options)` / `runUpdate(path)` / `main(args)` | 不純 | integration(in-process 駆動) |

この純/不純の分離は requirements.md `FR-4b`(:36)が引く `cid:code-generation:fs-tests-integration-first`(実 FS を使う検証は integration 層)と、components.md `U4` 規模内訳(:42)の「ガード自身のテスト 120〜160 行(`tests/unit/t367-callsite-guard.test.ts` + `tests/integration/t367-callsite-guard-cli.test.ts` の2分割様式に倣う)」に一致する。兄弟様式は実際にこの2分割であり、CLI 側ヘッダ実文(`tests/integration/t367-callsite-guard-cli.test.ts:5-6`)は `// Driven IN PROCESS (not through a spawned CLI) so the wiring lines are` / `// measured: bun --coverage does not instrument a spawned subprocess` と、その理由(requirements.md `NFR-2` :56 と同じ根拠)を明記する。

## 5. 状態モデルと個数照合

判定状態(verdict)と exit code の対応は unit-of-work.md :31 が「services.md S1 の出力契約(verdict 5値 × exit code: OK=0 / NEW_CAST=1 / ALLOWLIST_UNREADABLE=1 / usage=2)」として本 unit の実装制約に確定している(AD 原典は services.md S1 の出力契約表)。ここに兄弟様式が持つ `UNEXPECTED`(`tests/callsite-guard.ts:381-382` 実文 `    console.error(\`CALLSITE GUARD FAILED [UNEXPECTED]: ${(err as Error).message}\`);` / `    return 1;`)を加えた**全 6 状態**が実装の終端集合である。

個数照合(`cid:functional-design:state-machine-cardinality-check`): 終端状態 **6** × exit code 値域 **{0, 1, 2}** の写像は下表で全単射ではなく全射(0←2状態 / 1←3状態 / 2←1状態)であり、**未定義の終端が無い**ことを機械的に確認できる。「OK(縮小検知)」は OK の下位状態(stdout に prune 案内が1ブロック増えるだけで exit は 0)であり、独立した終端ではない — この区別を曖昧にすると exit code の写像が壊れるため、下位状態として明示する。

| # | 終端状態 | exit | 判定入力 |
| --- | --- | --- | --- |
| 1 | OK | 0 | 全 (file, kind) で measured ≤ allowed、かつ過小 entry なし |
| 2 | OK(縮小検知 = 下位状態) | 0 | 上記かつ measured < allowed の entry が1件以上 |
| 3 | NEW_CAST | 1 | いずれかの (file, kind) で measured > allowed |
| 4 | ALLOWLIST_UNREADABLE | 1 | 台帳が不在 / 不正 JSON / `direction !== "shrink-only"` / `sites` が非オブジェクト |
| 5 | USAGE_ERROR | 2 | argv が既知の3形のいずれにも一致しない |
| 6 | UNEXPECTED | 1 | 上記いずれでもない実行時例外 |

遷移の一方向性: ALLOWLIST-LOAD は CENSUS-RESOLVE より**必ず先**に走る(兄弟 `tests/callsite-guard.ts:332` が `runCheck` 冒頭で `loadAllowlistOrFail` を呼び、`:336` で census を解決する順序と同一)。これは fail-closed の意味を持つ — 台帳が読めない状況で実走査の結果だけを見て 0 を返す経路が構造的に存在しない。

## 6. 不変量

| # | 不変量 | 破れたときに起きること | 根拠 |
| --- | --- | --- | --- |
| I-1 | **shrink-only 単調性** — 判定が OK になるのは全 (file, kind) で `measured ≤ allowed` のときに限る | 新規の無検査キャストが無音で入る = ratchet 契約の消滅 | requirements.md FR-3a(:29) |
| I-2 | **fail-closed 全域性** — 台帳が読めない場合、判定は必ず非 0 で終わる | 台帳を消せばゲートを黙らせられる(検証劇場) | unit-of-work.md :31(ALLOWLIST_UNREADABLE=1)/ 兄弟 `:334` |
| I-3 | **述語の全数性** — 検出は AST 単位であり、多行にまたがる形・引数に括弧を含む形を取りこぼさない | 再現率 27% のガード(decisions.md ADR-2 Context :85)= 検証劇場 | decisions.md ADR-2 Decision (a)(:92) |
| I-4 | **安全形の非算入** — `as unknown` は母集団に入らない | 8 件の安全形が負債として計上され、縮小圧力の意味が濁る | decisions.md ADR-2 Context(:86) |
| I-5 | **行番号非依存** — 台帳に行番号を持たせない。無関係な編集による行シフトで判定が変わらない | 行ピン stale で全 PR が偽の赤(`cid:code-generation:allowlist-line-pin-stale`) | decisions.md ADR-2 Decision (b)(:94)/ 兄弟 `:21-25` |
| I-6 | **数値の走査由来性** — 報告する残存数・違反数は走査結果から導出した値のみ | ハードコード数値 = 検証劇場 | 兄弟 `:160-163` 実文 `// The ratchet verdict. Both arms carry the measured total, so the caller never` / `// reports a count it did not derive from the scan.` |
| I-7 | **プロダクション非改変** — 本 unit は `packages/framework/core/` へ書き込まない(BR-CG-36 の落ちる実証・面B の一時注入とその revert を除く — BR-CG-45 と同一の例外注記) | 走査対象を自ら動かすと母集団の意味が失われる | components.md U4 所在(:39)/ unit-of-work.md :13 |
| I-8 | **事前フィルタの無害性** — 性能目的の足切りは述語判定に使わず、見逃しを作らない | 高速化と引き換えの見逃し = I-3 の破れ | AD services.md S1 実行時間節(unit-of-work.md :31 が参照する S1 契約の一部) |

## 7. プロパティ(テスト可能な業務ロジックとしての固定)

requirements.md `FR-4a`(:35)が定める PBT の常駐対象は state / election 境界であり、**本 unit は PBT の対象ではない**(unit-of-work.md :13 の対応 FR は `FR-3a〜3c` のみ)。ただし上記不変量のうち機械検証可能なものは、example-based テストで以下のプロパティ形として固定する。以下の P-CG-n は「1件以上のテストが実際にこの命題を検査する」ことを実装段の完了条件とする。

- **P-CG-1(ratchet の両側)**: 任意の census と台帳について、`∃(f,k). measured(f,k) > allowed(f,k)` ⟺ verdict が `violations`。片側(OK になること)だけを検査したテストは本プロパティを満たさない — `cid:code-generation:corpus-sweep-for-new-guards` が要求する両側実測に対応する。
- **P-CG-2(総数保存)**: `totalSites(buildCensus(matches)) === matches.length`。census 化で件数が失われない(兄弟 `:152` `totalSites` と同型)。
- **P-CG-3(行シフト不変性)**: 任意のソースに空行・コメント行を挿入しても census は不変(I-5 の実証)。`detectUncheckedCasts` の戻り値のうち `line` は変わるが、`buildCensus` の出力は変わらない。
- **P-CG-4(安全形の除外)**: `JSON.parse(x) as unknown` のみを含むソースの census は空(I-4)。
- **P-CG-5(多行・入れ子括弧の捕捉)**: `JSON.parse(readFileSync(p, "utf-8")) as T` および複数行にまたがる同形が検出される(I-3 の実証)。実在例を fixture 文字列として使う — HEAD 実文 `packages/framework/core/tools/amadeus-orchestrate.ts:1225` と `packages/framework/core/tools/amadeus-plugin-activation.ts:184` が decisions.md ADR-2 Context(:85)に引用されている患部クラスそのものである。
- **P-CG-6(fail-closed の全域性)**: 台帳が不在 / 不正 JSON / `direction` 不一致 / `sites` 非オブジェクトのいずれでも exit は非 0(I-2)。
- **P-CG-7(--update → --check の自己整合)**: `--update` で書いた台帳に対する `--check` は必ず OK(exit 0)。
- **P-CG-8(seam の非公開性)**: `census` 注入は argv からは到達できない(兄弟 `:321-322` 実文 `  // The census to judge, for tests. It defaults to a live scan, and argv has no` / `  // way to set it — \`main\` only ever measures. The seam exists because the`)。

## 8. 落ちる実証(FR-3c)の2面

requirements.md `FR-3c`(:31)は「違反を注入して実際に赤くなること、注入は『テストが実際に読む面』かつ実行時に消費される行へ、赤の実測→revert までを不可分1セットで」と定める。本 unit ではこれを**2つの面**で行う。両面とも実施することが完了条件であり、片方の省略は認めない。

**面 A — in-process census 注入(常設)**: `CheckOptions.census` に違反を含む census を注入し、`runCheck` が `NEW_CAST` / exit 1 を返すことをテストとして常設する。component-methods.md `U4`(:204)が seam の理由を「違反アームを in-process で駆動できないと『落ちる実証』が spawn 越しになり lcov の盲点に落ちる」と明記しており、requirements.md `NFR-2`(:56)の patch coverage 要件と直結する。この面は**実ファイルを改変しないため revert 対象が生じない**。

**面 B — 実コーパスへの一時注入(1回のみ・不可分)**: `packages/framework/core/` 配下の**実行時に評価される式**へ `JSON.parse(...) as SomeType` を一時的に置き、`--check` が実際に赤くなることを1回だけ実測してから revert する。型注釈のみの変更は TypeScript の実行時消去により「実行時に消費される行」条件(`cid:code-generation:inject-runtime-consumed-lines`)を満たさないため、注入は必ず評価される式として置く。この面は `cid:code-generation:falling-proof-injection-one-set` に従い「赤の実測 → revert push 完了」までを不可分の1セットとして実施し、注入が head に乗ったまま報告・待機しない。面 B の目的は「テストが実際に読む面」が実コーパスであることの確認(`cid:code-generation:injection-surface-verify`)であり、面 A の in-process 注入だけでは検査できない配線(SCAN → CENSUS → DIFF の実結線)を1回だけ通す。

## 9. CI 実行位置と共有資源

unit-of-work.md :31 は本 unit の CI 実行位置を「ci.yml lint ジョブの callsite-guard 直後・ブロッキング」と確定している。HEAD 実測での挿入位置は `.github/workflows/ci.yml:119` 実文 `        run: bun tests/callsite-guard.ts --check` の直後であり、当該ジョブは `:93` `  lint:` / `:94` `    name: Lint and complexity`、`ci-success` の `needs`(`:615-623`)に `lint` が含まれるため**本 unit のステップはブロッキング**になる(requirements.md `NFR-5` :59 の既存ブロッキング集合は変えず、`lint` ジョブの内側にステップを足す形)。

unit-of-work-dependency.md :43 が確定するとおり、本 unit と pbt-deep-ci は `.github/workflows/ci.yml` と `tests/fixtures/formal-verif-ci-baseline.sha256` を共有するため**直列化**され(同書 :16 の edge と :20 の `pbt-deep-ci depends_on [.., cast-guard]`)、本 unit が先に着地する。ci.yml 編集に伴う必須手順は2つ:

1. `tests/fixtures/formal-verif-ci-baseline.sha256` の再 baseline(HEAD 実文の1行 `80b0b5e9a9803e7dfe834b65bb6e9738c39e62700f2f13a3dfed1ad5824995cf  .github/workflows/ci.yml`)。
2. `tests/integration/t-formal-verif-ci-workflow.integration.test.ts` の「Recorded re-baselines」注記への本 intent 分の追記。同ファイル :14-17 実文が仕組みを明記する: `// The baseline SHA pins ci.yml OUTSIDE the three regions normalizedCiBaseline` / `// strips (the formal job block, the workflow_dispatch line, the empty-base` / `// branch), so every sanctioned edit elsewhere in the file re-baselines the` / `// fixture. Recorded re-baselines:`。

先行例は同注記に3件記録されている(260725-mirror-review-fixes / 260729-otel-upstream U7 と U8 / 260801-open-bug-batch-5)。とりわけ U7 の記録(`:20-22` 実文 `//   - 260729-otel-upstream U7: the lint job's callsite-guard step, placed in` / `//     the lint job per the E-U7CG-Q1 ruling (guard lives in tests/, CI runs it` / `//     as one lint step).`)は**本 unit と同型の配置判断が既決である**ことを示す。この手順は decisions.md ADR-3 Consequences(:179)が pbt-deep-ci について記述するものと同一の定型である。

## 10. TDD の Red 面(C-1)

requirements.md `C-1`(:63)は「実行可能な振る舞いの追加・変更(FR-1 の fail-closed 化、FR-3 のガード)は失敗テスト先行の Red→Green で実装する」と定める。本 unit の最初の Red は **P-CG-1 の違反側**とする — ガード本体が存在しない時点で `detectUncheckedCasts` / `diffAgainstAllowlist` の import が解決できず赤になり、実装の最小形(検出 + census + diff)で緑になる。以降 P-CG-2 〜 P-CG-8 を1件ずつ Red→Green の vertical slice として積む(`cid:code-generation:tdd-default-with-narrow-exceptions` の「一括先行禁止」)。

初期 allowlist(`tests/.unchecked-cast-allowlist.json`)は **U1(election-readpath)着地後に `--update` の実出力から確定**する(unit-of-work.md :24、components.md U4 依存 :43)。期待値は §3 の実測どおり 33 サイト / 18 ファイルであり、`--update` の実出力がこれと異なる場合は前提の変化(base 前進による患部の増減)を意味するので、実装段で差分の由来を確定してから台帳を確定する。

## 11. 規模と再利用(既存インフラ棚卸しの参照)

components.md 規模表(:78)は U4 を **365〜480 行**(ガード本体 220〜280 + allowlist JSON 25〜40 + ガード自身のテスト 120〜160)と見積る。unit-of-work.md :13 の Unit 見積(test tooling 365〜480行)と一致する。

新規機構はガード本体1本のみで、他は既存資産の再利用である(components.md Reuse inventory :93-95):

- ratchet 様式(shrink-only allowlist)= `tests/callsite-guard.ts` の `Census`(`:133`)/ `buildCensus`(`:142`)/ `diffAgainstAllowlist`(`:201`)/ `parseAllowlist`(`:248`)/ `CheckOptions`(`:318`)/ `runCheck`(`:330`)。
- 走査スコープ定数 = `tests/callsite-guard.ts:61`(§2 に逐語引用)。
- AST 走査基盤 = `tests/lib/typescript-source.ts` の `unwrapExpression`(`:19` 実文 `export function unwrapExpression(expression: ts.Expression): ts.Expression {`)/ `visitNodes`(`:54` 実文 `export function visitNodes(`)、`tests/lib/guard-corpus-ast.ts` の `callNames`(`:25`、`:26` で `ts.createSourceFile`)。`typescript` は既存 devDependency(`package.json:42` 実文 `    "typescript": "^6.0.3"`)であり**新規外部依存はゼロ**。

なお本ステージの実測では `tests/callsite-guard.ts` は **386 行**(測定: `wc -l < tests/callsite-guard.ts` → `386`)であり、components.md :42 の「全 383 行」とは 3 行の差がある。規模見積の桁(同オーダー)に影響しないため見積値は据え置くが、実装段で本体行数を引く場合は 386 を使う。

## 12. 非目標(本 unit で行わないこと)

- 母集団 33 件の**修正**は行わない。本 unit は可視化と単調減少の保証までであり、個々のキャストの是正は requirements.md `A-3`(:73)のとおり ratchet が与える縮小圧力に委ねる。
- 述語語彙の拡張(`kind` を `json-parse-as` 以外へ増やすこと)は行わない。台帳の形は将来拡張に耐えるが(decisions.md ADR-2 Consequences :125)、本 unit では1語彙で始める。
- `readJson<T>` 本体(`packages/framework/core/tools/amadeus-election-store.ts:80`)の改変は行わない(decisions.md `ADR-4` Decision(:217)実文 `readJson<T>` の汎用形は変更しない— 当該行は本 unit の母集団に残り続ける)。
- `tests/callsite-guard.ts` 本体への変更は行わない(様式の引用元であり、走査対象語彙が異なる別ガードである)。

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段3(バリデータ非経由の読み戻し経路新設の CI 機械ブロック)に対応する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T18:26:04Z
- **Iteration:** 1
- **Scope decision:** none

無申告逸脱なし。33/18 不変の継承正しく、S1 契約の全射写像は個数照合まで機械的に正しい。落ちる実証2面設計は S1 一致。Minor 2件(I-7 例外注記欠落=是正済み・BR-CG-21 の方針文言整合)+手続き開示1件。GoA 1-2。

### Findings

- [Minor] business-logic-model.md I-7 — 面B 一時注入の例外注記欠落(是正済み)
- [Minor] BR-CG-21 の検証手段が非機械的(BR-CG-14 が機械ゲートを担う旨注記あり・実害なし)
- [Minor] レビュー手続き — decisions.md を check-read なしで読取(内容一致・影響なしと自己開示)
