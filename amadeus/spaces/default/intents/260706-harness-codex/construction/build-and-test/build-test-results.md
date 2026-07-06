# Build and Test Results

Unit: u001-harness-codex
実施日: 2026-07-06（UTC）
実施環境: engineer4 worktree（branch: eng4/issue-552-harness-codex、基点 origin/main = 29f3122c = PR #559 反映後）
検証対象: code-generation の実装（内訳は [code-generation-plan.md](../u001-harness-codex/code-generation/code-generation-plan.md) と [code-summary.md](../u001-harness-codex/code-generation/code-summary.md) を参照）

## 結果

| 検証 | コマンド | 結果 |
|---|---|---|
| repo 標準検証 | `npm run test:all` | pass（exit 0。gate 直前に fresh 再実行） |
| promote 昇格 | `npm run test:it:promote-skill` + 38 skill ループ | pass / 38 fail 0 |
| parity | `npm run parity:check` | ok（yaml 追加は非照合 = FR-6.2 確認） |
| 旧名検出 | rename-leftovers（scanRoots + harness） | pass（新検出器が実検出 → 修正 → pass の RED→GREEN 実証込み） |
| 言語方針（FR-6.3） | skill-language-policy 31/88 行の適用規則照合 | 同期義務は発火しない（guard のみ・SKILL.md 不変更） |
| record 構造検証 | AmadeusValidator（Intent 指定込み） | pass（不足・矛盾なし） |
| 実装レビュー | reviewer（architecture）iteration 1 | READY（38×2 全件突合、検証の独立再現、surgical 0 逸脱） |

## 特記事項

- 純正性検証（#541）: 上流 38 件が全件同一（sha256 = a1499d95...）で guard のみ。A-1 成立。照合結果と再取り込み手順は harness/codex/provenance.md に記録。
- allowlist.json の編集で一度 json.dump 再整形を仕掛けたが即 revert し、外科的 +1 行 diff へ修正（diary 記録済み）。
