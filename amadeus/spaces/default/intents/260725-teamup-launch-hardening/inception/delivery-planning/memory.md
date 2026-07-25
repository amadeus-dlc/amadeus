<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-25T13:50Z — Bolt 1 内部で B-3(検証を mux_attach 後ろへ)を先頭に置くのは作業順ではなく**リスク制御**である。B-1/B-2(actas 移行)を先に入れると watcher_verification_applies が真を返すようになり、mux_attach 前で 32.2秒/1メンバーの待機が発生する。前 intent が解消した問題がコミット単位で一時復活する窓ができるため、B-3 を先に入れてその窓を消す。
- 2026-07-25T13:50Z — walking-skeleton は適用しない。スコープは amadeus-feature だが変更対象は既存 bash スクリプトへの改変で、ブートストラップすべき新パッケージ・新配布経路がない(project.md § Walking Skeleton は greenfield 要素を含む intent でのみスケルトンを要求)。
- 2026-07-25T13:50Z — 自律性モードは gated。ソロモード運用のため各 Bolt でユーザー承認を取る。org.md のラダープロンプトは walking-skeleton 実行時のものであり本 intent は該当しない。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-25T13:50Z — team-allocation に**所要時間の見積りを置かなかった**。approval-handoff で確約したとおり named mob も稼働時間の前提も存在しないため、スケジュールを数値で約束しない(cid:approval-handoff:c3)。順序と依存のみを確定した。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-25T13:50Z — 依存辺ゼロなので理論上は並行実装できるが、同一ファイルの配布同期(11コピー)と定数ブロックへの両ユニット追記が交差するため直列化した(cid:code-generation:c6)。並行による時間短縮より、rebase 衝突と再生成の手戻りを避ける方を採った。
- 2026-07-25T13:50Z — external-dependency-map で agmsg が repo 外・バージョン管理外である点をリスクとして明記した。ピン留めできないため、ADR-5(検証を attach 後へ)が偶然にも緩和になっている — agmsg 側の変化で検証が壊れても利用者はアタッチして作業できる。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-25T13:50Z — R-2(actas 排他ロックの7メンバー競合)と R-3(受信範囲制限)は construction まで未検証のまま持ち越す。中断条件として risk-and-sequencing-rationale に明記し、顕在化時は intent-capture Q2 裁定 B(別 readiness 指標へ切替)の発動をユーザーへ諮る。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
