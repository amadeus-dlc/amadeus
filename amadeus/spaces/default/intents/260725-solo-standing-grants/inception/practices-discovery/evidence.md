# Practices Discovery Evidence

## Scanned Inputs

- `amadeus/spaces/default/codekb/amadeus/code-structure.md`
- `amadeus/spaces/default/codekb/amadeus/technology-stack.md`
- `amadeus/spaces/default/codekb/amadeus/dependencies.md`
- `amadeus/spaces/default/codekb/amadeus/code-quality-assessment.md`
- `amadeus/spaces/default/codekb/amadeus/architecture.md`
- `amadeus/spaces/default/codekb/amadeus/business-overview.md`
- `amadeus/spaces/default/memory/{org,team,project}.md`
- `.github/workflows/{ci,release}.yml`、`package.json`、直近40コミット

## Pipeline & Deploy Finding

`main` への短命 Pull Request が中心で、直近履歴には feature / fix / test と intent checkpoint が分離して現れる。CI は typecheck、Biome、complexity、dist / self-install drift、smoke / unit / integration を blocking とし、release は `workflow_dispatch` からのみ version、tag、GitHub Release、npm publish を進める。環境 topology は application staging / production ではなく、GitHub Actions と npm registry を配布境界とする。

## Quality Finding

既存姿勢は tests-alongside / regression-first で、厳密な TDD は履歴から立証できない。テストは unit 269、integration 232、e2e 80、smoke 14 files、test / source LOC 比は 1.37。coverage、CI、関連回帰の詳細から、Issue #1466 では directive carrier、lock 内 exact-ID 再検証、route 後の expiry / revoke / scope change、fallback 時の state・audit 不変、team / phase boundary / walking skeleton / per-unit 非回帰を blocking test にする必要がある。

## Developer Finding

責務は `amadeus-directive.ts` の型・closed validator、`amadeus-orchestrate.ts` の route / report、`amadeus-state.ts` の lock 内 transition、`amadeus-lib.ts` の grant domain predicate、`amadeus-audit.ts` の append-only persistence に分離される。期待される fallback には既存の判別 union を使う余地があり、fatal `error()` は `ERROR_LOGGED` を伴うため不適切である。canonical source を変更し、`scripts/package.ts` と `promote-self.ts` で6 harness / 4 self-install面を同期する。

## DevSecOps Finding

CI は最小 `permissions: contents: read` と release 専用の限定 GitHub App token / npm provenance を使う。一方、専用 SAST、dependency vulnerability scan、secret scan は現行 workflow から確認できない。今回の認可境界では issuer `HUMAN_TURN` provenance、protected audit event mint guard、Grant Id substitution 防止、lock 内再検証、fail-closed scope 判定を security regression として unit / integration test に固定する。

## Interview Resolution

Way of Working、Testing Posture、Deployment、Code Style は既存の affirmed practices と証拠が一致したため再質問しなかった。Walking Skeleton のみ、既存コード変更を `amadeus-feature` で扱う今回の stance を確認し、ユーザーは「現行規則を維持する」を選択した。
