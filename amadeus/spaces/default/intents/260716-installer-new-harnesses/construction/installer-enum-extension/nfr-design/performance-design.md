# Performance Design — U1 installer-enum-extension(Issue #1048)

上流入力(consumes 全数): `../nfr-requirements/performance-requirements.md`(PR-1/2)、`../nfr-requirements/security-requirements.md`、`../nfr-requirements/scalability-requirements.md`、`../nfr-requirements/reliability-requirements.md`、`../nfr-requirements/tech-stack-decisions.md`、`../functional-design/business-logic-model.md`(F-1/F-2)。

## 設計(モジュール別 — 一枚岩の断定を避ける、nfr-design:c4)

| モジュール | 性能機構 | 設計判断 |
|---|---|---|
| harness.ts(parse)| frozen 配列 membership(O(n), n=6)| 変更なし — Set 化等の「最適化」は追加ロジック禁止(AC-1e)に抵触するため行わない |
| engine-layout.ts | object literal 参照(O(1))| entry 追加のみ |
| テスト実行 | WALL_CLOCK_BANDS(test-size.ts:89)による層別上限 | 新規テストは fixture in-process(ネットワーク不要)で integration 層バンド内に収まる設計 — spawn 型の重い検証を追加しない |

## 明示的に設計しないもの

キャッシュ・遅延初期化・並列化は導入しない(PR-1: 新規性能面なし — 導入はむしろ複雑性リスク)。

## Review

**Verdict:** READY
**Reviewer:** amadeus-architecture-reviewer-agent
**Date:** 2026-07-17T00:50:00Z
**Iteration:** 1

**対象(nfr-design 5成果物、本節を代表ファイルとして集約評価):** `performance-design.md`(本ファイル)、`security-design.md`、`scalability-design.md`、`reliability-design.md`、`logical-components.md`。`nfr-design-questions.md`(0問・E-OC1 証跡)も併せて確認。

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | reliability-design.md:11 | AC-6e テスト設計が「`resolveProjectDirFromHook` / `hasWorkspaceMarker` の解決先を assert」と記すが、`hasWorkspaceMarker`(`packages/framework/core/tools/amadeus-lib.ts:268`)は module-private(`export` 修飾子なし)であり、テストから直接呼び出すには新規 export が必要になる。設計はこの必要性(または「`resolveProjectDirFromHook` の戻り値のみを behavioral に assert し、`hasWorkspaceMarker` は間接検証で足りる」という代替解釈)のどちらを取るか明記していない | code-generation 着手前に一文追記: 「`hasWorkspaceMarker` は `resolveProjectDirFromHook` の戻り値を通じて間接検証し、新規 export は追加しない」、または export 追加を明示的な設計変更として logical-components.md の C6a 行に反映する |

### 検証内容(file:line 実測)

1. **ステージ定義充足**(観点1): `produces` 5成果物すべて実在。各ファイル H2 見出し数を実測(`grep -c '^## '`) — performance/security/scalability/logical-components = 2、reliability = 3。いずれも required-sections の登録既定(≥2)を満たす。各ファイル冒頭「上流入力」行が nfr-requirements 5面(performance/security/scalability/reliability-requirements、tech-stack-decisions)+`business-logic-model.md` を明示参照(upstream-coverage 充足)。

2. **NFR-req → design 写像の断絶なし**(観点2、全項目突合):
   - PR-1(新規性能要求なし)→ performance-design.md「明示的に設計しないもの」+harness.ts/engine-layout.ts 行で対応。PR-2(WALL_CLOCK_BANDS 上限)→ 同ファイル「テスト実行」行。
   - SR-1(membership 保存)→ security-design.md「入力境界」行。SR-2(新規依存ゼロ・攻撃面不変)→「依存」「ネットワーク」行。SR-3(秘密ハードコード禁止)→「シークレット」行。SR-4(比例選定)→「追加検査の非選定」節。
   - SC-1(追加コスト一定化)→ scalability-design.md SD-1。SC-2(汎用機構の無改修スケール)→ SD-2。SC-3(実行規模 N/A)→ SD-3。
   - RR-1(未知ハーネス名 loud fail)→ reliability-design.md「未知ハーネス名」行。RR-2(map entry 追加漏れ検出)→「map entry 追加漏れ」行。RR-3(hook worktree 誤収束)→「hook の worktree 誤収束」行。RR-4(アトミック性非接触)→「インストール中断」行。
   - PR-1〜2、SR-1〜4、SC-1〜3、RR-1〜4 の全13要求が design のいずれかの節に対応することを確認 — 断絶なし。

3. **保証の層別記述**(観点3、nfr-design:c4): security-design.md は「入力境界/依存/ネットワーク/シークレット」の4層テーブル、reliability-design.md は「失敗様式別」の4行テーブルで記述され、一枚岩の全称命題(例外なき「常に安全」等の断定)は確認されなかった。performance-design.md も「モジュール別」テーブルで層別。一枚岩の断定なし。

