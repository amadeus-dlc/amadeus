# Code Generation Plan — vocab-canonicalization

上流入力(consumes 全数): requirements.md、business-logic-model.md、business-rules.md、domain-entities.md

- `domain-entities.md`: E-1〜E-6(正本・マニフェスト・投影4面・生成器・ガード・削除対象)を実装対象の実体一覧として使用
- `business-logic-model.md`: ADR-1(YAML マニフェスト)/ ADR-2(write/check 独立スクリプト)/ 生成フロー / TDD 順序を実装手順として使用
- `requirements.md`: FR-1〜6(正本確立・機械生成・供給・削除・drift guard・参照整合)と NFR-1〜4(決定性・fail-closed・既存ゲート互換・TDD)を実装ステップの受け入れ枠として使用(特に FR-5b 落ちる実証と NFR-4 TDD は完了条件へ直結)
- `business-rules.md`: BR-1〜8(fail-closed 5条件・EN/JA ペア規則・トークン変換・subset 17/21/all・矛盾解消先・t413 述語・既存ゲート互換)を受け入れ規則として使用

## 実行形態

- ソロ Bolt worktree 分離(cid:code-generation:solo-bolt-worktree-required): `wt-vocab-bolt`(branch `bolt/vocab-canonicalization`、base origin/main `a864822fa`)
- builder = amadeus-developer-agent subagent 1名。engine/state 操作禁止・逸脱時停止・同期完遂・完了報告を prompt に明示(cid:builder-prompt-sync-completion / c2 / deviation-stop-before-implement)
- record 成果物は conductor が作成(本 plan + 完了後の code-summary.md — swarm-unit-artifact-backfill の単一 unit 適用)

## 実装ステップ(builder 契約の要約)

0. CG 再実測(BR-5 条件): 語集合・§9/reference 表・t413 空番を worktree HEAD で確定
1. 正本統合: 昇格10語+self-* 4語+チーム語彙吸収、矛盾解消(UoW/Guardrail/Scope)、`<harness-dir>` 中立化、Projection Manifest(YAML)追加
2. 生成器 `scripts/glossary-projection.ts`(write/check、TDD、fail-closed 5条件は1条件1テスト、unit=純関数 / integration=t413)
3. 旧面削除: domain-language.md / CONTEXT.md、`.coderabbit.yaml` 差替
4. write 実行+package.ts+promote:self(13面同期)
5. 落ちる実証(注入→check 赤→revert→green の1セット、非コミット)
6. 全検証(typecheck / lint / dist:check / promote:self:check / run-tests --ci / coverage patch gate 0 uncovered)+deslop
7. PR 発行(`Closes #2030`、マージはしない)

## 完了条件

- t413 系ガードの green + 落ちる実証の実測出力が報告に含まれること
- 全検証コマンドの個別 exit code 報告(パイプ越し捕捉禁止)
- PR URL の報告(承認・マージはユーザー専権)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T13:01:01Z
- **Iteration:** 1
- **Scope decision:** none

実装は契約と細部まで一致・未申告逸脱なし・実測可能項目すべて一致。code-summary の数値2件(t414 の unit への45件誤帰属=実測 unit33+integration12 / コミット7件=物理8件)のみ差し戻し

### Findings

- Major | code-summary.md:18 | 「t414 unit 45 tests」は誤帰属 — 実測 unit 33 + integration 12(numbers-from-command-output-only 違反)
- Minor | code-summary.md:11 | 「コミット7件」は論理項目数で物理コミット数8(merge 含む)と不一致

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T13:03:58Z
- **Iteration:** 2
- **Scope decision:** none

iteration1 の数値2件を worktree 実測(unit 33/integration 12、物理コミット8)で閉包確認。record vs contract の全面再点検でも新規不整合なし、READY

### Findings

- 確認 | code-summary.md:18 | t414 unit 33 + integration 12(計45)が実測一致(Major 解消)
- 確認 | code-summary.md:11 | 物理コミット8件(merge 1件含む)が実測一致(Minor 解消)
