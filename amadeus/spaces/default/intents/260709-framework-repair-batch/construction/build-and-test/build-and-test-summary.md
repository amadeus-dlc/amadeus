# Build and Test Summary — framework-repair-batch

> 上流入力: 4 unit の code-generation-plan.md / code-summary.md(fix-656-installation-detect / fix-657-sensor-tsc / fix-641-hook-project-dir / fix-661-glossary-note)。実測結果は `build-test-results.md` を参照。

## テスト種別インベントリ(Test Strategy: Minimal)

- 生成した指示書: `build-instructions.md`、`unit-test-instructions.md`(Minimal 戦略の規定どおり unit のみ。integration/performance/security の指示書は生成しない — 対象4バグに NFR 性能・セキュリティ要件はなく、統合面は既存 t92/setup 統合テストが既にカバー)
- 回帰テスト実体は code-generation ステージで各 Bolt に実装・マージ済み: setup-installation / setup-upgrade / t202×2(センサーランチャー、worktree マーカー)

## unit ごとのカバレッジ期待

| unit | 回帰テスト | 検証状態 |
|---|---|---|
| fix-656-installation-detect(P0) | fixture ベース3ケース+BR-U07 E2E | 赤先行→緑、PR #673 CI pass、マージ済み |
| fix-657-sensor-tsc | t202 4ケース+t92 決定化 | 赤先行→緑、PR #679 CI pass、マージ済み |
| fix-641-hook-project-dir | t202 5+1 ケース+t07 非退行 | 赤先行→緑、PR #682 CI pass(是正込み)、マージ済み |
| fix-661-glossary-note | テスト新設なし(Q7=A、docs のみ) | 既存スイートグリーン維持、PR #672 CI pass、マージ済み |

## 準備状況評価

- **build-ready**: YES — 依存導入+4検証コマンド(typecheck/lint/dist:check/promote:self:check)すべて exit 0(実測、build-test-results.md)
- **test-ready**: YES — 全4 Bolt の回帰テストが main に取り込まれ、フルスイートで実行される
- **deployment-ready**: N/A — 本 intent はフレームワーク自体の修理で、リリースは release.yml の workflow_dispatch 一本(team.md)。本 intent ではバージョンバンプ・リリースは行わない

## 既知の制限・残項目

- t92 のローカル赤(bunx の TS 解決ドリフト)は fix-657 のマージで解消済み — ただし `node_modules` 不在の隔離環境では bunx フォールバックにより exit-1 になる(codex-engineer-3 のレビュー実測)。`bun install` 前提を満たすことが実行条件
- main 取り込み直後は `bun install` 再実行が必要(typecheck exit 127 の偽失敗を実測 — build-instructions.md 参照)
