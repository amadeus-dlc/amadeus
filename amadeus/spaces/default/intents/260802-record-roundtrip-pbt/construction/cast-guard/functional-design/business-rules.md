# Business Rules — cast-guard (#1980 / AD U4)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: **worktree HEAD `c8702be09`**(`git diff --stat 5a6f79727..HEAD -- packages/framework/core/tools/ packages/framework/core/otel/ tests/ .github/workflows/ scripts/` は出力 0 行 = 差分ゼロ)。

## 読み方

各ルールは `BR-CG-N` の識別子を持ち、**条件 / 期待される振る舞い / 検証手段 / 出典**の4列で書く。出典列は本 unit の6 consumes(requirements.md / unit-of-work.md / unit-of-work-dependency.md / components.md / component-methods.md / decisions.md)のいずれか、または実コードの file:line である。検証手段列が空のルールは置かない — テストまたは機械確認で反証できない規則は本書に載せない(org.md Forbidden の検証劇場回避)。

## A. 検出述語(何を無検査キャストと呼ぶか)

| # | 条件 | 期待 | 検証手段 | 出典 |
| --- | --- | --- | --- | --- |
| BR-CG-1 | ノードが `as` 型アサーションで、その被アサーション式(`unwrapExpression` で剥いた後)が `JSON.parse(...)` の `CallExpression` であり、アサーション先の型が `unknown` でない | 1 サイトとして検出する | `detectUncheckedCasts` の unit テスト(最小ソース文字列) | decisions.md ADR-2 Decision (a)(:92)/ component-methods.md :203 |
| BR-CG-2 | 上記のうちアサーション先が `unknown`(`node.type.kind === ts.SyntaxKind.UnknownKeyword`) | **検出しない** | 安全形のみを含むソースで census が空(P-CG-4) | decisions.md ADR-2 Context(:86)/ Decision (a)(:92) |
| BR-CG-3 | `JSON.parse(...)` に `as` が付かない形 | 検出しない(射程外) | 同上のソースで census 空 | decisions.md ADR-2 Decision (a)(:92) |
| BR-CG-4 | キャストが複数行にまたがる、または `JSON.parse` の引数に括弧を含む(例: `JSON.parse(readFileSync(p, "utf-8")) as T`) | 検出する | 実在患部形を fixture 文字列にした unit テスト(P-CG-5) | decisions.md ADR-2 Context(:85)— 単一行 regex の再現率 27% |
| BR-CG-5 | 検出結果には `file` / `line` / `kind` を持たせ、`kind` は当面 `"json-parse-as"` の 1 語彙 | 型どおり | 型定義 + unit テスト | component-methods.md :181-186 |
| BR-CG-6 | 性能目的の事前フィルタ(`JSON.parse` を含む行が1つも無いファイルの AST 生成スキップ)を導入する場合 | 述語判定には使わず AST 生成前の足切りにのみ使う。フィルタ有無で census が変わってはならない | フィルタ有効/無効で同一 census になることの比較テスト、または SCAN_ROOTS 全域走査の件数一致 | unit-of-work.md :31 が参照する S1 契約(実行時間節) |

## B. 走査スコープ

