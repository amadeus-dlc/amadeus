# Code Summary — interaction-budgets

## 実装結果

[#1999](https://github.com/amadeus-dlc/amadeus/issues/1999) の実装をBolt branch `bolt-interaction-budgets` に作成した。

- commit: `f155fdd9ec9c8c64d626bc0619589f93ce6b5b88`
- commit message: `feat(prompts): bound interaction and review contracts`
- rebase base: `origin/main` の `a9b96e3ee6bccb4ac04702a9621ce92886e96a05`（[#2048](https://github.com/amadeus-dlc/amadeus/pull/2048) merge commit）

## 主な作成・変更ファイル

- shared protocols: `packages/framework/core/amadeus-common/protocols/stage-protocol.md`、`grilling-protocol.md`
- reviewer contracts: architecture／product reviewer agentとknowledge、`amadeus-reviewer-runtime.ts`
- stage guidance: requirements、functional／NFR／infrastructure design、code-generation、build-and-test、construction phase memory
- harness authored source: Claude、Codex、Cursor、Kimi、Kiro、Kiro IDE、OpenCodeの各orchestrator surface
- tests: `t245-reviewer-protocol-production-path.test.ts`、`t34-stage-protocol-structure.test.ts`、`t415-interaction-budget-contract.test.ts`
- distribution: 7 harnessのpackageとroot self-install面。すべて正本から生成した。

## 主要な設計判断

- Codexで顕在化した長時間化だが、曖昧性、質問予算、review severity、完了契約は全harness共通coreの意味論とし、Codex専用gateを追加しない。
- reviewer findingは `BLOCKER | FOLLOW-UP | NIT` のclosed vocabularyとし、BLOCKERには再現可能な実害、要求違反、明確な回帰の証拠を要求する。
- 未解決BLOCKERだけがNOT-READYを導く。FOLLOW-UPとNITはbuilder再手渡しや再reviewの理由にせず、完了後の扱いを明示する。
- material ambiguityは、回答により成果物、外部契約、データ安全性が実質的に変わる不可逆判断に限定する。可逆・低リスク事項は推奨値を採用して記録し、追加質問は1ラウンドで止める。
- Minimal／Standard／Comprehensiveの質問数は4／8／12の上限、test guidanceの8／15は計画上限でありquotaではない。要求・差分・リスク・NFR coverageを基準にする。
- stage completionは必須成果物、宣言済み検証コマンド、未解決BLOCKERの有無だけを確認し、完了確認を新しい探索フェーズにしない。

## テスト結果

- 対象3 test files: 107 pass / 0 fail
- full `bun run test:ci`: 752 files、10,169 assertions、0 failures
- `bun run typecheck`: pass
- `bun run lint`: pass。既存warningのみ
- `bun scripts/package.ts --check`: 7 harness pass
- `bun run promote:self:check`: pass
- `git diff --cached --check`: pass
- swarm referee: lint＋typecheck＋対象107 test＋package／promoteで `converged:true`、`tampered:false`
- swarm finalize: converged 1、failed 0、merge failure 0

## 計画との差分

- full suiteはrefereeの固定60秒枠を超えるため独立証跡とし、refereeには対象test＋lint／typecheck＋drift checksを使用した。
- worker commit後にunitのcode-generation plan／summaryが未記録だったため、engineが実装済みunitをuncoveredとして再提示した。conductorが本成果物へ実装・検証証跡を記録してcoverage ledgerを閉じた。
- finalize時のstate／audit mergeは成功したが、完了判定はBolt auditではなくunit成果物の実在も要求するため、audit再実行ではなく不足成果物の記録が必要だった。

## 残課題

製品実装上の残課題はない。bounded Unit poolはUnit 4でUnit 2の共有budget contractへ接続する。
