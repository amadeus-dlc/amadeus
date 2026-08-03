# Logical Components — cast-guard (#1980 / AD U4)

上流入力(consumes 全数): business-logic-model.md(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用。加えて decisions.md(ADR-1〜4)・components.md・component-methods.md も宣言外の追加入力として本文で file:line 引用している)

本書は business-logic-model.md §4(処理フローと関数群の 1:1 対応表)・§5(状態モデル)・§6(不変量)・§11(規模と再利用)・§12(非目標)に依拠し、そこで確定した設計を**保証機構の層別**として整理する。宣言外の追加入力として同 unit の business-rules.md(BR-CG 全域)と domain-entities.md(§3 型定義・§4 所有関係)を併読した。

## 測定 ref

worktree HEAD **`26fc7ddb29228757d40e3d15d6d8c0513d505f63`**。performance-design.md 冒頭と同じ差分確認により、FD の file:line・件数は HEAD で成立する。

## 1. 層構成

```
  [L5] 人 — PR レビュー
        BR-CG-21(台帳値の増加を拒否) / SC-3(走査範囲拡大の由来明示)
          ^ 機械化されない層。ここに依存する保証を「構造的保証」と呼ばない
          |
  [L3] CI 配線 — .github/workflows/ci.yml lint ジョブの1ステップ(ブロッキング)
          |
  [L2] CLI 層 — runCheck(options) / runUpdate(path) / main(args)
        不純。順序契約(台帳ロード → census 解決)/ 時刻の注入 / exit code の決定
          |
  +-------+---------------------------+
  |                                   |
[L1] I/O 層                        [L0] 純関数コア
  listSourceFiles / scanRepository    detectUncheckedCasts / buildCensus
  台帳の読み書き / レポート書出       diffAgainstAllowlist / parseAllowlist
  不純(FS)                          buildResidualReport / totalSites
                                      副作用なし・時計なし・FS なし
          |                                   |
          +----------------+------------------+
                           |
  [L4] テスト — tests/unit/(L0)/ tests/integration/(L1・L2 を in-process 駆動)
```

L0 と L1/L2 の分離は business-logic-model.md §4 の純/不純表と 1:1 であり、requirements.md `FR-4b`(:36)が引く `cid:code-generation:fs-tests-integration-first`(実 FS を使う検証は integration 層)に対応する。

**L0 の「純粋」は副作用が無いことであって依存が無いことではない** — L0 は `typescript`(AST API)に依存する。FS・時計・ネットワーク・プロセス状態に触れないことが L0 の契約である。

## 2. モジュール別の保証機構(層別 — 一枚岩の断定を置かない)

`cid:nfr-design:c4` に従い、「本 unit は構造的に安全」といった全称の断定を置かず、モジュールごとに**保証する性質**と**保証しない性質**を対で書く。

