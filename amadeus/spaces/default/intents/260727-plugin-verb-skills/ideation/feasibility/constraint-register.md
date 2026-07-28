# Constraint Register — 260727-plugin-verb-skills

上流入力(consumes 全数): intent-statement.md(スコープ境界と成功指標の導出元)

## 技術制約

| # | 制約 | 出典 | 影響 |
|---|---|---|---|
| C1 | 正本は `packages/framework/core/` / `packages/framework/harness/<name>/`。dist・self-install は `bun scripts/package.ts` + `bun run promote:self` で再生成し、同一変更で同期する | project.md Mandated | plugin handler/skill の全変更は正本編集+全面再生成が必須 |
| C2 | core 配下に repo-only の `scripts/<file>` パストークンを書かない(t258-boundary-guard) | project.md cid:code-generation:c1-1569-shipped-comment-vocab | handler 実装のコメント語彙に制約 |
| C3 | harness 専用ツールは core/tools に置かない(全 dist へ漏出するため) | project.md cid:code-generation:harness-tools-placement | `amadeus-plugin.ts` は全ハーネス共通なので core 継続で正。スキルは Claude 表層(`.claude/skills/`)に置く |
| C4 | 新規 utility handler は `docs/reference/11-contributing.md`「Adding a Utility Handler」チェックリスト準拠 | project.md Decided | usage 文・case・テストの追加漏れ防止 |
| C5 | CI 基準: `typecheck` / `lint` / `dist:check` / `promote:self:check` / `tests --ci` + coverage patch / complexity / t129 runner drift guard | project.md Testing Posture | 新規 handler 行は in-process seam でカバー(bun-coverage-spawn-blindspot)。utility.ts の case 追加は complexity baseline に注意(complexity-baseline-ordinal) |
| C6 | compose の trust 境界(承認ゲート・O_NOFOLLOW digest 再検証の三層)は変更しない | intent-statement スコープ境界 + cid:code-generation:c8-tla-plugin-trust-layers | install verb は既存 compose 経路への委譲のみ |
| C7 | docs は EN/JA 対訳を同一変更で同期。散文の件数語は隣接列挙原則に従い count-free | project.md Mandated + cid:functional-design:c3-adjacent-enum-numerals | 19-plugins EN/JA の入口更新 |
| C8 | リリース・バージョンバンプは release.yml のみ。PR ではバージョン面に触れない | project.md Mandated | 本 intent はバージョン非接触 |

## 運用制約

- ソロモード(AMADEUS_OPERATING_MODE 未設定): 選挙は適用外、未決はユーザーエスカレーション。PR マージは人間承認(no-AI-merge)
- Construction Bolt は git worktree 分離で実装(cid:code-generation:solo-bolt-worktree-required)
- walking-skeleton: `amadeus-feature` スコープは既存コード変更でも最初の Bolt にゲート維持(project.md Mandated)