4. **AC-6e テスト設計の実装可能性**(観点4): reliability-design.md:11 の設計 — 「opencode/cursor 名の worktree レイアウトを一時 dir に構築し `resolveProjectDirFromHook` / `hasWorkspaceMarker` の解決先を assert(in-process)」を実コード(`packages/framework/core/tools/amadeus-lib.ts:288-317` `resolveProjectDirFromHook`、:268-271 `hasWorkspaceMarker`)と照合。`resolveProjectDirFromHook` は `process.cwd()` から `findWorkspaceMarkerAncestor` 経由で `hasWorkspaceMarker` を呼ぶ非spawn純関数(:220-234 の CWD probe や :304-306 の script-path derivation も同様に in-process 到達可能)— fixture を一時 dir に構築し `process.chdir` または cwd 引数化(既存シグネチャは `importMetaUrl` のみを受け内部で `process.cwd()` を読むため、テストは `process.chdir` で切替える設計になる見込み)で in-process 駆動可能。spawn 経由でしか通らない行はなく、bun-coverage-spawn-blindspot の盲点を回避する設計は妥当。ただし `hasWorkspaceMarker` 自体が module-private である点は上記 Finding #1 のとおり要明記。

5. **要求にない機構の混入なし**(観点5): 「明示的に設計しないもの」(performance-design.md)「追加検査の非選定」(security-design.md)「リトライ・フォールバック: 導入しない」(reliability-design.md)のいずれも、実際の設計記述本文でキャッシュ・リトライ・フォールバック・互換シムが登場しないことと整合(grep 相当の目視突合で該当語が「導入しない」の宣言以外に出現しないことを確認)。「導入しない」宣言と実記述の不一致なし。

6. **logical-components.md と AD C1〜C7 の整合**(観点6): `application-design/components.md:9-15` の C1〜C7 定義(C1=harness.ts、C2=engine-layout.ts、C3=reporter.ts、C4=契約テスト2本、C5=install-flow fixture、C6=amadeus-lib.ts+amadeus-utility.ts、C7=README)と logical-components.md の構成を突合 — 完全一致(C6 を C6a/C6b に分割表記しているが、components.md C6 の「amadeus-lib.ts(:121)+amadeus-utility.ts(:860)」という2面構成をそのまま反映したもので矛盾ではない)。コードブロックは Mermaid 構文ではなく ASCII ツリーで最初から人間可読なテキスト表現であり、加えて「テキストフォールバック:」行で構成要素を平文列挙(冗長だが無害)。

7. **file:line 実在照合**(実行済みコマンド):
   - `packages/setup/src/domain/engine-layout.ts:15-20`(:8-13 の map 含む)を実ファイルと逐語照合 — throw 文言完全一致。
   - `packages/framework/core/tools/amadeus-lib.ts:121`(`KNOWN_HARNESS_DIRS`)、:268-271(`hasWorkspaceMarker`)、:288-317(`resolveProjectDirFromHook`)を実測確認 — 完全一致。
   - `tests/lib/test-size.ts:89` `WALL_CLOCK_BANDS = { smallMaxSeconds: 1, largeMinSeconds: 30 }` を実測確認 — 完全一致。
   - `requirements.md:14` AC-1e(`per-harness 分岐・ハードコードを追加しない`)を実測確認 — performance-design.md の「Set 化等の最適化禁止」の根拠として整合。
   - `application-design/components.md:9-15` C1〜C7 定義を実測確認 — logical-components.md との対応関係を裏取り。

### Validation Tool Results

このステージに `validation_tools` の宣言なし(ステージ定義 `.claude/amadeus-common/stages/construction/nfr-design.md` に該当フィールドなし)。file:line 実測による手動クロスチェックで代替(上記7項目)。required-sections / upstream-coverage は上記1で手動確認(linter / type-check はコードスニペットが本成果物に存在しないため適用対象なし — 全5ファイルに TypeScript/JS フェンスコードブロックなし)。

### Summary

NFR-req 13要求(PR-1/2、SR-1〜4、SC-1〜3、RR-1〜4)全てが design のいずれかの節に対応し断絶なし。保証は層別テーブルで記述され一枚岩の全称命題はない。logical-components.md は AD C1〜C7 と完全整合。要求にない機構(キャッシュ・リトライ・フォールバック・互換シム)の混入なし。唯一の指摘は AC-6e テスト設計が private 関数 `hasWorkspaceMarker` の直接検証可否を明記していない点(Minor 1件)で、READY を妨げない。(GoA 注記: 2 — 軽微な留保付き合意。留保: Finding #1 は code-generation 着手前の一文追記で解消可能な軽微事項)
