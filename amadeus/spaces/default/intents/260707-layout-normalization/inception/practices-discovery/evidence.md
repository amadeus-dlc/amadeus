# Evidence

## Sources Scanned

- `code-structure`: root `core/`, `harness/`, `scripts/`, `dist/`, tests, docs の path impact を確認した。
- `technology-stack`: Bun、TypeScript、Biome、GitHub Actions、root package scripts の layout coupling を確認した。
- `dependencies`: package script、manifest、dist、runtime install target、tests/docs/CI の内部依存を確認した。
- `code-quality-assessment`: `dist:check`、`promote:self:check`、typecheck、lint、test runner の品質ゲートを確認した。
- `architecture`: one-core-many-harnesses と packaging/self-promotion transaction を確認した。
- `business-overview`: Issue #610 が実装ではなく workspace/package layout decision であることを確認した。
- `package.json`: `dist`, `dist:check`, `promote:self`, `promote:self:check`, `typecheck`, `lint`, `check` の root script contract を確認した。
- `.github/workflows/ci.yml`: typecheck、lint、dist drift guard、self-install drift guard、smoke/unit/integration tests が CI で実行されることを確認した。
- `amadeus/spaces/default/memory/team.md` と `project.md`: 既存の team/project practices と installer 系の affirmed rules を確認した。

## Findings

Way of Working は短命ブランチと Pull Request、Amadeus artifact の checkpoint commit、intent 外の課題を GitHub Issue として記録する運用が既に記録されている。今回の layout-normalization では `packages/setup` を sibling intent として扱う方針がユーザーから明示された。

Walking Skeleton は既存 framework への設計 intent では原則不要である。ただし、移行実装へ進む場合は最初の Bolt を小さな path abstraction または compatibility check として gate するのが既存 team practice と整合する。

Testing Posture は root package scripts と CI が明確である。特に `dist:check` と `promote:self:check` は layout decision の中心的な drift guard であり、移行案では壊してはいけない。

Deployment は runtime deploy ではなく release readiness と distribution parity の問題である。GitHub Actions の check job がこの repository の現行 gate である。

Code Style は TypeScript/ESM、Bun direct execution、Biome lint、`core/` と `harness/<name>/` の境界維持が根拠として確認できた。Markdown は日本語で作成するが、tool contract の heading と code/path identifier は保持する必要がある。

## Asked

追加の gap interview は行わなかった。既存 memory と CodeKB が五領域を満たしており、この stage の人間確認は affirmation gate で行う。
