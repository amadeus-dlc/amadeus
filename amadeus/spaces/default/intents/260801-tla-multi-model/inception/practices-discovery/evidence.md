# Evidence — 260801-tla-multi-model(practices-discovery)

上流入力(consumes 全数): `team-practices.md`、`discovered-rules.md`、4スキャン報告

## エビデンス索引

- ブランチ戦略: org.md:7 / team.md:47-49、`git log --merges --since="7 days ago" main` = 0件(pipeline-deploy スキャン)
- CI ゲート: ci.yml Tests ジョブ(ci.yml:192-223)、ci-success 集約(:612-691)、coverage 2ゲート(tests/coverage-project-gate.ts / coverage-patch-gate.ts)(quality スキャン)
- lint: biome.json(formatter 無効・complexity warn)+ ci.yml:93-143(devsecops スキャン)
- サプライチェーン: bun install --frozen-lockfile 全ジョブ、bun 1.3.13 / lizard 1.23.0 ピン(devsecops スキャン)
- コード規範: .kimi-code/knowledge/amadeus-developer-agent/code-generation-patterns.md / code-generation-guide.md(developer スキャン)
- リリース: release.yml(workflow_dispatch + v* タグ)、v0.1.0→v0.1.7(3週間で8件)(pipeline-deploy スキャン)

## practices-discovery-timestamp

- 実施日: 2026-08-01
- observed: `33e196b80`(RE と同一断面)
- 方式: brownfield 4スキャン並列 + ギャップのみインタビュー(Q1 walking-skeleton stance)
