# Performance Requirements — U1 installer-enum-extension(Issue #1048)

上流入力(consumes 全数): `../functional-design/business-logic-model.md`、`../functional-design/business-rules.md`、`../../../inception/requirements-analysis/requirements.md`、codekb technology-stack.md。

## 要求

- PR-1: 新規性能要求なし — 変更は 6 要素の frozen 配列 membership 判定と 6-entry map 参照で、計算量・I/O 特性は不変(business-logic-model.md F-1/F-2)。専用の性能目標値を発明しない(c3 — 実在する強制メカニズム以外の数値を作らない)
- PR-2: テスト実行時間は既存の強制メカニズムに従う — テストサイズ宣言(`// size:`)と wall-clock バンド(`tests/lib/test-size.ts` の WALL_CLOCK_BANDS)が上限を強制する。新規テスト(fixture 完走 2 経路+worktree 解決 1 本+契約テスト更新)は既存 integration/unit 層の宣言に収める

## 測定

性能の独立測定は行わない(測定対象の新規性能面が存在しないため — N/A の根拠は PR-1)。回帰は既存テストランナーの wall-clock 強制で検出される。

## Review

**Verdict:** READY
**Reviewer:** amadeus-architecture-reviewer-agent
**Date:** 2026-07-16T15:26:48Z
**Iteration:** 1

**対象(nfr-requirements 5成果物、本節を代表ファイルとして集約評価):** `performance-requirements.md`(本ファイル)、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`。`nfr-requirements-questions.md`(0問・E-OC1 証跡)も併せて確認。

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| — | — | — | 指摘なし | — |

### 検証内容(file:line 実測)

1. **ステージ定義充足**: `produces` 5成果物すべて実在(`performance-requirements.md` / `security-requirements.md` / `scalability-requirements.md` / `reliability-requirements.md` / `tech-stack-decisions.md`)。各ファイル H2 見出し 2個(required-sections の登録既定 ≥2 を満たす — 実測: 全5ファイルで `grep -c '^## '` = 2)。各ファイルの冒頭「上流入力」行が `business-logic-model.md` / `business-rules.md` / `requirements.md` の3点を明示参照(upstream-coverage 充足)。

2. **N/A 主張の反証可能性**(観点2):
   - PR-1「新規性能要求なし」— `business-logic-model.md` F-1(`HarnessName.parse` membership 判定、`all` frozen 配列 4→6 値)/ F-2(`ENGINE_DIR_BY_HARNESS` map 参照、entry 追加のみ)を根拠に、計算量・I/O 特性不変という構造事実に基づく。検証劇場ではない。
   - reliability-requirements.md「SLO 該当なし」— `amadeus/spaces/default/codekb/amadeus/technology-stack.md:13`(「永続 daemon を追加する計画はない」)を根拠に「単発 CLI・ランタイムサービス不存在」を主張。scalability-requirements.md SC-3 も同根拠を引用。反証可能な構造事実に基づき、検証劇場には該当しない。
   - security-requirements.md SR-2「攻撃面の増加なし」— `tests/integration/setup-install-flow.test.ts:22`(`buildCodeloadFixture` import)・`:34`(`fakeHttp`)を実測確認(観点6参照)、fakeHttp による完全ローカル検証という具体的機構に基づく。空手形ではない。
   いずれも「構造事実 → N/A」の導出過程が file:line で追跡可能であり、org.md/team.md の検証劇場禁止に抵触しない。

3. **数値・しきい値の由来**(観点3、constants-from-code):PR-2 の性能上限は `tests/lib/test-size.ts:89` `WALL_CLOCK_BANDS = { smallMaxSeconds: 1, largeMinSeconds: 30 }` — 実測確認、発明された数値なし。RR-2 の fail-fast は `engine-layout.ts:15-20` の実装から直接引用(観点6参照)。本 unit のマジックナンバーは0件。

4. **FD からの継承整合**(観点4):RR-3「hook project-dir 解決(rung 2)の worktree 誤収束を opencode/cursor でも防ぐ」は `requirements.md` AC-6a/AC-6e(E-1048-FD-Q1 = A 裁定、2026-07-16T14:57:55Z)と一致。`business-logic-model.md` F-4 の記述(rung 2 消費・実挙動変更を含む・rung 3 権威は不変)とも整合。BR-5(runtime 2面は新規 fail 経路を作らない)も RR/SR/SC 全体で保存されている。

5. **後方互換・フォールバック・移行シムの混入**(観点5):SR-1「寛容化(大文字小文字・部分一致)を導入しない」、PR-1「専用の性能目標値を発明しない」など、むしろ非混入を明示的に宣言する記述のみ。混入なし。

6. **file:line 実在照合**(観点6、実行済みコマンド):
   - `engine-layout.ts:15-20` の throw を実ファイルと逐語照合 — 完全一致(`throw new Error(\`no engine directory mapping is defined for harness "${harness}"\`);`)。
   - `tests/lib/test-size.ts:89` の `WALL_CLOCK_BANDS` 定義を実測確認 — 完全一致。
   - `tests/unit/setup-harness.test.ts:13` / `tests/unit/setup-harness-parse.test.ts:17` の現行4値 literal を実測確認 — 完全一致(business-rules.md BR-1 経由の間接引用だが、NFR 側の PR-2/SR-1 が依拠する契約テストの実在確認として実施)。
   - `tests/integration/setup-install-flow.test.ts` の `fakeHttp` / `buildCodeloadFixture` を実測確認 — 完全一致(SR-2 の「完全ローカル検証」根拠)。
   - `amadeus/spaces/default/codekb/amadeus/technology-stack.md:13` を実測確認 — SC-3/RR SLO の N/A 根拠と整合。
   - `dist/` 実ディレクトリ(claude/codex/cursor/kiro/kiro-ide/opencode = 6)、`.claude`/`.codex`(self-install 2ツリー)を実測確認 — tech-stack-decisions.md の「dist 6ツリー+self-install 2ツリー」記述と一致。

### Validation Tool Results

このステージに `validation_tools` の宣言なし(ステージ定義 `.claude/amadeus-common/stages/construction/nfr-requirements.md` に該当フィールドなし)。file:line 実測による手動クロスチェックで代替(上記6項目)。

### Summary

5成果物すべてが N/A 主張を構造事実・file:line で裏付け、数値はすべて実在する強制メカニズム(WALL_CLOCK_BANDS、既存契約テスト)由来で発明されたマジックナンバーはない。RR-3 は E-1048-FD-Q1=A 裁定(AC-6a/6e)と完全一致し、FD からの継承に断絶なし。後方互換・フォールバックの混入もなし。READY。(GoA 注記: 1 — 条件なし)
