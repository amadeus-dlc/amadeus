# Requirements — Issue #2967 advisory 再質問回帰の修正

**Intent**: `260813-advisory-requestion-fix`(scope `self-fix`、depth Minimal)
**Upstream inputs**: `amadeus/spaces/default/codekb/amadeus/business-overview.md`(無人実行の前提が崩れる面)、`architecture.md`(advisory hold の裁定・記録・再入経路と run-now の解除不能 — 本 intent の RE が更新)、`code-structure.md`(差分区間の構造変化 — 本 intent の RE が更新)。3面とも本 intent の RE(observed `c0f9edf27`)が更新した節から引く。
**根拠**: Issue #2967(クロスレビュー run `xrev-2967-20260813`、2名とも CONFIRMED_WITH_REFINEMENTS、収束 ESTABLISHED_WITH_REFINEMENTS)、質問裁定3件(`requirements-analysis-questions.md`、full autonomy ladder AUTO_DECIDED)。

## Intent 分析

semi/full の Intent autonomy 下で、autonomy ladder が `run-now` を自動裁定し receipt(`provenance.kind=auto-decision`)が保存済みの advisory が、次の `amadeus-orchestrate next` で同じ `await-advisory-choice` として人間へ再提示される。原因は PR #2890 が `run_required`/`formal_checks` の型付き実行 route を削除した片側移行(後継 `handoff_stage` は emit されるがどのハーネスも未消費)。目標は「裁定済み advisory を人間へ出さず、handoff 実行へ導いて unattended run を継続する」こと(PR #2318 の設計意図の回復)。architecture.md の機序6段(guard → ladder → record 拒否 → human フォールバック → record 冪等拒否 → ループ)が患部の正準記述である。

## 機能要件

### FR-ADV-1: receipt 済み advisory の非再提示
有効な `run-now` receipt(auto-decision / human-turn いずれの provenance でも)が存在する advisory instance について、`next` は同一 advisory の `await-advisory-choice` を人間へ再提示しない。autonomy モード(none/semi/full)に依存しない guard 段の性質として実装する。
受け入れ: receipt 保存済み store に対する orchestrator pass が `await-advisory-choice` を返さないことをテストで実測。

### FR-ADV-2: handoff 実行 route の型付き提示(Q1 裁定 = handoff_stage 一本化)
`run-now` receipt 済みで hold が継続する場合、engine は宣言済み `handoff_stage`(`amadeus-directive.ts:212`、plugin.json の `handoff.stage` 由来)の実行を conductor へ指示する型付き directive を emit する。conductor はそれを実行してから `next` を再評価する。`run_required`/`formal_checks` 型は復活しない。
受け入れ: emit される directive が型検査(`amadeus-directive.ts` の checker)を通り、handoff stage 名を機械可読に運ぶこと。

### FR-ADV-3: 未 receipt advisory の ladder routing 維持
receipt の無い advisory は従来どおり autonomy ladder へ先に渡し、安全に裁定できた場合は人間へ提示しない。人間へ戻すのは ladder の fail-closed 結果(human-required / conflict / aborted / parked、権限不足、禁止効果、失効・競合)に限る。
受け入れ: 既存 t458 系の受理・fail-closed テストが green のまま、fail-closed 各種で human 提示になることが保たれる。

### FR-ADV-4: 「既 settled」と「裁定不能」の区別
`recordAdvisoryChoice` の拒否のうち「同一裁定で既に settled(冪等)」を、grounding 失敗等の異常系と区別し、既 settled を human フォールバックへ流さない。区別は実行結果由来の型付き値で行う(boolean の潰れを解消)。
受け入れ: 既 settled 経路と異常系経路で戻り値(または verdict)が異なることの単体テスト。

### FR-ADV-5: ハーネス skill 契約の同期(AC7)
harness 正本8面(claude/codex/cursor/kimi/kiro/kiro-ide/opencode/pi の SKILL.md / commands/amadeus.md)の `run_required`/`formal_checks` 消費記述を削除し、FR-ADV-2 の handoff 契約の消費手順へ置換する。`bun run build` で全配送先(dist・自己インストール面)へ投影する。
受け入れ: `git grep -nE 'run_required|formal_checks' -- packages/framework/harness/` が 0 hit(exit 1)、かつ build 後の自己インストール面でも 0 hit(配送先ツリー述語)。

