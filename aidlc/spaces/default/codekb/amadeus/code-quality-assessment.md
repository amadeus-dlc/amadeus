# コード品質評価：amadeus

## 検証の状態

CI 相当の入口は `npm run test:all` である。

この入口は、次の検査を含む。

- TypeScript typecheck。
- public type file と TypeScript complexity の lint。
- skill contract の整合検査。
- Claude wiring の整合検査。
- validator、template、contract、migration などの integration eval。
- steering と event-storming の mock e2e。
- examples snapshot と provenance の検査。
- `git diff --check`。

## 強み

- Amadeus DLC 成果物は `amadeus-validator` で構造検証できる。
- examples は段階別 snapshot と provenance を持つため、skill 変更の影響を検出しやすい。
- source skill と昇格先 skill の同期は `promote-skill.ts` に集約されている。
- AGENTS.md と memory/team.md に PR 監視、merge 権限、人間 gate の運用が記録されている。

## リスク

| リスク | 影響 | 緩和 |
|---|---|---|
| source skill と昇格先 skill のずれ | 配布先で使う skill と変更対象の source skill が不整合になる。 | 昇格フローを使い、同一 PR で扱う。 |
| 成果物名と validator 契約のずれ | validator や examples 検証が fail する。 | stage catalog、templates、validator、examples を同時に確認する。 |
| Issue と Intent の対応喪失 | 親 Issue の完了判断ができなくなる。 | Intent traceability と PR 説明に対象 Issue を記録する。 |
| PR コメント対応漏れ | merge 準備が不十分になる。 | CI を先に確認し、トップレベルコメントとインラインコメントを監視する。 |

## Issue #399 での注意点

英語化と意味変更を同じ PR に混ぜると、Reviewer が差分の主旨を判断しにくい。

小さい土台 PR から進め、翻訳変更、意味変更、昇格フロー、検証結果を PR 説明で分けて記録する必要がある。
