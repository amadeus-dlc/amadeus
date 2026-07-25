<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-25T09:35Z — walking-skeleton stance は scope-dependent と分類。project.md は「スコープ別の既定は org.md に従う」とし greenfield 要素がある場合のみスケルトンを要求するが、本 intent は既存シェル関数の条件追加で greenfield 要素なし。エンジンが bugfix の既定(skeleton off)へフォールバックした。
- 2026-07-25T09:35Z — units-generation SKIP の degrade スコープのため、成果物は construction/fix-1449-watcher-guard/code-generation/ の unit ディレクトリ様式へ配置(cid:code-generation:degrade-scope-unit-dir-layout)。directive の produces は {unit-name} テンプレート未解決のまま届く。
- 2026-07-25T10:05Z — 修正後の実 launch を再計測: 5.87秒 / exit 0(修正前 200.85秒 / exit 1、いずれも3人構成・隔離インスタンス)。要件が狙った効果が実測で確認できた。計測環境は撤去済み(worktree 31件で前後一致)。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-25T10:00Z — 実装者が WATCHER_SKIP_ANNOUNCED ラッチを実装内判断として申告。launch 経路がガードを2回呼ぶ(:1438 stale sentinel クリア前、:1455 検証前)ため、素朴な echo では FR-2 の「stderr へ1行」を満たさず2行出る。承認済み実装イメージの構造(前置条件 → case による actas 判別 → stderr 通知 → return 1)は保存されており、逸脱ではなく要件充足のための必要条件と conductor は判断。§12a reviewer にも明示して判定を求めた。
- 2026-07-25T09:15Z — 作業を本線 main ではなくブランチ fix/1449-watcher-verification-applicability-guard 上で実施。別セッションのエージェントが本 intent を park した実測があり、工程記録を dcadcce17 でチェックポイント退避してからブランチを切った。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-25T09:50Z — FR-5 により検証ロジック本体(約120行)を到達不能のまま存置。#1476 で初期プロンプトを actas へ移行した時点でガードが自動的に真になり再有効化される設計。到達不能コードを一時的に残すコストより、#1476 での再実装コストを重く見た。ガードが「なぜ実行しないか」を stderr で表明するため検証劇場には当たらない。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-25T10:05Z — ガードのパターンマッチ `case "$CLAUDE_MONITOR_PROMPT" in *" actas "*)` が #1476 の actas プロンプト形を確実に捕捉するかは、#1476 側の実装形が確定するまで未確認。§12a reviewer に誤判定の穴の検査を依頼した。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
