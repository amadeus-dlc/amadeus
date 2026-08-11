上流入力(consumes 全数): requirements.md / unit-of-work.md(SKIP 由来で不在 — 設計どおり)

# Code Generation Plan — fix-1622-allowlist-semantic-audit

対象: Issue #1622。`tests/.coverage-patch-allowlist.json`(623 エントリ)の `reason` と
セレクタが指す実コードの意味的不一致(無音転位)の全数照合・是正と、再発防止ガードの新設。

測定 ref: worktree HEAD `854692fd7a11b124236b0427fe3d59e2fe6bf785`。
上流成果物: `inception/requirements-analysis/requirements.md`(FR-1〜FR-7 / NFR-1〜NFR-4)。
`unit-of-work.md` は `self-fix` が units-generation を SKIP するため不在(`expected: true`)であり、
本計画が unit の作業定義を兼ねる。

## 受け入れ基準の逐語転記(縮小しない)

下流実装が参照する契約は requirements.md の以下である。**本計画は述語を弱めない**
(`cid:code-generation:c3-260803-state-integrity`)。

- **FR-1**: 623 件すべてに `一致` / `転位` / `判定不能` の判定が付き、合計が 623 に一致する
- **FR-2**: (1) `bun tests/coverage-patch-gate.ts --check` が exit 0 (2) 是正前後の免除対象行集合を
  機械 diff し、増加行・減少行の全件がエントリへ帰属する(増加行 = 張り直しを採ったエントリの新解決先、
  減少行 = 張り直しの旧解決先または削除エントリの解決先)。**どのエントリにも帰属しない増加行が 0 件**
  (3) 張り直しは張り直し先が免除に値すると判定した根拠を、削除は削除根拠を、エントリ単位で記録
- **FR-3**: (1) 対象母集団の件数が FR-1 の `判定不能` 件数と一致 (2) 書き換え後に FR-1 の分類を
  再実行すると `判定不能` が 0 件 (3) `一致` / `転位` 分類済みエントリの `reason` を書き換えていない
- **FR-4**: (1) 既知転位を注入すると赤 (2) 是正後の台帳では緑。注入は「注入 → 赤の実測 → revert push」を
  不可分の 1 セット
- **FR-5**: `require_result` 相当の実評価が run ログに現れ、意図的に赤にした PR がマージ不能になることを実測
- **FR-6**: 規約違反・構文クラス不定の 2 クラスそれぞれに赤の実測があり、規約準拠の既存データでは緑
- **FR-7**: 記録された述語を再実行して同一の件数が得られる
- **NFR-1**: 同一入力で 2 回実行が byte-identical。ガード実装がネットワーク・LLM クライアントを
  import しないことを静的 assert
- **NFR-2**: 判定不能・解決失敗・述語の異常終了はすべて赤。空出力を「一致」と解釈しない
- **NFR-4**: 全フィールドを消費するコードが存在することを fixture テストで固定

## 設計 — OQ-1 の解(機械述語と人手 adjudication の境界)

`reason` が主張する内容を**構文クラス**として機械判定し、判定できないものだけを人手へ回す。

### 構文クラスの閉じた語彙(OQ-2 の解)

RE の `reason` 語彙分布(type-only 76 / spawn 260 / catch 32 / dispatch・usage 10)から、
TypeScript AST で決定的に判定できる 5 クラスへ閉じる。

| クラス | 主張 | AST 述語 |
|---|---|---|
| `type-only` | 対象行が型注釈・型引数のみで実行時に消える | 対象行の全ノードが型ノード(`TypeNode` / 型のみの `PropertySignature` 等) |
| `catch-arm` | 対象行が防御的 catch 節 | 対象行が `CatchClause` の内側 |
| `dispatch-case` | 対象行が switch の case ラベル / usage メッセージ | 対象行が `CaseClause` または `DefaultClause` の内側 |
| `spawn-only` | 対象行が CLI エントリ配線で in-process 計測が届かない | 対象行が `import.meta.main` 分岐の内側、または `main` 関数の本体 |
| `unmeasurable-other` | 上記以外の計測不能理由(明示の根拠が要る) | 述語なし。`reason` に明示のクラス宣言が要る |

### 三値判定のアルゴリズム(FR-1)

各エントリについて:

1. `resolveSemanticSelector` で解決(失敗は **NFR-2 により赤**、`判定不能` へ落とさない)
2. `reason` から**主張クラス**を抽出。抽出規則は決定的な文字列述語とし、
   **選言(`A, B, or C`)を検出したら `判定不能`**(クラスを一意に決められないため)
