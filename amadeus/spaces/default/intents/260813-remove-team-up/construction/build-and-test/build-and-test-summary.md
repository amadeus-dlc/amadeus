# Build & Test Summary — 260813-remove-team-up

上流入力(consumes 全数): `construction/remove-team-up/code-generation/code-generation-plan.md`(unit `remove-team-up` の Step 1〜8)、`construction/remove-team-up/code-generation/code-summary.md`(変更ファイルと当時の検証)。

- Depth: Minimal — 状態表 1 つと readiness 行。詳細は `build-test-results.md` を正とする。
- 対象 unit: `remove-team-up` の 1 件(self-fix、units-generation SKIP)。

## 状態表

| 項目 | 状態 | 根拠 |
|---|---|---|
| ビルド(typecheck / lint / build) | ✅ exit 0 / 0 / 0 | 本ステージ再実測 |
| 対象テスト(absence + t226 + t414 unit/integration) | ✅ 67 pass / 0 fail(修復後) | 本ステージ。初回は glob 自己一致で 1 fail → 修復 |
| ランチャ正本 / self-install | ✅ 不在 | `git ls-files` 空、`.claude/tools/team-up.sh` 不在 |
| 性能試験 | 適用外 | performance-test-instructions.md |
| セキュリティ専用試験 | 適用外 | security-test-instructions.md |
| PR | 作成済 #2975 | `pr-convergence-report.md` kind: created |

## テスト種別インベントリ

| 種別 | 生成 | 理由 |
|---|---|---|
| unit | ✅ | NFR-1 不在回帰と glossary 投影 |
| integration | ✅ | doctor(FR-4)と glossary write/check(FR-5)、build 後の配送面(FR-6) |
| performance | 適用外 | 数値性能 NFR 不在 |
| security | 適用外(専用試験) | セキュリティ NFR 不在。隣接契約は不在回帰と doctor |

## Readiness

**build-ready / test-ready。** FR-1〜FR-8・NFR-1〜NFR-3 の受け入れに本ステージの fresh evidence がある。deployment-ready は PR 収束(pr-convergence)後。フルスイート `--ci` の本 tree 完走は未実施(申し送り)。
