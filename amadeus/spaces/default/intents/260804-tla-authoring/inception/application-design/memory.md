<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-04T16:39:48Z — services.md の「サービス」を常駐プロセスではなく CLI + stage 実行の協調単位として定義した; 本 intent は常駐 service・AWS・DB を持たない制約（questions 冒頭）があり、stage テンプレートの service 観点（orchestration / 通信契約 / ライフサイクル）は CLI 協調に読み替えるのが要件に忠実と判断した
- 2026-08-04T16:39:48Z — 引き継ぎセッション（codex worktree → claude 本線 clone）での再開にあたり、回答済み questions ファイルを Step 3-4 完了の正本として扱い、質問を再提示しなかった; 全 4 問に人間承認タイムスタンプが記録済みのため

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-04T16:39:48Z — 支援ペルソナ amadeus-aws-platform-agent / amadeus-design-agent の観点は「追加クラウド資源・UI 面が不要であることの確認」としてのみ反映し、独立セクションを設けなかった; 対象外制約が requirements.md §8 で明示済みのため

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-04T16:39:48Z — staleness 判定を独立コンポーネントにせず C2 IdentityDigest へ統合した; staleness は identity 比較そのものであり、分離すると identity 定義の二重実装リスク（codekb の state integrity 節の教訓）を作るため
- 2026-08-04T16:39:48Z — evidence store の物理パス・receipt schema 本文は Functional Design へ送り、本 stage では contract（content-addressed、predecessor root marker、atomic 可視化点）だけを固定した; Standard depth の詳細度と NFR-004 の責務分離に合わせた
- 2026-08-04T17:05:00Z — レビュー iteration 1 の BLOCKER 対応で、hold 強制を新規 gate 機構でなく既存 engine advisory checkpoint（§11a）+ 新 C9 evaluator の組で設計した（ADR-6）; 同型停止機構の二重実装を避け engine 無変更で FR-003/FR-007 を強制できるため
- 2026-08-04T17:05:00Z — bundle digest は生成時刻を含む全 bytes を対象とし、冪等再実行（同一パス収束）の主張を撤回して完全性を優先した; 未参照 evidence は無害に残るため可視化点の原子性は損なわれない
- 2026-08-04T17:05:00Z — evidence store を specs/tla/ 配下から specs/tla-evidence/ へ移した; 既存 activation advisory の監視 glob（specs/tla/**）と衝突し「無変更」宣言の観測挙動を変えるというレビュー指摘のため

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-04T16:39:48Z — 未知題材 E2E fixture（FR-012、requirements §9-6）の選定は units-generation / functional-design で確定する; 実装単位の切り方に依存するため
- 2026-08-04T16:39:48Z — model-map.json への bundle 参照フィールド追加が既存 schema の version 影響を持つかは Functional Design で既存 exactObject 制約（amadeus-formal-verif-model-map.ts:186）を実読して確定する
