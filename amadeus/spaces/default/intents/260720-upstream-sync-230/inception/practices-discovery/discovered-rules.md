# Practices Discovery — Discovered Rules（260720-upstream-sync-230）

上流入力(consumes 全数): code-structure.md、technology-stack.md、dependencies.md、code-quality-assessment.md、architecture.md、business-overview.md

## 新規ルール候補

**0件。** evidence.md の5面は affirm 済みの `team.md` / `project.md` で全てカバーされる。plugin という新規配布面も Walking Skeleton、生成投影同期、実配布物検証、公開契約テストの既決ルールから機械的に扱えるため、差分ギャップはない。practices-discovery:c1 に従い質問は0件とする。

## 適用確認（本 intent が従う既決ルール）

- **Way of Working:** `main` 中心の短命 branch / Pull Request と、Construction Bolt 単位の分離を維持する。
- **Walking Skeleton:** plugin の schema → Unit kind → packager → compose → reference plugin/docs を最初の Construction Bolt で小さく end-to-end に閉じ、人間ゲート前に拡張しない。
- **Testing Posture:** TypeScript/Bun の既存テスト層を使い、公開契約、6ハーネス生成投影、self-install を包括的に検証する。新設ゲートには落ちる実証を要求する。
- **Deployment:** PR で version/tag/release notes/npm publish を変更せず、release は `release.yml` の手動 `workflow_dispatch` に限定する。
- **Code Style:** TypeScript/ESM と判別 union の Result、core と harness adapter の境界を維持する。
