# Code Generation Plan — engine-gap-trio（Issue #478）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 計画（TDD）

1. RED: `dev-scripts/evals/engine-gap-trio/check.ts`（隔離 workspace 実 CLI、11 検査）を追加し、修正前のエンジン・validator で失敗を確認する（gap1: 再入拒否、gap2: 大文字 slug の形式拒否、gap3: 欠落 unit の見逃し）。
2. GREEN（gap1）: audit-fork に prefix 再入経路（`main.startsWith(wt)` の方向のみ、R101/R102）と Reentrant フィールド（R103）を実装する。
3. GREEN（gap2）: `amadeus-lib.ts` に `normalizeWorktreeSlug` を新設し、`worktreePath` / worktree `validateSlug` / state `validateSlug` / `validateBoltSlug` の全 slug 境界を同関数へ一本化する（R201/R202、reviewer C1）。
4. GREEN（gap3）: validator（skills 正準ソース）の `Per unit:` 解釈を連続行の集合へ拡張し、per-unit 検査を全 unit 対象にする（R301/R302）。`promote-skill.ts --replace` で昇格。
5. 検証: eval 11 検査 GREEN、`npm run test:all` exit 0、parity 宣言 2 件追加。

## PR 分割（粒度制約）

- PR-A（エンジン）: amadeus-{lib,audit,worktree,state}.ts + parity-map + eval（gap1/gap2 部）+ record 一式。
- PR-B（validator skill、PR-A ベース）: skills/amadeus-validator + 昇格先 + eval への gap3 検査追加。eval 追加は「validator 修正なしでは RED になる」不可分な検証として PR 説明に記録する。
