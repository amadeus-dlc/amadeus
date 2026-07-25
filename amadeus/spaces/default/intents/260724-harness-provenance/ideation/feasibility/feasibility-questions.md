# Feasibility Questions — 260724-harness-provenance

上流入力(consumes 全数): intent-statement.md, competitive-analysis.md, market-trends.md, build-vs-buy.md

以下は実測(現行セッションの環境変数、agmsg codex ドライバのソース、`packages/framework/core/tools/amadeus-utility.ts` の既存 `process.env.CODEX_HOME` 参照)に基づく回答である。実測結果自体は事実の記録であり選挙対象の価値判断を含まないため、cid:requirements-analysis:no-election-judgment-gate に基づき leader へ選挙不要判定を申告のうえ承認を得た。承認: leader が承認しました(2026-07-24T11:10:16Z)。

## Q1. どの既存システムと統合する必要があるか?

[Answer]: A

- A. 各 AI ハーネス(claude-code / codex / cursor / opencode / kiro)が自身のプロセスに設定する環境変数、および Amadeus 自身の `amadeus-state.md` / stage `memory.md` / 監査シャード書き込み経路。実測: 現行セッション(claude-code)の `env` に `CLAUDECODE=1`、`CLAUDE_CODE_SESSION_ID`、`CLAUDE_CODE_ENTRYPOINT=cli` 等が実在(`env | grep CLAUDE` で確認済み)。codex は `~/.agents/skills/agmsg/scripts/drivers/types/codex/codex-bridge.js:155` が `process.env.CODEX_THREAD_ID` を読む実装が既に存在(agmsg app-server ブリッジ経由のセッションでのみ有効)。cursor/opencode/kiro に相当する env var は本リポジトリ内(`packages/framework/core/tools/`、`dist/{cursor,opencode,kiro*}/`)に実装例が見当たらず未確認
- X. Other

## Q2. 規制・コンプライアンス要件(PCI・HIPAA・SOC2・データ所在地)はあるか?

[Answer]: A

- A. N/A。実行ハーネス種別という開発運用メタデータの記録であり、規制対象データを扱わない
- X. Other

## Q3. チームの現行技術スタックとスキルプロファイルは?

[Answer]: A

- A. TypeScript/ESM、Bun 直接実行、既存の `amadeus-state.ts`/`amadeus-lib.ts` の Result 型・parse-dont-validate 系ヘルパーが既に存在(project.md の Code Style / Decided 節に明記)。本機能もこの既存パターンに従う前提とする
- X. Other

## Q4. 予算・スケジュール制約はあるか?

[Answer]: A

- A. N/A。P3 の enhancement であり厳格な納期制約は Issue に明記されていない
- X. Other

## Q5. 組織的な障壁(変更凍結・競合する優先事項)はあるか?

[Answer]: A

- A. N/A。既存の gate/センサー機構(required-sections, upstream-coverage, answer-evidence)への影響がないスキーマ追加であり、既存ワークフロー進行を止める要因は確認されていない
- X. Other

## Q6. 現在使用している AWS サービス・アカウントは何か?

[Answer]: A

- A. N/A。本機能はローカルファイル(amadeus-state.md、memory.md、監査シャード)への追記のみで、AWS を含む外部インフラに依存しない
- X. Other

## 実測に基づく技術的不確実性(要件定義以降で扱う)

- cursor/opencode/kiro の自動検出用 env var は未確認(A 案どおり)。要件定義段階で「未確認ハーネスは手動記入にフォールバックする」設計判断を明示する必要がある(Issue 本文の「手動記入は最終手段」という優先順位と整合)
- codex の `CODEX_THREAD_ID` は agmsg app-server ブリッジ(monitor モード)経由でのみ設定される可能性があり、通常の codex CLI 単体起動時に設定されるかは未確認。requirements/design 段階で実機検証が必要
