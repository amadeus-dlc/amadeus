# 依存：amadeus

## 外部依存

- Bun（実行環境）と Node.js / npm（scripts 入口）。
- codex / claude CLI（real provider の e2e と examples 生成だけが使う。mock CI は不要）。
- GitHub（Issue / PR 駆動の開発、CI、Bugbot レビュー）。
- 一次情報として awslabs/aidlc-workflows の v2 ブランチ（契約の互換元。実行時依存ではない）。

## 内部依存

この Intent に効く内部依存の向きは次である。

- `docs/amadeus/lifecycle/**`（契約） ← `skills/amadeus/references/stage-catalog.md` ← `lifecycle-v2.ts` の stageCatalog 定数。3 者は同じ対応表を持つ契約であり、片方だけ変えると validator か eval が fail する。
- `skills/**` → `.agents/skills/**`（promote-skill.ts 経由のみ） → `.claude/skills/**`（symlink）。
- `dev-scripts/examples-contract.ts` ← generator と wrapper の両方。成果物名の変更はここを起点に追従する。
- `dev-scripts/evals/amadeus-templates/check.ts` ← 各 skill の templates のファイル名と見出し。改名時に期待値の更新が必須。
- `examples/**` ← real provider 生成物。契約変更後は再生成が必須（`skill-provenance.json` の md5 照合が CI で効く）。
- `.amadeus/**`（自己開発 workspace） ← `amadeus` 入口、validator、IndexGenerate。workspace 構造の移行はこの 3 つと同時に進める必要がある。
