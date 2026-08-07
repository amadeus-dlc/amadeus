# Performance Test Instructions — 260807-projectdir-worktree-fix

上流入力(consumes 全数): code-generation-plan、code-summary（変更範囲 = resolveProjectDir の梯子1段のみ、の出典）

## 適用外の宣言（cid:build-and-test:c4 — 検証劇場の禁止）

本 intent の承認済み要件（requirements.md NFR-1〜NFR-4）に**性能 NFR は存在しない**。Comprehensive 戦略でも、承認済み NFR と実在境界へ trace できない負荷試験・ベンチマークは機械追加しない（cid:build-and-test:bt-proportional-selection）。

- 適用外の根拠: 変更は `resolveProjectDir()` への同期・純関数的な1段追加（`findWorkspaceMarkerAncestor` は既存 canonical の再利用で、hook 梯子が同一述語を同一頻度で既に実行している）。プロセス起動経路で高々1回呼ばれる関数であり、応答時間・スループット要件を持つ利用者向けサービス面は存在しない

新たな性能試験は**作成しない**。この宣言が本成果物の実体である。

## 患部に対応する既存担保面

- `tests/run-tests.ts` の per-test timeout（30s）が異常な遅延をテスト面で捕捉する
- リポジトリの既存性能ゲート（t258 系 p95 等）は本変更のスコープ外の面であり無改変
