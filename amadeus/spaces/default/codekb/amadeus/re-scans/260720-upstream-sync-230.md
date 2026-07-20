# Re-scan Record: 260720-upstream-sync-230

## 基本情報

- Date: 2026-07-20T06:43:32Z
- Repository: `amadeus`
- Base commit: `a326f47bc0146a3b4285552f42b92fd61fb343a7`
- Observed commit: `545e69c836d46f7bec2fa351c8e668026eb5fad5`
- Focus: upstream v2.2.0→v2.3.0 承認済み24 ADOPT/ADAPT（plugin/schema/package/compose/test/docs、6 harness 適応）

## Base 選定根拠

`git merge-base --is-ancestor a326f47bc0146a3b4285552f42b92fd61fb343a7 545e69c836d46f7bec2fa351c8e668026eb5fad5` は exit 0、距離は32コミット。次点 `591b6a2a` は距離84、他の新しい observed は非祖先（exit 1）のため除外した。共有 `reverse-engineering-timestamp.md` から base を逆算していない。

## 差分概要

- 差分: 865 files、`+48,636/-241`。大半は選挙 record、生成投影、工程記録であり、24項目の実装とは判定しない。
- 構成: core tools 30、hooks 11、agents 14、stages 32、sensors 5、harness 69 files/6面、TypeScript 621、tests 461（unit 216 / integration 159 / e2e 70 / smoke 14）。
- 検査: `package.ts --check` 6/6 PASS、`promote-self.ts --check --no-build` PASS、lint exit 0、typecheck exit 127（`tsc` 不在）、full tests 未実施。

## 24項目の判定

| # | 識別子 | 判定 |
|---:|---|---|
| 1 | bolt-dag-selfheal | MISSING |
| 2 | gate-revision-backstop | PARTIAL |
| 3 | swarm-batch-advance | EQUIVALENT 候補 |
| 4 | help-routing | MISSING |
| 5 | compose-pending-freshness | MISSING |
| 6 | recompose-autonomy-guard | MISSING |
| 7 | unit-kind-pruning | MISSING |
| 8 | unit-major-iteration | MISSING |
| 9 | scope-cost-preview | MISSING |
| 10 | gate-next-stage-naming | PARTIAL |
| 11 | nested-root-detection | MISSING |
| 12 | submodule-detection | MISSING |
| 13 | execpath-spawn | MISSING |
| 14 | kiro-ide-hook-context | PARTIAL |
| 15 | project-dir-quoting | MISSING |
| 16 | reviewer-date-persona | MISSING |
| 17 | reviewer-read-scope | MISSING |
| 18 | stage-schema-extensions | MISSING |
| 19 | packager-plugin-projection | MISSING |
| 20 | plugin-compose-hook | MISSING |
| 21 | test-pro-reference-plugin | MISSING |
| 22 | plugin-docs | MISSING |
| 23 | ported-tests | MISSING |
| 24 | docs-updates | PARTIAL |

file:line 根拠は `../architecture.md` の「24項目の構造判定」、検査結果と保守性は `../code-quality-assessment.md` の current view を真実源とする。

## 後続への引き継ぎ

- 縮小候補は item 3 のみ。回帰テストで upstream 契約との同等性を固定する。
- item 10 は state/audit 内部情報があっても directive に非投影のため PARTIAL を維持する。
- plugin は schema+Unit kind を root とし、packager→compose→reference plugin/docs の順で閉じる。
- upstream の4ハーネス前提を Amadeus の6ハーネスへ ADAPT し、packager 6面と self-install 4面の対象差を保つ。
- SKIP 6件（optional-produces、agent-model-key、learnings-memory-path、dist-trees、roadmap-html、upstream-changelog）は承認済み境界として保存する。
