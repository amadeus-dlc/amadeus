# コード生成サマリー — unit: upstream-sync

上流 2.2.0（commit b67798c37c71855271b70882a33f47890d41f212）の Adaptive Composer 機能を取り込んだ。
TDD の RED → GREEN 形式で実施し、`npm run parity:check` の GREEN 化を定量基準とした。

## 変更ファイル一覧

### 修正（15 件）

| ファイル | 区分 | 内容 |
|---|---|---|
| `.agents/amadeus/hooks/amadeus-stop.ts` | 3-way merge（例外維持） | isPendingComposeStop 関数追加（上流）+ 既存ローカル修正を統合 |
| `.agents/amadeus/knowledge/amadeus-shared/audit-format.md` | union merge（例外維持） | RECOMPOSED イベント追加（Navigation category）、Event Registry 70 → 71 |
| `.agents/amadeus/tools/amadeus-audit.ts` | 3-way merge（例外維持） | VALID_EVENT_TYPES に RECOMPOSED を追加 |
| `.agents/amadeus/tools/amadeus-graph.ts` | 3-way merge（例外維持） | validateGrid、keywordCollisions、mergeComposedScopes、validate-grid CLI handler 追加 |
| `.agents/amadeus/tools/amadeus-jump.ts` | 3-way merge（例外維持、手動コンフリクト解決） | parseStateStageSuffixes import、effectiveAction 関数追加。既存 phase-closing ロジックと nextInScopeStage 引数追加が競合→手動解決 |
| `.agents/amadeus/tools/amadeus-lib.ts` | 3-way merge（例外維持） | setStageSuffix、scopeGridPath、scopesDir 追加 |
| `.agents/amadeus/tools/amadeus-orchestrate.ts` | 3-way merge（例外維持） | compose dispatch Branch 4c と Branch 8 の adaptive routing 追加 |
| `.agents/amadeus/tools/amadeus-runner-gen.ts` | 機械的再コピー（元来 engineFileExceptions 外。byte 一致を維持） | /amadeus-compose runner 生成コード追加（上流と byte 一致） |
| `.agents/amadeus/tools/amadeus-state.ts` | 3-way merge（例外維持） | nextInScopeStage に state content を渡すよう変更 |
| `.agents/amadeus/tools/amadeus-utility.ts` | 3-way merge（例外維持） | validateGrid、parseStateStageSuffixes、setStageSuffix、scopeGridPath、scopesDir、handleDetect、handleRecompose 追加 |
| `.agents/amadeus/tools/amadeus-version.ts` | 機械的再コピー（元来 engineFileExceptions 外。byte 一致を維持） | バージョン 2.1.0 → 2.2.0 更新（上流と byte 一致） |
| `.agents/skills/amadeus/SKILL.md` | skill 昇格 | skills/amadeus/SKILL.md を promote-skill.ts --replace で昇格 |
| `aidlc/spaces/default/intents/260705-upstream-sync/audit/j5ik2o-mac-studio-lan-a12cd3f694cd.md` | audit trail | stage 進行の audit 記録 |
| `dev-scripts/data/parity-baseline.json` | 再生成 | baselineCommit を b67798c3、engineFiles 196 → 199 に更新 |
| `skills/amadeus/SKILL.md` | skill source | "New work while an intent is active" に PLAN-RESHAPE 認識・"Composing a workflow plan" セクション追加 |

### 新規（7 件）

| ファイル | 区分 | 内容 |
|---|---|---|
| `.agents/amadeus/agents/amadeus-composer-agent.md` | 新規適応コピー | aidlc-composer-agent.md の rename 適応（14 番目のエージェント） |
| `.agents/amadeus/knowledge/amadeus-composer-agent/composing.md` | 新規適応コピー | knowledge/aidlc-composer-agent/composing.md の rename 適応 |
| `.agents/skills/amadeus-compose/SKILL.md` | skill 昇格 | skills/amadeus-compose/SKILL.md を promote-skill.ts で昇格 |
| `.claude/skills/amadeus-compose` | symlink | .agents/skills/amadeus-compose への symlink（claude-wiring:check drift 解消） |
| `skills/amadeus-compose/SKILL.md` | 新規 skill source | /amadeus compose コマンドの skill 入口 |
| `construction/upstream-sync/code-generation/code-generation-plan.md` | produces | コード生成計画 |
| `construction/upstream-sync/code-generation/code-summary.md` | produces | 本ファイル |

