# Skill Matrix（260705-github-kanban-sync）

上流入力: [intent-backlog.md](../scope-definition/intent-backlog.md)

## 必要スキルと充足状況

| スキル | 必要とする proto-Unit | 充足 | 根拠 |
|---|---|---|---|
| Bun + TypeScript（TDD） | P1、P2、P3 | 充足 | dev-scripts 群の既存実装実績（promote-skill.ts、parity-check.ts など） |
| `intents.json` / `aidlc-state.md` の構造理解 | P1、P2 | 充足 | エンジンツールと validator の開発実績。読み取り専用で使う（C02） |
| gh CLI と GraphQL（ProjectsV2） | P2 | 充足 | `gh api graphql` の利用は既存知識で足りる。1 呼び出し 1 フィールド制約の回避は C04 で確定済み |
| hooks 基盤（PostToolUse / Stop / SessionEnd、hooks-health） | P3 | 充足 | 既存 hook 群（amadeus-audit-logger.ts など）と同型で作る |

## ギャップ

スキルギャップはない。
環境ギャップが 2 件ある: `project` scope 付与（raid-log.md I01）と org project 作成権限の確認（feasibility の open question）。いずれも Maintainer の人間操作である。