3. `reason` が関数名を名指す場合、それが `selector.function` と一致するか、
   または解決先が当該関数の内側にあるかを照合。**不一致なら `転位`**
4. 主張クラスの AST 述語を解決先の行へ適用。**偽なら `転位`**、真なら `一致`
5. 主張クラスを抽出できない(クラス宣言が無い / 選言)場合は `判定不能`

**人手 adjudication へ回るのは `転位` と判定されたエントリのみ**(是正方針の選択が要るため)。
`判定不能` は FR-3 の書き換え対象であり、書き換え後に再分類する。

## 実行ステップ

TDD を既定とする(`team.md` Testing Posture)。各ステップは Red → 最小実装 → Green の
vertical slice を 1 件ずつ反復する。

### Step 1: 構文クラス判定器(AST 述語)

- 新規モジュール `tests/allowlist-semantic-audit.ts` に、5 クラスの AST 述語を純関数として実装
- 先に失敗テストを 1 件書いて Red を実測してから実装する
- `tests/unit/tNNN-allowlist-semantic-audit.test.ts` に純関数のユニットテスト(実 FS に触れない)
- `cid:code-generation:fs-tests-integration-first` により、実 FS を使う検証は integration 層へ置く

### Step 2: `reason` の主張クラス抽出器

- 選言の検出(`, or ` / ` or ` を含む主張)を含む決定的な抽出規則
- **vacuity guard テスト**: 規約の定型句のみの入力で抽出が空文化しないこと
  (`cid:code-generation:vocabulary-collision-vacuity-guard`)

### Step 3: 三値分類器と全数実行(FR-1)

- Step 1 + Step 2 を合成し、623 件へ適用
- **母集団の恒等式** `一致 + 転位 + 判定不能 = 623` を assert するテスト
  (`cid:functional-design:c1-identity-population-stratify`)
- 分類結果と使用述語を `construction/fix-1622-allowlist-semantic-audit/code-generation/` 配下へ記録(FR-7)

### Step 4: 転位の是正(FR-2)

- 各 `転位` について、`reason` が説明する真の対象を特定し、免除に値するかを判定
- 値する → セレクタを張り直す / 値しない → エントリ削除
- **免除対象行集合の前後 diff とエントリ帰属**を機械検証するテストを置く
- 判定根拠をエントリ単位で記録

### Step 5: `reason` 記述規約と `判定不能` の書き換え(FR-3)

- 規約を `tests/README.md` へ明文化(単一構文クラスの主張、選言の禁止、閉じた語彙 5 種)
- `判定不能` 全件を規約準拠へ書き換え
- 書き換え後に Step 3 を再実行し `判定不能` 0 件を確認
- `一致` / `転位` 分類済みエントリの `reason` 差分が空であることを確認

### Step 6: ガードの新設(FR-4 / FR-6 / NFR-1 / NFR-2 / NFR-4)

- Step 3 の分類器をガードとして `tests/coverage-patch-gate.ts` の check 経路へ組み込む
  (**第 2 の解釈器を作らない** — requirements.md Constraints)
- 落ちる実証: 既知転位の注入で赤、規約違反の注入で赤、構文クラス不定の注入で赤
- 正当な既存データで緑(corpus sweep、`cid:code-generation:corpus-sweep-for-new-guards`)
- NFR-1 の 2 回実行 byte-identical テストと import 静的 assert
- NFR-4 の全フィールド消費 fixture テスト

### Step 7: CI 配線(FR-5)

- `.github/workflows/ci.yml` へ配線。**集約ジョブ `ci-success` の `needs` に載せる**
  (`cid:code-generation:c1-2814-aggregate-needs-is-blocking`)
- `require_result` の無条件評価を入れ、run ログでの実評価を確認
- `t222-ci-snapshot-branch` 系の pin は**位置まで固定**する
  (`cid:code-generation:c6-2814-pin-position-not-just-presence`)

### Step 8: 分離 Issue の起票

- `expiry` 面の意味整合(RE の UNMEASURED-1)を別 Issue として起票し、
  **Issue 番号は本 record 側へ残す**(承認済み requirements.md は書き戻さない)

### Step 9: 検証と配布面の同期

- `bun run typecheck` / `bun run lint` / `bun run build`(追跡ファイル不変の確認)
- `bash tests/run-tests.sh --ci` を**フルスイート 1 回**(`cid:code-generation:c3-conductor-runs-full-suite`)
- coverage registry の再生成と `EXPECTED_NONE_TO_CLI` の追記(`cid:code-generation:integration-registry-regen`)
- 新規テストが追加されるため、honesty ratchet / 境界ガード / registry drift の横断ゲートを通す

