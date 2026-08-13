# Code Summary — unit `advisory-requestion-fix`

**PR**: https://github.com/amadeus-dlc/amadeus/pull/2980(#2979 は head 差し替えのためクローズ)
**Bolt branch**: `bolt-advisory-requestion-fix`(base `97581b3e`、7コミット)→ conductor branch へ merge 取込済み
**実装者**: amadeus-developer-agent(Bolt worktree 分離)/ 検証・取込: conductor

## 変更ファイル

- `packages/framework/core/tools/amadeus-advisory-choice.ts` — `AdvisoryChoiceGuardResult` に `handoff` verdict 追加(settled hold の判別)、`recordAdvisoryChoice` を型付き outcome(`recorded` / `already-settled` / `refused`)へ、`receiptsSpentBy` 追加
- `packages/framework/core/tools/amadeus-directive.ts` — 新 kind `execute-advisory-handoff`(interface / VALID_KINDS / FIELDS / checker。`handoff_stages` は advisories の宣言の重複排除射影で、validator が両方向の射影整合を検査)
- `packages/framework/core/tools/amadeus-orchestrate.ts` — `applyPendingAdvisoryGuard` が `handoff` verdict を ladder 再入**前**に分岐し `execute-advisory-handoff` を emit。`refused` のみ human フォールバック
- `packages/framework/core/amadeus-common/protocols/stage-protocol.md` — 「settled hold」節を追加
- harness 正本8面(claude/codex/cursor/kimi/kiro/kiro-ide/opencode/pi)— `run_required`/`formal_checks` 消費記述を削除し `execute-advisory-handoff` 行へ置換
- `docs/reference/17-skill-system.md` / `.ja.md` — directive kind 一覧へ追記
- `amadeus/spaces/default/specs/tla/model-map.json` — `amadeus-orchestrate.ts` の impl hash 更新
- tests: 新規 `t2967-advisory-handoff-directive.integration.test.ts`(full/auto、human-turn(gated)、semi の3経路)、`t2967-advisory-record-outcome.integration.test.ts`、`t113` に射影規則の単体、既存 advisory テストの verdict 名追随(意味論不変)

## 主要実装判断

- 実行 route は宣言駆動 `handoff_stage` 一本化(Q1 裁定)。`run_required`/`formal_checks` は復活せず、hold 解除セマンティクス(evaluator no-hold のみ)不変
- 「既 settled」の判定は同一 provenance の spend 実績 + open 集合空で成立。open が残る場合は refusal(fail-open 防止)
- directive は質問でなく作業: `handoff_stages` 空(宣言に destination 無し)の場合は standing hold の報告で停止する契約

## 検証(全て実測、conductor 実施)

- 落ちる実証: 実装3ファイルのみ base `97581b3e` へ戻し新テスト実行 → 10 fail / 1 pass → 復元後 `git status --porcelain` 0 行(注入→赤→revert 1セット)
- Green: 新規 + 既存 advisory 回帰 10 ファイル = 142 pass / 0 fail(`bun test`)
- `bun run typecheck` exit 0 / `bun run lint` exit 0(警告465は既存)/ `bun run build` exit 0・追跡ファイル不変
- 配送先述語: `git grep -nE 'run_required|formal_checks' -- packages/framework/harness/` exit 1(0 hit)、自己インストール面 `.claude/skills/amadeus/SKILL.md` の `run_required` 0 hit・`execute-advisory-handoff` 2 hit
- フルスイート `bash tests/run-tests.sh --ci` exit 2: 失敗は `t-team-up-run-lifecycle.serial` の16件のみで、未改変 base で同一再現(帰属切り分け済み・既存環境起因、Issue #2978 起票)。advisory 領域は全て green

## 未検証面(reviewer FOLLOW-UP 対応の書き分け)

- ローカル実測済み: typecheck / lint / build(単発)/ フルスイート(既存 #2978 の16件を除き green)/ 配送先 grep 述語 / advisory 対象10ファイル 142 pass
- **PR #2980 の CI で検証する面(本成果物の実測範囲外)**: 隔離2回ビルドの再現性検査、`source-only:check`、グラフ不変量検査、Project Coverage Gate(絶対 + 相対の AND)、Patch Coverage Gate、plugin-conformance-e2e。これらは build-and-test ステージで PR CI の実測結果として確認する
- 落ちる実証は「実装3ファイル→base 復元での集約 Red(10 fail / 1 pass)」の1回で、Step 3-5 の個別 Red 証跡は集約実行に含まれる(fail の内訳: t2967-advisory-handoff-directive の full/human-turn/semi 経路 + t2967-advisory-record-outcome の型付き outcome 系)
- pr-convergence-report.md は create 直後のスナップショット(`kind: created`)。収束後の最新化は build-and-test / マージ前の pr-convergence 手順で行う

## 計画からの逸脱

- builder の最終報告が返らず(セッション停止)、Step 9-10 の検証と落ちる実証は conductor が引き取って実測した(実装・テストは builder の7コミットで完結していた)
- PR head は bolt ブランチでなく record 同梱の conductor ブランチとした(前例 PR #2932 の構成。#2979 → #2980 へ差し替え)

## 申し送り

- 恒久 drift 機械検査は Out of scope(Q3 裁定)— workflow 完了時に follow-up Issue を起票する
- ローカル team-up テスト失敗は #2978 参照(本 PR とは無関係)
