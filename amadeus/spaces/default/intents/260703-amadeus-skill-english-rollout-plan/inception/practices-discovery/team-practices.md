# Team Practices：Amadeus skill 英語化実施計画

## プラクティス

| 領域 | プラクティス | 出典 |
|---|---|---|
| ブランチ戦略 | 作業 branch は最新の `origin/main` を基点に作る。 | `aidlc/spaces/default/memory/team.md` |
| ブランチ戦略 | Agent が作る branch は `codex/` prefix を既定にし、Issue 番号または目的を含める。 | `aidlc/spaces/default/memory/team.md` |
| ブランチ戦略 | PR merge 後は最新の `origin/main` に追従し、次の作業 branch を新しく作る。 | `aidlc/spaces/default/memory/team.md` |
| PR 単位 | PR は対応 Issue と対象 Intent をリンクし、タイトルと説明文は日本語で書く。 | `aidlc/spaces/default/memory/team.md` |
| PR 単位 | Ideation と Inception は phase ごとの PR を既定にする。 | `aidlc/spaces/default/memory/team.md` |
| PR 監視 | PR 作成後は CI を先に確認し、CI エラーを解消してから review comment を扱う。 | `aidlc/spaces/default/memory/team.md`、`AGENTS.md` |
| merge | merge 操作は人間が行う。Agent は merge しない。 | `aidlc/spaces/default/memory/team.md`、`AGENTS.md` |
| テスト | 標準検証は `npm run test:all` とする。 | `aidlc/spaces/default/memory/project.md`、`package.json` |
| CI | GitHub Actions の `CI / mock` が pull_request と main push で `npm run test:all` を実行する。 | `.github/workflows/ci.yaml` |
| 品質 | TypeScript は `tsc --noEmit` を通す。 | `aidlc/spaces/default/memory/project.md`、`package.json` |
| 品質 | public type file と TypeScript complexity を lint で検査する。 | `package.json` |
| skill 昇格 | `skills/amadeus*/` から `.agents/skills/amadeus*/` への反映は `dev-scripts/promote-skill.ts` を使う。 | `.agents/rules/amadeus-artifacts-and-examples.md`、`aidlc/spaces/default/memory/project.md` |
| 成果物 | `aidlc/**/*.md`、`skills/**/*.md`、`.agents/skills/**/*.md` は日本語で書く。 | `.agents/rules/amadeus-artifacts-and-examples.md` |
| 互換性 | 後方互換は既定では維持せず、現在の契約へ寄せる。 | `.agents/rules/backward-compatibility.md` |

## Issue #399 への適用

Issue #399 では、#395、#400、#401、#402 の子 Issue を順序付きで追跡する。

各子 Issue の PR は、対象 Issue、対象 Intent、変更範囲、検証結果を説明し、完了証拠は PR merge または明示的な Issue close とする。

skill 英語化に関係する PR では、source skill と昇格先 skill の同期を同一 PR に含め、昇格フローを使う。
