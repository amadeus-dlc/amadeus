# Phase Check — Construction (260726-promote-self-hooks)

上流入力 (consumes 全数): code-generation-plan.md, code-summary.md, build-instructions.md, unit-test-instructions.md, integration-test-instructions.md, performance-test-instructions.md, security-test-instructions.md, build-and-test-summary.md, build-test-results.md

## 検証結果 (実測 2026-07-26T14:25Z)

| 検査 | 結果 | 根拠 |
|---|---|---|
| 成果物実在 | PASS | code-generation 2件 (plan/summary) + build-and-test 7件の実在を確認 |
| 宣言センサー | PASS | `.amadeus-sensors/` に SENSOR_FAILED なし。linter/type-check センサー対象の TS 変更は build で実検証済 (typecheck PASS / lint exit 0) |
| ビルド検証 | PASS | typecheck / lint / dist 再生成 (7ハーネス) / dist:check / promote-self --apply / promote:self:check すべて green (build-test-results.md) |
| 全量テスト | PASS | `tests/run-tests.sh --ci`: 573 files / 8017 assertions / 0 failed |
| 要件トレーサビリティ | PASS | FR-1 → t299 4経路 + promote-self --apply 実地発火 (実 config に冪等 noop)。FR-2 → t-kimi-doctor-arm 3ケース。FR-3 → テスト新設/更新 + 全量スイート green。Q1-Q4 裁定との整合を code-summary.md で確認 |
| フェーズ内整合 | PASS | code-generation-plan の Step 1-6 すべて [x]、計画からの乖離1件 (t299 の integration 配置) はサイズ規約由来で記録済 |

## 人間承認の記録

- code-generation: 生成サブエージェントの無断完了 (§12a・ゲート跳过) をユーザーが成果精査のうえ**追認** (2026-07-26、QUESTION_ANSWERED 記録済)。再発防止ルールを §13 で永続化 (cg-subagent-state-mutation-ban)
- build-and-test: 本フェーズチェック後にゲート提示

## Operation への引き継ぎ宣言

- bugfix スコープに Operation フェーズのステージはなく、build-and-test 承認でワークフロー完了。残作業: bolt マージ (amadeus-bolt complete --merge) とワークスペース成果物 (codekb / intent record / .kimi-code scope レジストリ修復分) のコミット
- OQ-1 (managed block 消失シナリオの犯人追跡) は別 intent 候補として観察継続