| # | 条件 | 期待 | 検証手段 | 出典 |
| --- | --- | --- | --- | --- |
| BR-CG-7 | 走査対象ルート | `packages/framework/core` と `scripts` の2つ。既存定数の踏襲(`tests/callsite-guard.ts:61` 実文 `export const SCAN_ROOTS = ["packages/framework/core", "scripts"] as const;`) | 定数の値を assert する unit テスト | decisions.md ADR-2 Decision (c)(:96)/ components.md Reuse inventory(:94) |
| BR-CG-8 | `dist/` および self-install ハーネスツリー | 走査しない(core の投影であるため) | SCAN_ROOTS の値が上記2ルートに限られること(BR-CG-7 と同一テスト) | decisions.md ADR-2 Decision (c)(:96) |
| BR-CG-9 | `tests/` 配下 | 走査しない | 同上 | 兄弟様式 `tests/callsite-guard.ts:27-31` の SCAN SCOPE 節 |
| BR-CG-10 | ディレクトリ名が `vendor` または `node_modules` | 走査から除外する | ファイル列挙関数の integration テスト(一時ツリー) | 兄弟 `tests/callsite-guard.ts:224` 実文 `        if (entry.name === "vendor" || entry.name === "node_modules") continue;` |
| BR-CG-11 | 拡張子が `.ts` 以外 | 走査しない | 同上 | 兄弟 `tests/callsite-guard.ts:213` 実文 `const SOURCE_EXT_RE = /\.ts$/;` |
| BR-CG-12 | 台帳・レポートに記録するファイルパス | リポジトリルート相対の1形へ正規化する(絶対パスを持ち込まない) | 台帳 JSON のキーが相対パスであることの assert | 兄弟 `tests/callsite-guard.ts:239` 実文 `      const rel = relative(REPO_ROOT, path);` |

## C. 台帳(allowlist)の形と判定

| # | 条件 | 期待 | 検証手段 | 出典 |
| --- | --- | --- | --- | --- |
| BR-CG-13 | 台帳の粒度 | `(file, kind)` 単位のカウント(`Record<file, Record<kind, count>>`)。**file:line ピンは使わない** | 台帳スキーマの unit テスト + 行シフト不変性テスト(P-CG-3) | decisions.md ADR-2 Decision (b)(:94) |
| BR-CG-14 | ある `(file, kind)` で実測 > 台帳値 | **違反**(NEW_CAST)。exit 1 | in-process census 注入テスト(落ちる実証 面 A) | requirements.md FR-3a(:29)/ unit-of-work.md :31 |
| BR-CG-15 | 全 `(file, kind)` で実測 ≤ 台帳値 | OK。exit 0 | 実コーパス `--check` の integration テスト | requirements.md FR-3a(:29) |
| BR-CG-16 | ある `(file, kind)` で実測 < 台帳値(縮小) | OK(exit 0)。加えて prune 案内を stdout に出す | prune 案内行の存在を assert する integration テスト | unit-of-work.md :31 の S1 出力契約(OK 縮小検知) |
| BR-CG-17 | 台帳に無いファイル/種別でサイトが検出された | 台帳値 0 として扱い BR-CG-14 に従う(= 違反) | census 注入テスト | 兄弟 `tests/callsite-guard.ts:170` 実文 `  return allowlist.sites[file]?.[symbol] ?? 0;` |
| BR-CG-18 | 台帳が不在 / 不正 JSON / `direction !== "shrink-only"` / `sites` が非オブジェクト | **fail-closed**。`ALLOWLIST_UNREADABLE` で exit 1。実走査の結果に関わらず 0 を返さない | 4条件それぞれの integration テスト(P-CG-6) | unit-of-work.md :31(ALLOWLIST_UNREADABLE=1)/ 兄弟 `:259` `:262` `:334` |
| BR-CG-19 | 台帳の読み込みと census 解決の順序 | 台帳ロードが必ず先。台帳が読めない時点で走査結果を見ずに終了する | `runCheck` の分岐到達を lcov DA で確認(`cid:build-and-test:error-path-reach-lcov`) | 兄弟 `tests/callsite-guard.ts:332`(冒頭でロード)/ `:336`(その後 census) |
| BR-CG-20 | `--update` 実行 | 実走査から台帳を書き直し exit 0。書いた台帳に対する直後の `--check` は必ず OK | P-CG-7(自己整合) | component-methods.md :200 `runUpdate` |
| BR-CG-21 | `--update` が台帳の値を**増やす**方向で差分を生む場合 | ツールは書けるが、その差分を含む PR はレビューで拒否する(ratchet の意味は台帳が縮小方向にのみ動くこと) | PR レビュー観点(機械ではなく人の規律 — 機械側は BR-CG-14 が新規追加を CI で止める) | requirements.md FR-3a(:29)「既存残存は allowlist に固定して縮小方向のみ許す」 |
| BR-CG-22 | 初期台帳の値 | U1(election-readpath)着地後の `--update` 実出力から確定する。期待値は **33 サイト / 18 ファイル**(本ステージ実測、business-logic-model.md §3)。`amadeus-election-store.ts:80` は U1 後も検出され続けるため初期値は不変 | `--update` 実出力と期待値の照合。差があればその由来(base 前進)を確定してから台帳を確定 | components.md U4 依存(:43)/ unit-of-work.md :24 |

