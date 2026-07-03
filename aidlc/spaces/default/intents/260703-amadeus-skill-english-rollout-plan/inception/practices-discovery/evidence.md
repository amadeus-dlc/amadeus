# Evidence：Amadeus skill 英語化実施計画

## 根拠

| 対象 | 証拠 | 場所 |
|---|---|---|
| 最新 `origin/main` 基点の branch 作成 | Branch Lifecycle の基準 branch と branch 名規則。 | `aidlc/spaces/default/memory/team.md` |
| PR 説明に対象 Issue、Intent、検証結果を含める | PR 作成節の説明項目。 | `aidlc/spaces/default/memory/team.md` |
| PR 監視で CI を先に確認する | PR 監視節と AGENTS.md の Pull Request のモニタリング規則。 | `aidlc/spaces/default/memory/team.md`、`AGENTS.md` |
| merge は人間が行う | merge 節と AGENTS.md のマージ操作規則。 | `aidlc/spaces/default/memory/team.md`、`AGENTS.md` |
| 標準検証は `npm run test:all` | 開発標準と package scripts。 | `aidlc/spaces/default/memory/project.md`、`package.json` |
| CI の pull_request トリガー | `pull_request` と main push で `npm run test:all` を実行する。 | `.github/workflows/ci.yaml` |
| TypeScript typecheck | `typecheck` script が `tsc --noEmit` を実行する。 | `package.json` |
| lint と品質基準 | `lint:check` が public type file と TypeScript complexity を検査する。 | `package.json` |
| skill 昇格 | `dev-scripts/promote-skill.ts <skill-name> --replace` を使う。 | `.agents/rules/amadeus-artifacts-and-examples.md` |
| 日本語成果物 | `aidlc/**/*.md`、`skills/**/*.md`、`.agents/skills/**/*.md` は日本語で書く。 | `.agents/rules/amadeus-artifacts-and-examples.md` |
| 後方互換 | 既定では維持しない。 | `.agents/rules/backward-compatibility.md` |
| Issue #399 の子 Issue 順序 | Ideation の Scope Definition で #395、#400、#401、#402 の順序を確定した。 | `aidlc/spaces/default/intents/260703-amadeus-skill-english-rollout-plan/ideation/scope-definition/scope-document.md` |
| Issue #399 の完了証拠 | 子 Issue の完了は対応 PR の merge または Issue close で観測する。 | `aidlc/spaces/default/intents/260703-amadeus-skill-english-rollout-plan/ideation/decisions/D003-completion-evidence.md` |
