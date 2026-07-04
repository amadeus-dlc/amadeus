# Requirements — 260704-engine-namespace

対象 Issue: https://github.com/amadeus-dlc/amadeus/issues/445
scope: refactor（Minimal depth、test strategy: minimal）

## Intent 分析

PR #438 が sub-agent 名前空間を `amadeus-*` へ統一した結果、エンジン内部の残り（`.agents/aidlc/`、tools の `aidlc-*.ts`、`aidlc-common/`、`knowledge/aidlc-shared/`）だけが `aidlc-*` のままで、命名が二層に分かれている。
この Intent の目的は、エンジン内部の名前空間を `amadeus` へ統一し、二層状態を解消することである。
挙動変更はなく、改名と参照更新だけの refactor である。

本 Intent は ideation を SKIP する refactor scope のため、intent-statement と scope-document は成果物として存在しない。
両者に相当する内容（背景、確定判断、影響実測、受け入れ条件）は Issue #445 に記録済みである。
team-practices は `aidlc/spaces/default/memory/team.md` を参照する。

## 機能要求

| ID | 要求 | 出典 |
|---|---|---|
| R001-engine-dir-rename | `.agents/aidlc/` を `.agents/amadeus/` へ改名し、`.claude/` 側 symlink（agents、aidlc-common、knowledge、scopes、sensors、tools、hooks）の張り替えと parity relocations の更新を行う。 | Issue #445 確定判断 |
| R002-tool-rename | tools 26 ファイルを単純置換で改名する（`aidlc-orchestrate.ts` → `amadeus-orchestrate.ts`）。scopes 9 + sensors 4 の `aidlc-*.md` も同規則で改名する（code-generation の reviewer 指摘を Request Changes で採用、decision 記録あり）。 | 本ステージ Q1 回答 + gate 判断 |
| R003-hooks-rename | hooks 11 ファイルを同じ規則で改名し、`.claude/settings.json` の hook 参照を更新する。 | 本ステージ Q1・Q2 回答 |
| R004-common-shared-rename | `aidlc-common/` を `amadeus-common/` へ、`knowledge/aidlc-shared/` を `knowledge/amadeus-shared/` へ改名する。 | Issue #445 確定判断 |
| R005-rules-rename | `.agents/rules/aidlc.md` を `.agents/rules/amadeus.md` へ改名し、parity の `rulesAidlcMd` 照合を mapping で追従させる。 | 本ステージ Q2 回答 |
| R006-reference-update | 上記への参照（skills、`.agents/rules/**`、docs、dev-scripts、`package.json`、CLAUDE.md、AMADEUS.md）を一括更新する。影響実測は tools 参照 215 ファイル、`aidlc-common` 44、`aidlc-shared` 26、`.agents/aidlc` パス 93。 | Issue #445 背景 |
| R007-parity-generalization | `parity-check.ts` の名前対応を単一のトークン対応表（`nameMappings` 型の機構）へ一般化し、path 解決と内容正規化を対応表駆動にする。#438 の `subAgentNameMapping` もこの機構へ吸収する。eval を先に追加して RED を確認してから実装する。 | 本ステージ Q3 回答 |
| R008-promote-sync | 参照更新した skill を `dev-scripts/promote-skill.ts <name> --replace` で昇格同期する。 | .agents/rules 準拠 |

## 非機能要求

| ID | 要求 |
|---|---|
| N001-parity-pass | `npm run parity:check` が pass する。`engineFileExceptions` は空を維持し、対応表 mapping と内容正規化だけで上流 byte-match を成立させる。 |
| N002-no-behavior-change | エンジンの挙動、directive 契約、成果物契約（v2 構造）は変更しない。改名と参照更新のみとする。 |
| N003-full-verification | `npm run test:all`（`grilling-wiring:check`、`claude-wiring:check`、sandbox e2e を含む）と `AmadeusValidator`（workspace 全体）が pass する。 |
| N004-out-of-scope-preserved | workspace ディレクトリ `aidlc/`、v2 機械可読成果物（`aidlc-state.md`、`intents.json`、audit イベント語彙）、既存 Intent record は変更しない。 |
| N005-no-residual-references | 旧名（`.agents/aidlc/` パス、tools と hooks の `aidlc-*.ts` ファイル名、`aidlc-common`、`aidlc-shared`、`rules/aidlc.md`）への参照が、許容例外を除いて 0 件であることを機械的に確認する。確認方法は `git grep -lE "\.agents/aidlc/|aidlc-(orchestrate|utility|state|log|audit|runtime|bolt|graph|learnings|directive|lib|jump|swarm|worktree|validate|version|sensor[a-z-]*|includes|stage-schema|rule-schema|runner-gen|stop|session-[a-z]+|statusline|sync-statusline|mint-presence|audit-logger|log-subagent|validate-state|runtime-compile|sensor-fire)\.ts|aidlc-common|aidlc-shared|rules/aidlc\.md" -- ':!aidlc/spaces' ':!dev-scripts/data/parity-baseline.json' ':!dev-scripts/evals/parity'` が 0 件を返すこととする（一致パターンは code-generation で最終確定してよいが、許容例外の境界はこの 3 つに固定する）。許容例外: (1) 既存 Intent record（`aidlc/spaces/**`）、(2) `dev-scripts/data/parity-baseline.json`（上流ミラー）、(3) parity eval の fixture（`dev-scripts/evals/parity/**`）、(4) `dev-scripts/data/parity-map.json`（`nameMappings` 対応表自体が旧トークンを `prefix` として定義する。code-generation で確定した追加例外、decision 記録あり）、(5) `dev-scripts/generate-parity-baseline.ts`（未改名の上流 clone のスキーマを読む処理。同上）。この確認は build-and-test の検証結果（`build-test-results.md`）に記録する。 |