## D. 出力契約(verdict / exit code / ストリーム)

| # | 条件 | 期待 | 検証手段 | 出典 |
| --- | --- | --- | --- | --- |
| BR-CG-23 | OK(新規なし) | exit **0**。stdout に残存レポート(残存総数とファイル別内訳)+ OK 行 | integration テストで exit code と stdout を assert | unit-of-work.md :31 |
| BR-CG-24 | NEW_CAST | exit **1**。stderr に `[NEW_CAST]` を含む見出しと違反行(`<file>: <kind> — allowlist <a>, measured <m>` 形)+ 是正案内 | census 注入テスト | unit-of-work.md :31 / 兄弟 `:295-296` `:342-348` |
| BR-CG-25 | ALLOWLIST_UNREADABLE | exit **1**。stderr に `[ALLOWLIST_UNREADABLE]` を含む見出し + 再生成コマンド案内 | 4条件の integration テスト | unit-of-work.md :31 / 兄弟 `:334` |
| BR-CG-26 | 未知の引数 | exit **2**。stderr に usage | `main(["--bogus"])` の in-process テスト | unit-of-work.md :31(usage=2)/ 兄弟 `:378-379` 実文 `    console.error(USAGE);` / `    return 2;` |
| BR-CG-27 | 想定外の実行時例外 | exit **1**。stderr に `[UNEXPECTED]` を含む1行 | 例外を投げる seam を注入する in-process テスト | 兄弟 `:381-382` 実文 `    console.error(\`CALLSITE GUARD FAILED [UNEXPECTED]: ${(err as Error).message}\`);` / `    return 1;` |
| BR-CG-28 | 残存レポート | verdict によらず**毎回** stdout に出す(ゼロへの歩みが常に可視) | OK / NEW_CAST 両アームで残存レポート行が出ることの assert | 兄弟 `:279-280` 実文 `// The residual report BR-9 keeps visible on every run: the same shape all the` / `// way down to zero sites, so the U8 deletion gate reads one format.` |
| BR-CG-29 | `--check --report <path>` | 残存レポートを JSON で当該パスへも書く。stdout 出力は変わらない | 一時ディレクトリへ書かせて内容を読む integration テスト | unit-of-work.md :31 が参照する S1 起動形 / 兄弟 `:338` |
| BR-CG-30 | 報告する数値(残存総数・違反数・ファイル数) | すべて走査(または注入 census)から導出した値のみを出す。定数の埋め込み・別経路からの推定を出さない | 注入 census の件数と出力文字列の数値が一致することの assert | 兄弟 `:160-163` 実文 `// The ratchet verdict. Both arms carry the measured total, so the caller never` / `// reports a count it did not derive from the scan.` |
| BR-CG-31 | stdout / stderr の使い分け | 正常系(OK・残存レポート・prune 案内)は stdout、失敗系(NEW_CAST・ALLOWLIST_UNREADABLE・UNEXPECTED・usage)は stderr | 各アームでストリームを分けて assert | 兄弟 `:296`(stderr)/ `:302-305`(stdout) |

## E. テスト設計とカバレッジ