### FR-ADV-6: full/semi の統合テスト(AC5)
auto-decision receipt 保存後の「次の orchestrator pass」までを通す統合テストを `full` と `semi` の両モードで追加する。期待: handoff 実行 route の directive が返り、`await-advisory-choice` が返らない。
受け入れ: 両テストが隔離 project-dir で green、修正前コードでは red(落ちる実証)。

### FR-ADV-7: 再提示禁止のモード非依存回帰(AC6 + Q2 裁定)
既存 receipt を持つ同一 advisory の再提示禁止を、human-turn provenance の receipt(gated 経路)でも回帰テストで固定する。
受け入れ: human-turn receipt 保存後の pass が `await-advisory-choice` を返さないテストが green。

### FR-ADV-8: 既存 hold セマンティクスの維持
「run-now は hold を解除しない(解除は plugin evaluator の no-hold のみ)」の既存契約、および `defer-with-risk` receipt の `resolved`→`allow` 経路は変更しない。既存 pin テスト(t458:200-206 / t528:134 / t526:100 / t-advisory-human-choice-boundaries:674)は、検査対象の関数契約が変わらない限り無改変で green を維持する。
受け入れ: フルスイート green + defer-with-risk 経路の無変更を回帰で確認。

## 非機能要件

適用可能な数値目標を持つ NFR は存在しないと判定する。根拠: Issue #2967 は挙動契約の回復のみを要求し、性能・セキュリティの数値目標を宣言する要件・NFR が上流(Issue 本文・クロスレビュー・codekb)に無い(cid:build-and-test:c2-no-test-theatre-for-absent-nfr — 目標なきベンチマークは作らない)。この判定を覆す条件: 修正が `next` のホットパスへ測定可能な遅延を導入する設計になった場合。

## 制約

- 正本は `packages/framework/core/` / `packages/framework/harness/<name>/`。`bun run build` で dist・自己インストール面を再生成し、追跡ファイル不変を確認(project.md Mandated)。
- TDD 既定(team.md Testing Posture): 失敗テスト先行 → 最小実装の vertical slice。修正前 red の実測(落ちる実証)を伴う。
- ブロッキングゲート全通過: typecheck / lint / 隔離2回ビルド / source-only / グラフ不変量 / フルスイート / coverage 両条件 / patch coverage / plugin-conformance-e2e。

## 前提

- 観測 intent(`260813-election-multiq`)の実 record は pending closed 済みで live 再現不可 — テストは隔離 project-dir で構成する(クロスレビュー実測)。
- Issue 影響節の「workaround = run-now 再選択」は両レビュアーが CONTRADICTED(実効せず)。実効回避は handoff stage の手動実行 — 要件には影響しない(修正で不要化する)。

## Out of scope

- 恒久的な drift 機械検査(engine が emit しないフィールドの消費検査)— Q3 裁定により別 Issue で follow-up。
- #2782(activation advisory の宣言駆動一般化)そのもの — 本修正は #2890 後の現行宣言(`handoff.stage`)を消費するのみで、一般化の未決論点は継承しない。ただし結合関係を関連 Issue に記録済み。
- hold 解除セマンティクス(evaluator no-hold 契約)の変更。

## Open questions

- なし(材料となる未解決事項は Q1-Q3 の裁定で閉じた。実装詳細の選択は code-generation 段の裁量)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-13T13:34:46Z
- **Iteration:** 1
- **Scope decision:** none

8本のFRはMinimal帯域・必須節・上流整合・質問裁定との整合をすべて満たし、BLOCKERなし。座標引用の精緻化とAC-FRトレース表の明示は次段への申し送りとしてFOLLOW-UP。

### Findings

- FOLLOW-UP | FR-ADV-2の `amadeus-directive.ts:212` はarchitecture.mdの本intent専用節に無く、同ファイル内で `handoff_stage` に触れる唯一の箇所(326行、別intent節)は異なる座標(`amadeus-advisory-choice.ts:729-741`)を挙げている。code-generation着手前の座標再確認を申し送るべき。
- FOLLOW-UP | Issue完了条件1-7とFR-ADV-1〜8の対応が、Q1裁定文中の一括言及(AC1-4/7)とFR個別タグ(AC5/AC6/AC7)に依存しており、AC1-4個々の対応を明示する一行表が無い。
- NIT | FR-ADV-8の受け入れ基準が既存pinテスト4ファイル名を受け入れ文中で反復しておらず、他FRに比べ検査対象の具体性がやや粗い。