### Step 10: PR 発行と収束(ゲート前提)

`pr-convergence` プラグインが `self-fix` に bind されており、`pr-convergence-report.md` は
**plugin CLI のみが書く機械生成物**である。したがってステージ本体の実装完了だけでは produces が揃わない
(`cid:code-generation:c1-tsr-external-cli-produces`)。順序は:

1. Bolt ブランチで PR を発行
2. `j5ik2o-gh-pr-converge-loop` で収束(競合解消 → レビュー対応 → 必須 check green)
3. plugin CLI が `pr-convergence-report.md` を生成
4. §12a レビュー → approve

**マージは `irreversible` として autonomy full のグラント範囲外**であり、
ユーザーの明示承認を得てから leader が実行する(`cid:requirements-analysis:no-ai-merge`)。

## 実装の隔離

本セッションは worktree 隔離ガード下にあるため、実装は Agent の worktree isolation で起動した
builder が行い、conductor が merge-base 起点の取込みと fidelity diff で回収する
(`cid:code-generation:c1-pcp-isolated-session-swarm-incompat`)。
§12a レビューは conductor ツリーを読むため、**取込みは approve 前ではなく review 前**に行う
(`cid:code-generation:c1-mirror-and-rebuild-before-review`)。

## 契約改訂 — 2026-08-12 ユーザー裁定(申告付き)

Step 1〜3 の全数分類と Step 4/5 の実装前調査で、**requirements.md の FR-3 と FR-4 が前提していた
「全 623 件へクラス宣言を強制する規約」が成立しない**ことが実測で判明した。ユーザー裁定により
契約を改訂する。無申告のスコープ縮小ではなく、申告付きの仕様変更として記録する
(`cid:requirements-analysis:implementation-deviation-election` / エスカレーション正準リスト(4))。

### 実測された不成立の根拠

1. **AC 同士の両立不能**: 前置クラス宣言のみを読む抽出器は、現行 `一致` 39 件(前置宣言の保有は
   実測 0 件)を `判定不能` へ落とす。39 件へ前置を付けると FR-3 AC(3)「`一致` のエントリの
   `reason` を書き換えない」に違反し、付けないと AC(2)「`判定不能` 0 件」を満たせない。
2. **5 クラス中 2 つが宣言だけで通る**: `spawn-only` は到達性の主張で AST 検証が不能(宣言の実在まで)、
   `unmeasurable-other` はもともと述語なし。書き換え後にこの 2 クラスが多数を占めると
   **ガードが実質何も検査しない**状態になり、`org.md` Forbidden の検証劇場に接近する。
3. **人手判断が 336 件**(停止条件 150 の 2 倍超)。`actualClass = unmeasurable-other` は
   「AST で確定できない」を意味するだけで、prose には spawn 到達性の主張が混在するため個別読解が要る。

### 改訂後の契約

- **必須検査**: `reason` が関数名を名指す場合、`selector.function` と一致するか、解決先が当該関数の
  内側にあること。**RE が verbatim 実読で確定させた転位 18 件はすべてこの検査で捕捉されており**、
  builder の機械射影が示す残 `転位` 39 件のうち 23 件もこの検査に載る
- **任意検査**: クラス宣言は付けてよく、付いていて機械検証可能なクラス
  (`type-only` / `catch-arm` / `dispatch-case`)である場合に限り AST 述語で検証する
- **全件へのクラス宣言強制はしない** — 2/5 が検証不能である以上、強制しても担保は増えない
- FR-3 の「`判定不能` 0 件」要求は撤回する。`判定不能` は「クラス宣言が無い」を意味するだけで
  欠陥ではない
- `spawn-only` の到達性そのものの機械検証は本 intent の射程外とし、`tests/README.md` に
  明記する(将来の Issue 候補)

### 影響範囲

FR-3(規約と書き換え)/ FR-4(ガードの検査面)/ FR-6(検出テストのクラス)が改訂対象。
FR-1(全数分類)/ FR-2(転位の是正)/ FR-5(CI 配線)/ FR-7(記録)は不変。
requirements.md 本体は承認済みで凍結しているため書き戻さず、本改訂を construction 側の記録とする。

## 契約再改訂 — 2026-08-12 ユーザー裁定その2(申告付き)