| # | 条件 | 期待 | 検証手段 | 出典 |
| --- | --- | --- | --- | --- |
| BR-CG-32 | 純関数層(検出 / census / diff / 台帳 parse / レポート構築)のテスト | `tests/unit/` に置く | ファイル配置と test-size classification ratchet | requirements.md FR-4b(:36)`cid:code-generation:fs-tests-integration-first` / components.md U4 規模内訳(:42) |
| BR-CG-33 | 実 FS・CLI を通す検証 | `tests/integration/` に置き、**spawn ではなく in-process** で `runCheck` / `runUpdate` / `main` を駆動する | integration テストの import 形(ガード本体を関数として呼ぶ) | requirements.md NFR-2(:56)/ component-methods.md :193-199(CheckOptions seam)/ 兄弟 CLI テスト `:5-6` |
| BR-CG-34 | `census` 注入 seam | テストからのみ到達可能とし、argv からは設定できない | `main` の引数解析が census を受け付けないことの assert(P-CG-8) | component-methods.md :197 / 兄弟 `:321-322` |
| BR-CG-35 | 落ちる実証 — 面 A(常設) | in-process census 注入で NEW_CAST / exit 1 を実測するテストを常設する | 当該テストの実在 | requirements.md FR-3c(:31)/ component-methods.md :204 |
| BR-CG-36 | 落ちる実証 — 面 B(1回) | 実コーパスの**実行時に評価される式**へ違反を一時注入し、`--check` の赤を実測してから revert する。赤の実測→revert を不可分1セットで行い、注入を head に残したまま報告しない | 実施記録(stage diary / PR 本文)+ revert 後の green 再実測 | requirements.md FR-3c(:31)/ `cid:code-generation:injection-surface-verify` / `inject-runtime-consumed-lines` / `falling-proof-injection-one-set` |
| BR-CG-37 | 新設ガードの corpus sweep | 述語を実コーパス全数へ適用し、**正当な既存データで赤にならない**ことも実測する(赤くなることの実証と対) | SCAN_ROOTS 全域 `--check` が初期台帳に対して exit 0 | `cid:code-generation:corpus-sweep-for-new-guards` |
| BR-CG-38 | 新規テスト番号(tNNN) | 着手時に予約し、再接地時は固定 base SHA の `tests/` 実測で再確認する。衝突時は自 PR 側を改番し全参照を更新する | `ls tests/unit tests/integration` の実測 | unit-of-work.md :33 |
| BR-CG-39 | patch coverage | 新規行は in-process 駆動で計測されること。push 前にローカル lcov で diff 追加行の未カバー 0 を実測する | ローカル lcov | requirements.md NFR-2(:56)/ `cid:code-generation:local-lcov-pre-push` |

## F. CI 配線と共有資源

| # | 条件 | 期待 | 検証手段 | 出典 |
| --- | --- | --- | --- | --- |
| BR-CG-40 | CI 実行位置 | `.github/workflows/ci.yml` の `lint` ジョブ(`:93` `  lint:`)、既存 callsite-guard ステップ(`:119` 実文 `        run: bun tests/callsite-guard.ts --check`)の直後に1ステップとして置く | ci.yml の該当ステップの実在 | unit-of-work.md :31 |
| BR-CG-41 | ブロッキング性 | ブロッキング(`lint` は `ci-success` の `needs` に含まれる — `.github/workflows/ci.yml:615-623`)。`ci-success` の `needs` 集合自体は**変更しない** | t222 系の `ci-success` needs ピンが緑のまま | unit-of-work.md :31 / requirements.md NFR-5(:59) |
| BR-CG-42 | ci.yml 編集の副作用 | `tests/fixtures/formal-verif-ci-baseline.sha256` を再 baseline し、`tests/integration/t-formal-verif-ci-workflow.integration.test.ts` の「Recorded re-baselines」注記へ本 intent 分を追記する | 当該テストの green + 注記の実在 | 同テスト :14-17 の仕組み記述 / decisions.md ADR-3 Consequences(:179)の同型手順 |
| BR-CG-43 | pbt-deep-ci との順序 | 本 unit が先に着地する(共有資源 = ci.yml + baseline fixture のため直列化) | Bolt 実行順 | unit-of-work-dependency.md :16 / :20 / :43 |
| BR-CG-44 | 既存ブロッキング集合 | coverage(project/patch/relative)・complexity・dist/self-install drift・plugin-conformance-e2e を含む現行集合が全緑のまま | CI | requirements.md NFR-5(:59) |