| 層 / モジュール | 保証する性質 | 機構 | 検証手段 | 保証しない性質 |
| --- | --- | --- | --- | --- |
| L0 `detectUncheckedCasts` | I-3 述語の全数性(多行形・入れ子括弧を取りこぼさない)/ I-4 安全形(`as unknown`)の非算入 | AST 述語(`ts.isAsExpression` × `unwrapExpression` 後の `JSON.parse` CallExpression × `type.kind !== UnknownKeyword`) | P-CG-4 / P-CG-5(unit、fixture 文字列) | 型エイリアス越しの `unknown`(decisions.md ADR-2 代替 B の却下による既知の代償。現状の 8 件はすべて構文上 `unknown` キーワードで実害ゼロ)。`JSON.parse` 以外の無検査取り込み形(`kind` 語彙 1 つ — BR-CG-48) |
| L0 `buildCensus` | I-6 数値の走査由来性(件数は走査結果からの機械計算のみ)/ 総数保存 | 純関数の 1 パス集計 | P-CG-2(`totalSites(buildCensus(m)) === m.length`) | census が母集団を表すことは走査層(L1)の責任 |
| L0 `diffAgainstAllowlist` | I-1 増加の阻止(measured > allowed → violations)/ 台帳に無いキーの既定 0 扱い | 純関数の比較。既定値 0(兄弟 `tests/callsite-guard.ts:170` 実文 `  return allowlist.sites[file]?.[symbol] ?? 0;`) | P-CG-1(**両側** — 赤になること / 緑になること)/ BR-CG-17 | **台帳値そのものが増えないこと**(L5) |
| L0 `parseAllowlist` | 台帳スキーマの 4 検査(JSON 構文 / オブジェクト性 / `direction` / `sites`)。検証の単一所有 | 判別戻り値(`loaded` / `failed`) | P-CG-6(4 条件すべて) | 台帳の**意味的**正しさ(値が実態と一致するか)。これは `--update` の自己整合(P-CG-7)が担う |
| L0 `buildResidualReport` | 出力の決定性(キー順 sort・時刻は引数) | 兄弟 `:289` 実文 `  for (const file of Object.keys(census).sort()) {` | 固定 `now` を渡す unit テスト | レポートの書き出し先の妥当性(L2) |
| L1 `listSourceFiles` / `scanRepository` | 走査範囲の確定(SCAN_ROOTS 2 ルート / `.ts` のみ / `vendor`・`node_modules` 除外)/ パスの相対正規化 / 列挙順の決定性 | 単一定数 + sort(兄弟 `:61` / `:213` / `:224` / `:232` / `:239`) | BR-CG-7〜12(定数 assert + 一時ツリーの integration) | `dist/` や `tests/` 配下の同形(スコープ外 — BR-CG-8 / 9)。走査範囲の変更そのもの(L5 + SC-1〜SC-4) |
| L2 `runCheck` | R-B fail-closed(台帳ロードが census 解決より必ず先)/ verdict → exit code の全射写像(終端 6 状態) | 順序契約(兄弟 `:332`〜`:334` → `:336`)+ `fail()`(`:295-296`) | ALLOWLIST_UNREADABLE 分岐の lcov DA 到達確認(BR-CG-19)+ 個数照合(business-logic-model.md §5) | 台帳ファイルの改竄検知(ハッシュ・署名を持たない)。CI ステップ自体の存在 |
| L2 `main` | census 注入 seam が argv から到達不能であること(P-CG-8)/ 未知引数 → exit 2 | 引数解析が census を受け付けない(兄弟 `:321-322` のコメントが同型の理由を明記) | BR-CG-26 / BR-CG-34 | — |
| L2 `runUpdate` | `--update` → `--check` の自己整合(書いた台帳に対する直後の check は必ず OK) | 同一 census からの書出し | P-CG-7 | 書き出した値が「望ましい値」であること(増加方向の書き出しも可能 — L5 が拒否する) |
| L3 CI ステップ | ブロッキング性(`lint` は `ci-success` の `needs` に含まれる — `.github/workflows/ci.yml:615-623`) | ci.yml の1ステップ追加(`:119` 実文 `        run: bun tests/callsite-guard.ts --check` の直後) | BR-CG-40 / 41。`ci-success` の `needs` 集合は変更しない | ローカル実行の強制(pre-commit hook は導入しない)。CI 定義自体の改変 |
| L4 テスト | 落ちる実証の両側(赤くなること / 正当な既存データで赤くならないこと) | 面 A(常設 census 注入)+ 面 B(実コーパスへ 1 回)+ corpus sweep | BR-CG-35〜37 | 未知の患部形に対する再現率(L0 の述語射程に従属) |
| L5 人 | 台帳値の増加拒否 / 走査範囲拡大の由来明示 | PR レビュー観点(BR-CG-21) | — | **機械では保証しない**。この行が存在すること自体が本表の要点 |

## 3. 依存方向

```
L4 テスト ──> L0, L1, L2(すべて import して in-process 駆動)
L3 CI    ──> L2(CLI として起動)
L2       ──> L1, L0
L1       ──> L0(検出述語を適用する)、node:fs
L0       ──> typescript のみ(node:fs も時計も import しない)
```