第1改訂で定めた「必須検査 = `reason` が名指す関数名と `selector.function` の照合」も**実測で不成立**と
判明した。ユーザー裁定により**機械検査できる面だけを blocking とする**形へ再改訂する。

### 実測された不成立の根拠

必須検査の前提は「`reason` が関数名を**名指す**」だが、機械的に得られるのは
「`reason` 本文に**出現する**関数名」であり、両者は別物だった。builder が 36 件の firing を
逐語 triage した結果、**真の転位 13 件 / 偽陽性 23 件(63.9%)**。偽陽性の構造は3つとも機械的に説明できる。

- `selector.function === "<module>"` が 12 件 — 散文に出現しえない名前のため、`reason` が
  何か camelCase 関数を挙げれば必ず発火する
- `selector.function` が非 camelCase(`main`)が 6 件 — 識別子正規表現が `main` を構造的に拾えず、
  被覆先だけが候補に入る。**6/6 全件が偽陽性**
- 命名可能バケット 18 件 — 真の転位は 8 件のみ。残り 10 件は「別で被覆済み」「上流で弾く」の言及

代表例 `#603`: 主題は `handleExecute` の catch arm(セレクタは正しい)で、`emitAudit` は
「この arm に到達するには `emitAudit` 自身が throw する必要がある」という到達条件の言及にすぎない。

literal 実装のままガードを本線へ入れると、**正しい waiver 23 件が赤として現れ、削除か張り直しを
強いられる**。正しい免除を壊す是正は台帳を悪化させるため、実装してよい状態ではない。

### 3 回の実測から得られた結論(この intent の中核知見)

**`reason` は人間向けの散文であり、対象・根拠・被覆状況・到達条件が混在する。そこから「主題」だけを
機械抽出することは本 intent のスコープに収まらない。** 構文クラス述語(第0案)・全件規約化(第1案)・
関数名照合(第2案)はいずれも同じ壁に当たった。#1622 が求める「全数の意味的照合」は機械述語だけでは
達成できない。

### 再改訂後の契約

- **blocking にするのは「宣言クラスと AST 実クラスの食い違い」のみ**(実測 16 件が発火)。
  これは `reason` の主題解釈を要さず、宣言という明示的な入力だけで判定できる
- **関数名照合は採用しない**(偽陽性 63.9%)
- **RE が verbatim 実読で確定させた転位 18 件は人手で是正する**。一覧は
  `codekb/amadeus/re-scans/260811-allowlist-semantic-audit.md` の T1〜T18 表に永続化済み
  (`grep -c "^| T"` = 20 行 = ヘッダ2 + 18 件)
- **達成されないことを明記する**: 全数の意味的照合の自動化は本 intent では達成しない。
  `reason` の主題抽出を要する検査面は射程外とし、`tests/README.md` と本記録に残す

### 何が達成され、何が達成されないか(正直な整理)

**達成される**: (a) 623 件の機械分類基盤(`tests/allowlist-semantic-audit.ts`)と全数の判定記録
(b) 宣言クラスと実クラスの食い違いを止める blocking ガード (c) RE 確定 18 件の是正
(d) 意味整合を検査するテストが 0 件だった状態の解消。

**達成されない**: (e) 全 623 件の意味的照合の自動化 (f) `spawn-only` の到達性の機械検証
(g) `reason` の主題抽出を要する転位の自動検出。(e)〜(g) は別 Issue へ分離する。

## 契約最終確定 — 2026-08-12 ユーザー裁定その3(park 時点の正)

第2改訂の「宣言クラス × AST 実クラスの食い違い」も**実測で不成立**と判明した。
ユーザー裁定により、**`reason` の parse を完全にやめる**設計へ確定する。

### 第2改訂が不成立だった実測

- 発火件数は契約が前提した 16 ではなく **20**。16 は禁止したはずの関数名照合パスが手前で短絡している
  状態でのみ再現する(`measure.ts`: via function-name path=5 / via class-mismatch path=16)
- **RE 確定 18 件と発火集合 20 件の重なりは 3 件のみ**(T13/T14/T15)。18 件のうち 15 件は検査に映らず、
  20 件のうち 17 件は是正の授権範囲外。「T1〜T18 を是正すれば全 623 件が緑」は構造的に成立しない
- **20 件のうち少なくとも 8 件が偽陽性**。内訳: (a) zero-token 欠陥 5 件 — `tokensInRange` が
  `ts.forEachChild` で走査するため句読点・キーワードトークンを訪れず、`} catch {` だけの範囲は
  トークン 0 個になり `unmeasurable-other` へ無条件に落ちる(**台帳 623 件中 39 件**がこの範囲)
  (b) reason が「行の集合」に対する宣言 5 件 — `amadeus-process-runner.ts` の 5 件は 1 つの reason を
  共有し、語彙ヒットは兄弟行についての記述