## G. 境界(本 unit が守る非目標)

| # | 条件 | 期待 | 検証手段 | 出典 |
| --- | --- | --- | --- | --- |
| BR-CG-45 | `packages/framework/core/` への書き込み | 行わない(BR-CG-36 の一時注入とその revert を除く。revert 後の差分はゼロ) | PR diff にプロダクション変更が含まれないこと | components.md U4 所在(:39)/ unit-of-work.md :13 |
| BR-CG-46 | `tests/callsite-guard.ts` 本体 | 変更しない(様式の引用元であり、走査語彙の異なる別ガード) | PR diff | components.md Reuse inventory(:93) |
| BR-CG-47 | 母集団 33 件の是正 | 本 unit では行わない。可視化と単調減少の保証までとする | PR スコープ | requirements.md A-3(:73) |
| BR-CG-48 | `kind` 語彙の拡張 | 本 unit では `"json-parse-as"` の1語彙で始める。台帳の形は拡張可能な `Record<file, Record<kind, count>>` を採る | 型定義 | decisions.md ADR-2 Consequences(:125) |
| BR-CG-49 | dist 投影 | 本 unit の成果物は `tests/` 配下のみで dist へ投影されないため、`dist:check` / `promote:self:check` の負担を増やさない(NFR-1 の 7 ハーネス再生成は本 unit の出荷条件に含まれない) | `dist:check` が本 unit の変更で動かないこと | unit-of-work.md 共通制約(:29 — 「election-readpath のみ `packages/framework/core/` を触る」) |
| BR-CG-50 | TDD | 実装は Red→Green の vertical slice を1件ずつ積む。テスト一括先行・実装後テスト追加は TDD 実施と見なさない | コミット列(Red の実測記録) | requirements.md C-1(:63)/ `cid:code-generation:tdd-default-with-narrow-exceptions` |

## トレーサビリティ

| FR / 制約(出典) | 対応する BR |
| --- | --- |
| requirements.md FR-3a(:29)ratchet 本体 | BR-CG-13〜22 |
| requirements.md FR-3b(:30)+ decisions.md ADR-2(:65-147)述語 | BR-CG-1〜6 |
| requirements.md FR-3c(:31)落ちる実証 | BR-CG-35〜37 |
| requirements.md NFR-2(:56)coverage | BR-CG-33 / 34 / 39 |
| requirements.md NFR-5(:59)既存ゲート維持 | BR-CG-41 / 44 |
| requirements.md C-1(:63)TDD | BR-CG-50 |
| unit-of-work.md :31 S1 出力契約 | BR-CG-23〜31 |
| unit-of-work.md :33 tNNN 予約 | BR-CG-38 |
| unit-of-work-dependency.md :16 / :43 順序・共有資源 | BR-CG-42 / 43 |
| components.md U4(:37-43)所在・規模・依存 | BR-CG-22 / 32 / 45 / 46 |
| component-methods.md U4(:175-205)関数面 | BR-CG-5 / 19 / 20 / 34 |
| decisions.md ADR-2 / ADR-3 / ADR-4 | BR-CG-1〜4 / 7〜8 / 13 / 42 / 48、および母集団に残る `readJson` 本体(ADR-4 Decision :217) |

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段3(バリデータ非経由の読み戻し経路新設の CI 機械ブロック)に対応する。
- services.md との関係: 本 unit の CLI 出力契約(verdict×exit code)と CI 実行位置は services.md S1 節が正本であり、本書の該当表は S1 からの転記である。
