# Requirements Analysis Questions — 260821-fmc-retirement

Intent: 260821-fmc-retirement / Depth: Standard(予算 最大8問、本ステージは2問で構成)
承認エビデンス: full autonomy grant(grant_id intent-grant-b79b828bb98fb4abcaaf2dd74c1a6a44、2026-08-21T03:22:00Z コミット)。各 [Answer] は `amadeus-bolt decide-question` 梯子の AUTO_DECIDED 裁定(provenance 併記)。

## Q1: コア advisory 機構の処遇(RE open item O-1 — FMC が唯一の advisories 供給者)

- A) コア機構は温存し、A2 テスト 8 件は合成 fixture へ差し替え、休眠事実を docs に明記(再設計時の再供給前提)
- B) コア機構(1,960 行超 + 7 ハーネス面 + directive kind 2 種)も併せて退役
- C) コア機構は温存、A2 テスト 8 件は削除
- X) その他

[Answer]: A — 梯子 AUTO_DECIDED `auto-decision-53c6a4faaa9e06c34effe1742a6cc288`。根拠: scope-document Out of Scope(FMC と無関係な変更はスコープ外 — B はスコープ拡大 = 仕様変更でユーザー専権)、A2 の被検 subject はコア機構であり削除は巻き添え(P5 surgical 違反 — C 不採用)。FR-TEST-2 / FR-DOC-2 に反映。

## Q2: plugin-conformance fixture の代替(RE open item O-2 — blocking t341 が FMC 実ディレクトリ依存)

- A) tests/fixtures 配下に最小の合成 test-fixture プラグインを新設して差し替え
- B) github-pr-convergence を参照 fixture に再標的
- C) t341 を削除
- X) その他

[Answer]: A — 梯子 AUTO_DECIDED `auto-decision-08dc84b9963cec50aff1c20d68cbbc9e`。根拠: construction.md「fixture はテスト側のヘルパーに置く」の適用。B は #3382 並行作業(別エージェント)との結合を新設。C は blocking job の唯一のテスト削除 = ゲート空洞化(NEVER 赤スイート放置と同族の禁止クラス)。FR-TEST-3 に反映。
