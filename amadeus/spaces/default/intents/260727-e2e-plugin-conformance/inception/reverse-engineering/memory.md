<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-27T11:05:00Z — diff-refresh base は cid:reverse-engineering:rescan-base-ancestry に従い、re-timestamp 全 observed のうち HEAD(0c4709102、worktree plugin-dev = origin/main 起点)の祖先で距離最小の 1673c433(距離60)を採用。直近4件の observed(46a75f2e7 等)は squash 運用によりいずれも非祖先で除外(merge-base --is-ancestor 実測)
- 2026-07-27T11:06:00Z — 本 intent は4 Issue バッチ(#1589/#1575/#1585/#1586)。#1589 は元 intent 260726-plugin-host-delivery の承認済み FR-4/FR-2/U2 の検証未達(cid:build-and-test:bt-acceptance-criterion-literal-path / bt-no-silent-scope-narrowing 違反クラス)としてユーザー裁定で amadeus-bugfix 帰属(2026-07-27、当初の完了済み intent への backward jump 案は取りやめ)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-27T11:07:00Z — cid:reverse-engineering:c3 に従い Developer(スキャン)→ Architect(合成)の直列2サブエージェント。スキャンは explore 的 read-only+scan-notes.md 1ファイル書込限定、合成は codekb 9ファイル書込限定(cid:reverse-engineering:c4 / cg-subagent-state-mutation-ban 準拠のプロンプト焼き込み)

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-27T11:08:00Z — フルスキャンせず差分区間(1830 files、大半は record/kimi 着地/dist 再生成)+ intent 対象面の重点スキャンに限定(cid:reverse-engineering:c1)。4バグの欠陥所在は決定的再現(空ホスト doctor 0バイト / drop 後空ディレクトリ残存)まで実測済み

- 2026-07-27T11:35:00Z — 宣言センサー3種(required-sections / upstream-coverage / answer-evidence)は codekb 出力パスが sensor filter に構造不適合のため不発火(cid:reverse-engineering:re-sensors-codekb-filter-mismatch / c3-codekb-sensor)。代替検証を conductor が直接実施: 9成果物の実在+H2 実在(grep -c '^## ' = 16/54/51/22/39/16/18/57/70)+conflict マーカー走査(8ファイル 0件、re-timestamp の1 hit は :594 の前 intent 由来のマーカー語彙説明散文であることを直読確認)。Architect の独立 spot-check は scan-notes 核心引用の訂正 0 件

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-27T11:09:00Z — requirements で必ず裁定する2点: (1) E2E の CI 実行トリガー — run-tests.ts:125 の --ci は e2e を含まず ci.yml:163 は test:ci のため、tests/e2e/ 配置だけではリグレッションガードにならない (2) 「baseline 復元」の境界定義 — baselineRestored 判定(amadeus-plugin.ts:377、record 基準で FS を見ない)と .amadeus-plugin-drops.json の残存の扱い