逆向きの依存は無い。とくに **L0 は L1/L2 を知らない** — これが unit テストを実 FS なしで書ける条件であり、`cid:code-generation:fs-tests-integration-first` に沿ったテスト層の分割根拠でもある。

L0 が `typescript` に依存することは新規リスクではない: 既存 3 ファイル(`tests/lib/typescript-source.ts` / `tests/lib/guard-corpus-ast.ts` / `cli-mechanism.ts`)が同じ依存を既に負っている(decisions.md ADR-2 Consequences)。`typescript` は既存 devDependency(`package.json:42` 実文 `    "typescript": "^6.0.3"`)であり、本 unit は依存面を動かさない。

## 4. seam(注入点)の一覧と到達可能性

| seam | 型 | 用途 | argv から到達 | 根拠 |
| --- | --- | --- | --- | --- |
| `CheckOptions.census` | `Census` | 違反アームを in-process で駆動する(落ちる実証 面 A) | **不可**(BR-CG-34 / P-CG-8) | component-methods.md `U4`(:197 / :204)。兄弟 `:321-322` が同型の理由を明記 |
| `CheckOptions.allowlistPath` | `string` | 台帳の 4 条件テストで一時パスを与える | 実装時に確定(既定パスへフォールバック) | 兄弟 `:332` 実文 `  const loaded = loadAllowlistOrFail(options.allowlistPath ?? allowlistPath());` |
| `CheckOptions.reportPath` | `string` | `--check --report <path>`(BR-CG-29) | **可**(公開オプション) | 兄弟 `:338` |
| `buildResidualReport(census, now)` の `now` | `string` | 時刻を純関数層から追い出す | — | domain-entities.md §4「時刻 = CLI 層」。兄弟 `:337` |

seam を「テスト都合の分岐」ではなく**引数**として設計していることが要点である(construction ガードレール「テストダブル・fixture 専用の分岐やモードを本番コードに置かない」)。ガード本体に `if (process.env.TEST)` の類の分岐は置かない。

## 5. 再利用インベントリ(新規は本体 1 本のみ)

business-logic-model.md §11 / components.md Reuse inventory(:93-95)からの転記:

| 再利用する資産 | 実体 | 用途 |
| --- | --- | --- |
| ratchet 様式(shrink-only allowlist) | `tests/callsite-guard.ts` — `Census`(`:133`)/ `buildCensus`(`:142`)/ `diffAgainstAllowlist`(`:201`)/ `parseAllowlist`(`:248`)/ `CheckOptions`(`:318`)/ `runCheck`(`:330`) | 判定・台帳・CLI 契約の様式 |
| 走査スコープ定数 | `tests/callsite-guard.ts:61` 実文 `export const SCAN_ROOTS = ["packages/framework/core", "scripts"] as const;` | L1 の走査範囲 |
| AST 走査基盤 | `tests/lib/typescript-source.ts` — `unwrapExpression`(`:19`)/ `visitNodes`(`:54`)、`tests/lib/guard-corpus-ast.ts` — `callNames`(`:25`、`:26` で `ts.createSourceFile`) | L0 の述語基盤 |
| CI ステップ様式 | `.github/workflows/ci.yml:118-119`(既存 callsite-guard ステップ) | L3 |

**新規機構はガード本体 1 本のみ**。新規外部依存ゼロ、新規 CI ジョブゼロ、新規テストランナーゼロ(inception ガードレールの reuse inventory 要求への対応)。

なお本体行数の引用は **386 行**(`wc -l < tests/callsite-guard.ts` → `386`、HEAD)を使う。components.md :42 の「全 383 行」とは 3 行の差があり、規模見積の桁に影響しないため見積値は据え置く(business-logic-model.md §11 の指示)。

## 6. 変更面インベントリ(設計確定後に導出 — `cid:nfr-design:c7`)

以下は本書 §1〜§5 の設計が確定した後に導出した一覧であり、設計途中の暫定断定ではない。

### 6.1 新規