すなわち「宣言という明示的な入力だから偽陽性が生じない」という前提が偽だった。
**宣言を prose から parse している限り、prose 解釈の問題は消えていなかった。**

### 4 回の試行と実測(再開者向けの正本)

| 回 | 設計 | 実測による否定 |
|---|---|---|
| 1 | 構文クラス述語で全数分類 | 転位 167 のうち 125 が述語定義の不足由来 |
| 2 | 全 623 件へクラス宣言を強制 | AC 同士が両立不能 / 5 クラス中 2 つが検証不能 / 人手判断 336 件 |
| 3 | 関数名照合を必須検査に | 偽陽性 63.9%(36 件中 23 件) |
| 4 | 宣言クラス × AST の食い違い | 発火 20(16 は誤) / T1〜T18 との重なり 3 件 / 8 件以上が偽陽性 |

**共通の誤りは「`reason` という散文を parse すれば主題が取れる」と 4 回とも仮定したこと。**
`reason` は対象・根拠・被覆状況・到達条件が混在する人間向けの説明文であり、主題の機械抽出は
本 intent の射程外である。これがこの intent の最大の知見。

### 最終確定した設計(再開時はここから始める)

**台帳に optional な `selector.class` を*データフィールド*として追加し、それだけを AST と照合する。**

- `reason`(prose)の parse を**完全にやめる**。宣言は推論ではなく**入力**になるため、
  偽陽性が構成上生じない
- 検証対象クラスは AST で判定可能な `type-only` / `catch-arm` / `dispatch-case` の 3 つ
  (`spawn-only` は到達性の主張、`unmeasurable-other` は述語なしのため対象外)
- **現在 `selector.class` を持つエントリは 0 件**なのでガードは緑で始まる。
  是正したエントリから opt-in する**ラチェット**になる
- zero-token 欠陥(39 件影響)は `selector.class` 方式でも AST 側に残るため、
  実装時に `tokensInRange` の走査を修正すること(`ts.forEachChild` ではトークンを訪れない)
- RE 確定 18 件(`codekb/amadeus/re-scans/260811-allowlist-semantic-audit.md` の T1〜T18 表)は
  人手で是正し、是正したものへ `selector.class` を付けて opt-in させる

### park 時点で着地済みのもの

- `tests/allowlist-semantic-audit.ts`(分類器)+ t534(21 テスト)/ t535(4 テスト) — コミット `4bb9251ff`
- 分類器の NUL バイト混入の修正 — コミット `2bbf6880f`。
  **`4bb9251ff` は control-byte gate を落とす状態だった**(生の NUL 2 個により git が binary 扱い)。
  成果物のコミット前にバイト走査を1手挟まなかった conductor の誤り
- 全 623 件の分類結果: `/private/tmp/claude-501/amadeus-1622-scratch/classification.json`(repo 外)
- 各回の実測記録: 同ディレクトリの `step45-report.md` / `guard-report.md` / `final-report.md`
  と再実行可能な述語スクリプト一式(**repo 外のため揮発しうる。再開時に不在なら再測定が要る**)

### 再開時に残っている作業

FR-2(RE 確定 18 件の是正)/ FR-4(`selector.class` ガードの新設と落ちる実証)/ FR-5(CI 集約 `needs` への
blocking 配線)/ FR-6(検出テスト)/ FR-7(記録)/ Step 8(`expiry` 面の分離 Issue 起票)/
Step 9(フルスイートと配布面同期)/ Step 10(PR 発行 → 収束ループ → `pr-convergence-report.md` 生成)。

**達成されないことの明記**(`tests/README.md` へ書く): 全 623 件の意味的照合の自動化 /
`spawn-only` の到達性の機械検証 / `reason` の主題抽出を要する転位の自動検出。いずれも別 Issue へ分離する。

## 工数の見通しと停止条件

Step 3 の全数分類で `転位` が RE の下限 18 件を大きく超えた場合(目安: 100 件超)、
Step 4 の是正工数が本 intent の想定を超える。その場合は**実装を止めて報告する** —
スコープを縮めるかどうかは利用者の裁定である(`cid:build-and-test:no-silent-scope-narrowing` /
requirements.md OQ-3)。builder は独断でスコープを縮小しない。
