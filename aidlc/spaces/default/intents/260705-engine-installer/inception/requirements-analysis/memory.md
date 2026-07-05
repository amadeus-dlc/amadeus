<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-05T19:40:00Z — 残実装判断 O1〜O3 はピア協議（回答 3 件全員一致、補足 = eval 双方向検査 / hooks 順序保持 + 再読込検証 / 必須 env なしの現物裏取り）で確定し、FR-1.4 / FR-1.6 / FR-2.6 / FR-2.7 とスクリプト命名（scripts/amadeus-install.ts、amadeus:install、dev-scripts/evals/installer/）に反映した。
- 2026-07-05T19:40:00Z — R-2（既存実体 dir との衝突）の処置は「上書きせずエラー中断 + 回復案内」の安全側とした（FR-1.5）。上書き更新型（D5）は「インストーラが管理する対象の再実行収束」を意味し、symlink であるべき場所に利用者の実体がある異常系まで無言で置換する趣旨ではないと解釈した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-05T19:58:00Z — reviewer iteration 2 は NOT-READY（blocking 2 = FR-1.8 の「何も変更せず」が逐次実行と矛盾・FR-1.1 事前チェックの eval 欠落、minor 1 = 回復案内の書き分け）。reviewer_max_iterations = 2 に達したため 3 回目の reviewer 起動は行わず、3 件すべてを修正した上で gate の人間承認に修正内容を明示して確定を委ねる（stage-protocol の iterations exhausted 時の proceed 規定）。修正: FR-1.8 = ロールバック非要求・適用済み工程の残存許容・衝突対象の無傷保証と明確化、FR-2.9 = 検証対象の限定を明記、FR-2.10 = 事前チェック 3 パターンの eval 新設、FR-1.1 = 回復案内を事前チェック失敗（--target 修正）と工程中失敗（再実行で収束）に書き分け。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-05T19:50:00Z — reviewer iteration 1 は NOT-READY（完全性 2 = npm script 登録の FR 欠落・不正 JSON 時の挙動未定義、テスト可能性 2 = エラー中断パスの eval 未定義・hooks 順序保持の検証未明記、明確化 3 = 冪等性とエラーパスの関係・D4 引用・target 事前チェック）。全 7 件を反映した: FR-1.1（target 事前チェック）、FR-1.6（不正 JSON はエラー中断・非破壊）、FR-1.8（エラー中断は「壊れない」の一形態と明確化）、FR-1.11（amadeus:install 登録）、FR-2.7（順序保持検証）、FR-2.9（非破壊性検証）、FR-1 見出し（D4 引用）。reviewer は FR-1.5 のエラー中断方針を「D5 と矛盾せず R-2 を埋める健全な補完」と判定済み。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
