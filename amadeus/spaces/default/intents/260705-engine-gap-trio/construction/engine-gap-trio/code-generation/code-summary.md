# Code Summary — engine-gap-trio（Issue #478）

上流入力: [code-generation-plan.md](code-generation-plan.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更内容

| ファイル | 変更 | 対応 |
|---|---|---|
| `.agents/amadeus/tools/amadeus-audit.ts` | audit-fork の prefix 再入（wt ⊆ main のみ許可、分岐は DIVERGED で拒否、再入は `Reentrant: true` を記録） | R101〜R103 |
| `.agents/amadeus/tools/amadeus-lib.ts` | `normalizeWorktreeSlug` 新設、`worktreePath` と `validateBoltSlug` が経由 | R201 |
| `.agents/amadeus/tools/amadeus-worktree.ts` / `amadeus-state.ts` | 各 `validateSlug` を同関数経由の正規化受理へ | R201 / R202 |
| `skills/amadeus-validator/validator/{aidlc-state-contract,lifecycle-v2}.ts` + 昇格先 | 連続 `Per unit:` 行を集合として解釈し、per-unit の produces / 必須成果物検査を全 unit 対象へ | R301〜R303 |
| `dev-scripts/data/parity-map.json` | engineFileExceptions へ `tools/aidlc-audit.ts`、`tools/aidlc-worktree.ts` を追加（state / lib は宣言済み） | N3 |
| `dev-scripts/evals/engine-gap-trio/check.ts` + `package.json` | 11 検査の eval を新設し `test:it:all` へ結線 | N1 / N2 |

## TDD の記録

- RED: 修正前に gap1 = 再入拒否 4 件、gap2 = 形式拒否 1 件、gap3 = 欠落見逃し 1 件の失敗を確認。
- GREEN: 11 検査 ok。`npm run test:all` exit 0（promote-skill eval を含む）。
- reviewer C1（state fork の独立 validator 見逃し）を受けて正規化を 3 系統一本化し、フルチェーン検査を追加した。