## 制約

- dev-scripts の変更は TDD で進める。parity eval（`dev-scripts/evals/parity/check.ts`）に対応表 fixture を先に追加し、失敗を確認してから実装する（`.agents/rules/dev-scripts.md`）。
- skill 昇格は `promote-skill.ts --replace` を使い、手動同期しない。
- audit の記録済みイベントは書き換えない（org.md）。
- 改名は `git mv` で行い、履歴の追跡性（rename 検出）を保つ。
- `.coderabbit.yml` / `.coderabbit.yaml` は変更しない。

## 前提

- #438 は merge 済み（`50936117`）。tools・parity-map の接触面は解消済みで、並行運用ポリシー上の衝突はない。
- parity の skill 照合は存在チェックのみ、engine ファイルは hash 照合 + 正規化である（`dev-scripts/parity-check.ts`）。
- `.claude/` 配下の agents、aidlc-common、knowledge、scopes、sensors、tools、hooks は `.agents/aidlc/` への symlink である（実測済み）。

## スコープ外

- workspace ディレクトリ `aidlc/` の改名。
- `aidlc-state.md`、`intents.json`、audit イベント語彙の改名（v2 構造と英語ラベルを維持する方針）。
- 既存 Intent record 内の旧名の書き換え（歴史的記録）。
- 上流 skill 38 個の適応点の拡大（改名と grilling 結線の 2 点に限定する方針は不変）。

## 未解決事項

- `.claude/` 側 symlink の名前（`aidlc-common` → `amadeus-common` へ合わせるか）と、byte-match 対象の内容に含まれる `.claude/aidlc-common/...` 参照の正規化規則は、functional-design で確定する。R001 の実装はこの確定に依存するため、functional-design を先に完了させる（stage 順序どおり）。
- 各改名の正確な対応表（26 tools + 11 hooks + 4 ディレクトリ + rules 1 件）は functional-design で一覧化する。N005 の grep パターンはこの対応表から導出して code-generation で最終確定する。

## Review

**Verdict: READY**

- [解消確認] 前回のブロッキング指摘（Issue #445 の受け入れ条件 1 点目「旧名への参照が Intent record・`parity-baseline.json`・parity eval fixture 以外に残らない」の未反映）は、N005-no-residual-references の追加で解消した。許容例外の境界が `aidlc/spaces/**`、`dev-scripts/data/parity-baseline.json`、`dev-scripts/evals/parity/**` の 3 箇所に要求レベルで固定され、機械的な確認方法（具体的な `git grep` コマンド）と検証結果の記録先（build-and-test の `build-test-results.md`、実在する成果物であることを確認済み）まで明示されている。grep の正確なパターン自体を code-generation で最終確定してよいとした点も、境界（何を許容例外とするか）と実装詳細（どう検出するか）を切り分けており妥当である。これで Issue #445 の受け入れ条件 5 点すべてが requirements.md に対応する要求（N001〜N005、および 前提 の #438 merge 済み確認）を持つ。

- [解消確認] 未解決事項の記述強化により、R001（symlink 張り替え）が functional-design の symlink 命名確定に依存すること、N005 の grep パターンが functional-design の改名対応表から導出されることが明記された。これにより、依存順序（functional-design が先に確定すべき事項）が requirements 段階で正しく tasks 側へ引き継がれる状態になっている。

- [参考: 良い点] 機能要求 R001〜R008 は出典列で Issue #445 の確定判断・本ステージの Q1〜Q3 回答に明確に紐づいており、トレーサビリティは良好である。ideation を SKIP した refactor scope であるため `intent-statement`/`scope-document` が存在しない事情と、`team-practices` の参照先（`team.md`）を Intent 分析で明示しており、upstream-coverage の観点も満たしている。スコープ外の記載（workspace `aidlc/`、v2 成果物、既存 Intent record、上流 skill 適応点の拡大）も Issue の除外事項と一致し、scope creep は見当たらない。挙動変更なしの refactor という前提も N002/N004 で明示的に固定されている。

- [軽微・非ブロッキング] N005 の grep コマンドはテーブルセル内に長大な正規表現として埋め込まれており可読性は高くないが、暫定パターンであることが明記され、確定は code-generation に委ねられているため、要求としての妥当性を損なわない。