| ファイル | 層 | 推定規模 | 根拠 |
| --- | --- | --- | --- |
| `tests/unchecked-cast-guard.ts` | L0 + L1 + L2(1 ファイル内で層を分ける — 兄弟様式と同型) | 220〜280 行 | components.md U4 所在(:39)/ 規模(:42) |
| `tests/.unchecked-cast-allowlist.json` | 台帳 | 25〜40 行 | 同上。初期値は BR-CG-22 に従い `--update` 実出力から確定(期待 33 サイト / 18 ファイル) |
| `tests/unit/t<NNN>-unchecked-cast-guard.test.ts` | L4(L0 の unit) | 120〜160 行の分割の一方 | components.md U4(:42)の 2 分割様式(`tests/unit/t367-callsite-guard.test.ts` + `tests/integration/t367-callsite-guard-cli.test.ts`)に倣う |
| `tests/integration/t<NNN>-unchecked-cast-guard-cli.integration.test.ts` | L4(L1・L2 の in-process 駆動) | 同上 | 同上。in-process 駆動は BR-CG-33 |

`<NNN>` を本書で確定しない。BR-CG-38 のとおり着手時に予約し、再接地時は固定 base SHA の `tests/` 実測で再確認する(`cid:code-generation:c1-tnnn-collision-on-regrounding`)。未確定の値を確定として書かない。

### 6.2 変更

| ファイル | 変更内容 | 根拠 |
| --- | --- | --- |
| `.github/workflows/ci.yml` | `lint` ジョブ(`:93`)へ 1 ステップ追加。既存 callsite-guard ステップ(`:119`)の直後 | BR-CG-40 |
| `tests/fixtures/formal-verif-ci-baseline.sha256` | 再 baseline(HEAD 実文の 1 行 `80b0b5e9a9803e7dfe834b65bb6e9738c39e62700f2f13a3dfed1ad5824995cf  .github/workflows/ci.yml`) | BR-CG-42 / business-logic-model.md §9 |
| `tests/integration/t-formal-verif-ci-workflow.integration.test.ts` | 「Recorded re-baselines」注記へ本 intent 分を追記(同ファイル `:14-17` が仕組みを明記) | 同上 |

### 6.3 変更しない(明示)

| 対象 | 根拠 |
| --- | --- |
| `packages/framework/core/` 配下 | BR-CG-45(落ちる実証 面 B の一時注入とその revert を除く。revert 後の差分はゼロ) |
| `tests/callsite-guard.ts` 本体 | BR-CG-46(様式の引用元であり、走査語彙の異なる別ガード) |
| `dist/` および self-install ハーネスツリー | BR-CG-49。本 unit の成果物は `tests/` 配下のみで dist へ投影されないため、`dist:check` / `promote:self:check` の負担を増やさない |
| `ci-success` の `needs` 集合 | BR-CG-41(既存ブロッキング集合を変えない — requirements.md NFR-5 :59) |
| 母集団 33 件のキャスト自体 | BR-CG-47(可視化と単調減少の保証までが本 unit の射程) |

## 7. 実装順序(TDD の vertical slice)

business-logic-model.md §10 が確定した順序をコンポーネント面から再掲する。最初の Red は **P-CG-1 の違反側**(L0 `detectUncheckedCasts` / `diffAgainstAllowlist` が存在せず import が解決できない状態)であり、以降 P-CG-2 〜 P-CG-8 を 1 件ずつ Red→Green で積む(`cid:code-generation:tdd-default-with-narrow-exceptions` の一括先行禁止)。

層の観点では **L0 → L1 → L2 → L3** の順に降りる。L3(CI 配線)を先に入れると、ガードが未完成のまま lint ジョブが赤になり、他の PR を塞ぐ。L3 は L0〜L2 が緑になり corpus sweep(BR-CG-37)が通ってから入れる。

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段3(バリデータ非経由の読み戻し経路新設の CI 機械ブロック)に対応する。§2 の層別表は、この価値のどの部分が L0〜L3 の機械で担われ、どの部分が L5(人のレビュー)に残るかの境界を示す。
