# R005: skill 同期と検証

## 要求

- `dry-run` mode を追加する場合は、`skills/amadeus-discovery/SKILL.md` と `.agents/skills/amadeus-discovery/SKILL.md` を同期できる。
- 昇格先成果物への反映は `dev-scripts/promote-skill.ts` を使う。
- 必要な eval または text contract を追加または更新し、`dry-run` mode、出力項目、副作用禁止、`scaffold-only` との差分、consumer 境界を検出できる。

## 受け入れ条件

- source skill と昇格先成果物の両方で `dry-run` 契約を確認できる。
- 手動同期ではなく promote-skill を使った証拠が残っている。
- text contract または関連 eval が、追加した責務境界を検出できる。
- 対象 Intent の validator が pass している。

## 根拠

- [steering/policies.md](../../../steering/policies.md)
- [codebase-analysis.md](../codebase-analysis.md)
- [Issue #272](https://github.com/amadeus-dlc/amadeus/issues/272)

## 未確認事項

- 追加する eval 観点を `dev-scripts/evals/amadeus-templates/check.ts` に置くか、別の eval に分けるかは Construction で確認する。