## 例外（engineFileExceptions）の解除 / 維持の内訳

| 区分 | 件数 | 対象 |
|---|---|---|
| byte 一致（元来 engineFileExceptions 外のため parity-map 変更なし） | 2 件 | amadeus-runner-gen.ts、amadeus-version.ts |
| 維持（ローカルデルタ残存） | 8 件（＋audit-format.md） | amadeus-lib.ts、amadeus-stop.ts、amadeus-jump.ts、amadeus-audit.ts、amadeus-state.ts、amadeus-utility.ts、amadeus-orchestrate.ts、amadeus-graph.ts（＋audit-format.md は union merge で統合） |

維持 8 件は、Issue #455 / #464 / #476 / #498 / #499 / #504 / #507 等のローカル修正が残存しているためであり、上流が同修正を取り込んだ時点で順次解除する。3-way merge により全ファイルに上流の新機能デルタ（Adaptive Composer 関連）を取り込み済みである。amadeus-jump.ts は phase-closing ロジック（ours local fix）と nextInScopeStage 引数追加（theirs）が競合したため手動解決した。

## RED → GREEN 証跡

| フェーズ | コマンド | 結果 |
|---|---|---|
| RED（baseline 更新直後） | `npm run parity:check` | 6 件 FAIL（runner-gen / version / composer-agent / composing / amadeus-compose + pdm 未変更確認） |
| GREEN（全変更適用後） | `npm run parity:check` | OK（39 skills、199 engine files、基準 commit b67798c3） |

## 全検証コマンドの実行結果

| コマンド | exit code | 備考 |
|---|---|---|
| `npm run parity:check` | 0（pass） | 39 skills、199 engine files |
| `npm run test:all` | 0（pass） | typecheck / lint / contracts / parity / claude-wiring / grilling-wiring / issue-ref-contract / test:it:all / test:it:engine-e2e / diff:check すべて pass |
| `npm run test:it:installer` | 0（pass） | installer eval |
| `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-upstream-sync` | 0（pass） | 不足または矛盾: なし |

## 主要判断

| 判断 | 選択肢と選んだ理由 |
|---|---|
| CLAUDE.md 適用 N/A | parity-map の exceptions に「リポジトリ固有・上流と同期しない」と明記されており、適用しない。上流 diff の 1 文追加は amadeus context では skills/amadeus/SKILL.md の "Composing a workflow plan" セクションで代替カバーする |
| pdm scope 再タグ不要 | 今回変更したのは engine tools のみで stage .md ファイルは無変更。compile 不要を確認し、`scope-table` で `pdm 12/32` が維持されることを確認した |
| amadeus-compose symlink 方式 | claude-wiring:check の drift として検出。`.claude/skills/amadeus-compose` を `../../.agents/skills/amadeus-compose` への symlink として作成し解消した |
| 3-way merge を択 | parity-map に記録された例外ファイルはローカルデルタが残存しているため機械的再コピーは不可。Base=fde1e1af+mappings / Ours=local / Theirs=b67798c3+mappings の 3-way merge を採用し、クリーン統合（コンフリクトなし）7 件 + 手動解決 1 件（amadeus-jump.ts）とした |

## 逸脱事項

| 項目 | 内容 |
|---|---|
| 誤配置ディレクトリ | `construction/code-generation/`（`construction/upstream-sync/code-generation/` が正しいパス）が前セッション中に生成された。削除は code-generation stage 範囲外のため現状維持し、後続セッションで整理する |
| `scope-table --check` pre-existing 問題 | `amadeus-utility.ts` が `skills/aidlc/SKILL.md`（旧パス）を参照しており ENOENT。当 check は `test:all` には含まれておらず、今回の変更範囲外の pre-existing 問題として記録のみ |
