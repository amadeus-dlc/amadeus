# re-scan: 260810-control-byte-gate（Issue #2814 / ミラー #2821）

**Date**: `2026-08-10`
**測定 ref (observed)**: `f1270d710193d102b6fe8a728873a1c3e27dc094`（= 本 worktree HEAD。`git branch -r --contains f1270d710` = `origin/main` にヒットするため **origin/main 系譜上**であることを実測確認。`origin/main` は 1 コミット先行し `40056d0ecf140daa5636ddd2916734047098108b`。`cid:reverse-engineering:measurement-ref-in-artifacts` / `c2-observed-mainline-commit`）
**Base**: `df1c874cfb397fafe877a72f00a82664a59689ae`（直前 intent `260810-plugin-harness-dir-token` の observed。`git merge-base --is-ancestor df1c874cf HEAD` = 真、`git rev-list --count df1c874cf..HEAD` = **10 commits**。`cid:reverse-engineering:rescan-base-ancestry`）
**Scope**: `self-feature`、Brownfield、単一 repo `amadeus`、build `bun`、Depth: **Standard**
**Focus**: [Issue #2814](https://github.com/amadeus-dlc/amadeus/issues/2814)（ミラー #2821）— tracked source への制御バイト（NUL 等）混入を CI で決定的にブロックするゲートが存在しない。既知の機序は `cid:requirements-analysis:control-byte-guard`（PM1-8 2026-07-10、#786 実測）— 制御バイトは git diff（8KB 以降不可視）にも grep（binary 化で偽陰性）にもレビューにも構造的に見えない
**Scan mode**: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— クロスレビュー verdict を Developer scan の一次入力とし、observed 断面の verbatim 実読で二重化
**副作用**: git 状態変更・GitHub 書込・`bun run build`・engine/state 操作は**すべてゼロ**。書き込みは codekb 配下のみ

---

## 行番号引用の currency（実測の記録であり、免除の主張ではない）

クロスレビュー target SHA = `c909b61300e0a5b770e39a96fe38280879bb8bbd`。

実行した述語（逐語）:

```
git diff --name-only c909b61300e0a5b770e39a96fe38280879bb8bbd f1270d710193d102b6fe8a728873a1c3e27dc094
```

exit 0、**36 files changed**。出力はすべて `amadeus/spaces/`・`metrics/`、および無関係な単一機能（`amadeus-harness.ts` / `amadeus-plugin.ts` / `scripts/plugin-projection.ts` / `tests/helpers/harness-dir-fixture.ts` および付随する 4 テスト / `tests/unit/t146-core-hygiene.test.ts`）に閉じる。

**被引用 13 パスとの交差 = 空**（`amadeus-migrate.ts` / `amadeus-lib.ts` / `amadeus-stage-stats.ts` / `amadeus-subagent-stats.ts` / `t-learnings-persist-seam.test.ts` / `t55-test-suite-drift.test.ts` / `detect-ci-changes.sh` / `ci.yml` / `no-silent-drop/engine.ts` / `unchecked-cast-guard.ts` / `.gitignore` / `assets/AI-DLC-Workflows-2.0-Specification.pdf` のいずれも diff に現れない）。

したがって本ファイルおよび codekb 各節の file:line は **observed 断面で有効**であり、行番号の再解決は構造的に no-op である。これは `review..observed` の実 diff と被引用パス集合の交わりが空であることの**測定**であって、免除条件の主張ではない（`cid:reverse-engineering:E-XBB-RE-S13-c2` — 測定区間は `review..observed` に固定し、`base..observed` の touch 判定を根拠にしていない）。

---

## 検索述語（再実行可能・結果と同所に記録）

`cid:requirements-analysis:enumeration-completeness-review` の E-ASD-RES13 追補に従い、述語をそのまま再実行できる形で結果と同所に置く。すべて worktree ルートで実行。

| ID | 述語 | 結果 |
|---|---|---|
| P0 | `git diff --name-only c909b6130 f1270d710`（被引用 13 パスで絞る） | 区間 **36 files**、患部ヒット **0** |
| P1 | `grep -n "buffer.includes(0)\|without NUL bytes" packages/framework/core/tools/amadeus-migrate.ts` | **6 hits**（`:477` 述語 + `:1461` / `:1994` / `:2038` / `:2385` / `:2388` メッセージ） |
| P2 | `grep -n "CONTROL_CHARS" packages/framework/core/tools/amadeus-lib.ts` | **2 hits**（`:4298` 定義 / `:4304` 適用） |
| P3 | `sed -n '246,262p' tests/integration/t-learnings-persist-seam.test.ts` | #786 の**単一ファイル** NUL guard（逐語確認） |
| P4 | `sed -n '664,678p' tests/unit/t55-test-suite-drift.test.ts` | NUL を**スキップ**する防御（検出ではない、逐語確認） |
| P5 | `grep -n "SCAN_ROOTS" tests/unchecked-cast-guard.ts tests/no-silent-drop/engine.ts` | engine.ts `:46-50` = core+harness+scripts / unchecked-cast `:74` = core+scripts |
| P6 | `grep -n "amadeus-sensor\|sensors/" .github/workflows/ci.yml` | **0 hit（exit 1）** |
| P7 | `git ls-files -z \| tr -cd '\0' \| wc -c` | tracked **16124** files |
| P8 | Python 直走査（`git ls-files -z` 起点、binary モードで `b'\x00'`） | NUL 含有 **1 件**のみ（read errors 0） |
| P9 | 同上を Issue 宣言スコープ 5 ルートへ | tracked **2576** files、NUL/C0（TAB/LF/CR 除く）**0 hit** |
| P10 | 同上を `.github/` / `.claude/sensors/` へ | `.github/` = 15 files / **0 hit**、`.claude/sensors/` = tracked **0** |
| P11 | `git ls-files dist \| wc -l` | **0**（`.gitignore:19` `/dist/**`） |

⚠ 手法メモ（後続検証者向け、`cid:requirements-analysis:review-method-memo`）: **バイト検査に grep 系ラッパを使わない**。NUL を含むファイルは grep が binary 扱いして無音で脱落させ、偽陰性を作る（これが `cid:requirements-analysis:control-byte-guard` の欠陥機序そのもの）。走査は `git ls-files -z` を起点に Python / perl で **binary モード直走査**し、read error 数も併せて報告する。

---

## 中核知見

### N-1 — 全域制御バイトゲートは存在しない（PROVEN）

tracked corpus 全域を対象に制御バイトを検出する仕組みは **0 件**。現存する検出面は次の 4 つに限られ、いずれも Issue #2814 が求める面をカバーしない。

| 面 | 所在 | 実体 | 射程外である理由 |
|---|---|---|---|
| A. `isUtf8` 述語 | `packages/framework/core/tools/amadeus-migrate.ts:477`（`function isUtf8` は `:476` から）逐語 `  if (buffer.includes(0)) return false;` | NUL を含むと非 UTF-8 と判定 | **入力面限定**。呼び出し 5 箇所（`:1461` installer manifest / `:1994` cursor / `:2038` state / `:2385`・`:2388` project `.gitignore`）はいずれも migrate が読む個別ファイルの検証であり、リポジトリコーパスを走査しない |
| B. `CONTROL_CHARS` strip | `packages/framework/core/tools/amadeus-lib.ts:4298` 逐語 `const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F]/g;`、適用は `:4304`（`subagentPurposeLine` 内） | 派生表示文字列から制御文字を**除去** | **表示層**。ファイル内容をゲートせず、除去であって検出・拒否ではない。文字クラスは TAB(0x09)/LF(0x0A) を除外するが CR(0x0D) は 0x0B-0x1F 区間に入るため strip 対象 |
| C. #786 リグレッション guard | `tests/integration/t-learnings-persist-seam.test.ts:246-262` | `amadeus-learnings.ts` のバイトに `includes(0)` が偽であることを assert | **単一ファイル・ハードコードパス**。#786 の再発だけを見る点検であり、corpus 走査ではない |
| D. t55 の NUL-skip | `tests/unit/t55-test-suite-drift.test.ts:664-678`（`grepFile`）逐語 `if (body.indexOf(String.fromCharCode(0)) !== -1) return;` | NUL 含有ファイルを列挙から**除外** | **同じ fail-open 側**。`grep -r` の binary スキップを意図的に模倣しており、制御バイトの存在を検出するのではなく、存在するファイルを走査対象から外す |

**構造的含意**: A と B は「制御バイトは害である」という認識が既にコードベースに存在することの証拠だが、いずれも点の防御であり、C は単一ファイル、D はむしろ欠陥機序の側にある。#786 が実際に混入した経路（tracked ソースへの直接混入）に対する面の防御は存在しない。

### N-2 — 先例 SCAN_ROOTS と Issue 宣言スコープの関係（PROVEN）

同種の shrink-only / corpus 走査ガードは 2 本あり、走査ルートが**互いに異なる**。

- `tests/no-silent-drop/engine.ts:46-50`:
  ```
  export const SCAN_ROOTS = [
    "packages/framework/core",
    "packages/framework/harness",
    "scripts",
  ] as const;
  ```
- `tests/unchecked-cast-guard.ts:74`: `export const SCAN_ROOTS = ["packages/framework/core", "scripts"] as const;`
- 同ファイル `:51-53`（コメント逐語）: `// SCAN SCOPE. The product source of truth: packages/framework/core/ plus` / `// scripts/. Generated trees (dist/, the self-install harness copies) are` / `// projections of core and are excluded; tests/ is outside the scanned roots.`

**Fact**: no-silent-drop は `packages/framework/harness` を含み unchecked-cast は含まない。両者とも `tests/` を明示除外し、どちらも `docs/` を走査しない。

Issue #2814 の宣言スコープ（`packages/framework/core` / `packages/framework/harness` / `scripts` / `tests` / `docs`）は**両先例の上位集合**であり、`tests/` と `docs/` の追加は先例からの意図的拡張にあたる。制御バイトの欠陥機序（レビュー不可視性）はソース種別に依存しないため拡張自体に整合性はあるが、**先例が明示的に除外している面を含める判断**である以上、根拠を設計段で明文化する対象になる（選定は本段の所掌外）。

### N-3 — CI 配線の先例パターンと sensor 形態の限界（PROVEN）

`.github/workflows/ci.yml` の `lint` job（`:96-98`）:

```
  lint:
    name: Lint and complexity
    needs: changes
    if: ${{ needs.changes.outputs.full == 'true' }}
```

この job 内で各ゲートは**独立した単一ステップ**として並んでいる（実測順）: `Lint (biome)` → `No silent drop (trusted base ratchet)`（`:157`、`--base-revision` 解決つき） → `Call-site guard`（`:164` `bun tests/callsite-guard.ts --check`） → `Unchecked-cast guard`（`:172` `bun tests/unchecked-cast-guard.ts --check`） → `Build generated distributions` → `Deletion gate` → `Install lizard` → `Complexity gate`（`:199`）。

ローカル起動面: `package.json:24` に `"no-silent-drop": "bun tests/no-silent-drop-gate.ts check"` のエイリアスがあるのは 3 ゲート中この 1 本のみ。残りは CI ステップから直叩き。`tests/run-tests.sh` は `tests/run-tests.ts` への薄いラッパで、`run-tests.ts` を `gate|guard|complexity` で grep しても 3 ゲートへの参照は **0** — これらは**テスト tier のオーケストレーション外の standalone スクリプト**である。

**sensor 形態の限界（PROVEN）**: `grep -n "amadeus-sensor\|sensors/" .github/workflows/ci.yml` は **0 hit（exit 1）**。sensors（`.claude/sensors/*.md`、13 manifest、frontmatter は `id` / `kind` / `command` / `default_severity` / `description` / `category` / `matches` / `input_schema` / `output_schema` / `timeout_seconds`）は CI に一切配線されておらず、hook 起動のランタイム機構である。したがって **sensor manifest 単独の実装は CI をブロックしない** — Issue が求める「決定的に CI をブロックする」性質を満たすには standalone script + CI ステップの経路が必要になる。

### N-4 — `detect-ci-changes.sh` の docs 分岐（PROVEN、設計上の要注意点）

`scripts/detect-ci-changes.sh` が `full=true` を立てる case ブロックのうち docs 関連は次の 1 行だけ（逐語）:

```
docs/reference/15-stage-definition.md|docs/reference/15-stage-definition.ja.md|\
```

`docs/*` のワイルドカードはどの case ブロックにも存在しない。

**Fact**: docs のみを変更した PR は `full=false` となり `lint` job 自体が skip される（`full` は ci.yml `:97-98` の `lint` と `:66-67` の `typecheck` を gate する）。したがってスコープに `docs/` を含む制御バイトゲートを `lint` job のステップとして置いた場合、**docs-only PR ではそのゲートが走らない**。これは `cid:build-and-test:ci-paths-ignore-doc-guard-blindspot` が記録する既知の構造的死角と同型であり、フィルタへの分岐追加か別経路での無条件実行が必要になる（選定は設計段）。

### N-5 — コーパス実測: 現状はクリーン（PROVEN、測定 ref = observed `f1270d710`）

Python 直走査（`git ls-files -z` 起点、binary モード）による実測:

| 対象 | tracked files | 制御バイト hit |
|---|---|---|
| repo 全域 | **16124**（read errors 0） | **1** — `assets/AI-DLC-Workflows-2.0-Specification.pdf`（first NUL offset **248**、file size 787598 bytes） |
| Issue 宣言スコープ 5 ルート | **2576** | **0**（NUL および TAB/LF/CR を除く C0） |
| `.github/` | **15** | **0** |
| `.claude/sensors/` | **0**（tracked） | — |

**含意 1**: 現在の tracked corpus における制御バイトは**単一のバイナリ資産のみ**であり、Issue の想定（PDF のみ）と一致する。新設ゲートは既存コーパスに対して初日から green になる — すなわち `cid:code-generation:corpus-sweep-for-new-guards` が要求する両側実測のうち「正当な既存データで赤くならないこと」は、宣言スコープに限れば allowlist / carve-out ゼロで成立する。

**含意 2**: `.claude/sensors/` の tracked 0 は**ディスク上に存在しない**という意味ではない。`.gitignore:24-28` の `/.claude/**`（negation は `CLAUDE.md` / `hooks/` / `amadeus-dispatch.ts` / `settings.json` の 4 つのみ）により blanket 除外されているためで、`git ls-files` 起点の走査は構造的にここを見ない。ディスク上には 13 manifest が実在する。

### N-6 — dist/ 増幅は不成立（PROVEN）

`git ls-files dist | wc -l` = **0**、`.gitignore:19` = `/dist/**`。生成ツリーは tracked ではないため、「core の 1 ファイルが 7 ハーネス dist へ投影されて違反が増幅する」というクラスの懸念は本ゲートについては成立しない。これはクロスレビューの C9 確定と一致する。

---

## 検証面（failing-first テストの置き場、PROVEN な棚卸し）

- **先例ゲートの形**: `tests/no-silent-drop-gate.ts`（`--check` エントリ、`package.json:24` エイリアスあり）、`tests/unchecked-cast-guard.ts`（`--check`、エイリアスなし）、`tests/callsite-guard.ts`、`tests/complexity-gate.ts`
- **既存の点防御**: `tests/integration/t-learnings-persist-seam.test.ts:246-262`（#786 単一ファイル guard — 新ゲートが corpus 全域を覆えば包含関係になる）
- **fail-open 側の既存挙動**: `tests/unit/t55-test-suite-drift.test.ts:664-678`（NUL-skip。新ゲートの述語設計時に「なぜ skip ではなく検出なのか」を分ける根拠になる）
- **CI 配線面**: `.github/workflows/ci.yml` の `lint` job（`:96-98`〜`:199`）、`scripts/detect-ci-changes.sh`

---

## UNMEASURED（設計段へ持ち越す。推測で埋めないこと）

- 落ちる実証（制御バイトを実際に注入して CI が赤くなること）の実測 — 本段では**一切の注入を行っていない**
- untracked / gitignored 面（`.claude/**`、`dist/**`）を走査対象に含めるべきかの判断と、その場合の走査起点（`git ls-files` 以外の列挙手段）
- TAB/LF/CR 以外の許容バイト（例: FF、ESC を含む端末シーケンス）を許すかどうかの語彙決定
- `docs/` を宣言スコープに含めた場合の `detect-ci-changes.sh` 改修の blast radius（他ジョブの `full` 依存への影響）
- 既存 3 ゲートの実行時間に対する新ゲート（16124 または 2576 ファイルのバイト走査）の追加コスト
- `assets/**` 等のバイナリ資産を除外する述語形（拡張子ベース / `.gitattributes` の binary 属性 / マジックバイト判定）の選定

---

## 本 RE の適用範囲外（明示）

ゲートの実装形態（standalone script か sensor か両方か）、走査スコープの最終確定、allowlist 機構の有無、CI 配線位置の選定は本段の所掌ではない。証拠上ありうる方向は少なくとも (a) `tests/control-byte-guard.ts --check` + `lint` job ステップ（先例 100% 踏襲）、(b) 同 + `detect-ci-changes.sh` の docs 分岐追加、(c) sensor manifest との併設（ただし N-3 により sensor 単独では CI ブロック不成立）の 3 つだが、**選定は requirements-analysis / application-design が行う**。本記録は、その裁定を証拠から下せる状態にすることのみを目的とする。

---

## 検証宣言

- git 状態変更（checkout / stash / reset / commit / merge）: **ゼロ**
- GitHub 書込（Issue / PR / コメント / ラベル）: **ゼロ**
- `bun run build` および生成物の再生成: **ゼロ**
- engine / state 操作（`amadeus-orchestrate.ts` / `amadeus-state.ts` / `amadeus-log.ts` / `amadeus-bolt.ts`）: **ゼロ**
- 書き込み: `amadeus/spaces/default/codekb/amadeus/` 配下のみ
