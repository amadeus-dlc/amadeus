# Discovered Rules — 260720-formal-verif-experiment

上流入力: `code-structure.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、`architecture.md`、`business-overview.md`。

## Mandated

<!-- 新しい team/project 横断の ALWAYS ルールは0件。 -->

## Forbidden

<!-- 新しい team/project 横断の NEVER ルールは0件。 -->

## Gap Disposition

- 既存 practices と一致: 短命 PR + squash、test-co-development / regression-first、blocking CI、人間起点 release、TypeScript/ESM・責務分離・判別 `Result`。
- intent の後続設計へ送る: 欠陥母数5/6の正準化、TLA/TLC version/取得/timeout、PBT arbitrary と counterexample 保存、二時刻型、外部基盤の skip 契約、defect universe 全件 gate。
- 別途保守候補: SAST、secret scan、dependency vulnerability scan、dependency-update automation、Action SHA pin、SBOM、未使用 OIDC。今回の形式検証実験の practice 変更には含めない。
