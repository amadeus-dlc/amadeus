# Rollback Runbook — harness-provenance

上流入力(consumes 全数): `ci-config`、`quality-gates`、`deployment-architecture`、`cicd-pipeline`。

## Trigger

次のいずれかでrollbackを検討する。

- 新規intent birthが失敗する
- `Harness`が固定7値以外、重複、誤った優先順位で記録される
- raw overrideがstate / memory / audit / stdout / stderrへ漏れる
- Harness付きV7 stateを既存reader/validatorが読めない
- dist/self-install driftまたはrelease artifact不整合が発生する

既存transitive dependency advisoryやClaude substrate credential不在skipは、本変更のrollback triggerではない。

## Safety constraints

- `main`履歴rewrite、force push、branch protection緩和、npm同一version上書き、既存stateの`Harness`削除を行わない。
- published npm versionはunpublishで消さず、通常PRのrevertと新しいpatch versionで置き換える。
- Harness付きV7の互換testが赤ならcode rollbackを止め、非破壊reader互換修正を先行する。
- rollback PRも`ci-config`と`quality-gates`の全blocking gateを通す。

## Procedure

1. 影響version、commit SHA、発生条件、affected harnessを記録する。
2. 通常branchで機能commitを`git revert`する。関連しない変更を巻き戻さない。
3. 正本`packages/framework/core/`をrevert後、`bun scripts/package.ts`と`bun run promote:self`で生成面を再同期する。
4. `bun run typecheck`、`bun run lint`、`bun run dist:check`、`bun run promote:self:check`を実行する。
5. focused testと`bun run test:ci`を実行する。
6. Harness付きV7 fixtureが既存reader/validator/通常intent操作で読めることを確認する。fieldは保持する。
7. PR review READY、CI Success、ユーザー承認後にsquash mergeする。
8. 既にnpm publish済みなら、`.github/workflows/release.yml`を人間がdispatchして新しいpatch versionをpublishする。
9. registry propagation後に新versionのinstallとintent birthを確認する。

## Verification matrix

| 面 | 合格条件 |
|---|---|
| Source | detector/recorder差分だけがrevertされる |
| Generated trees | dist/self-install drift 0 |
| Existing data | Harness付きV7を破壊せず読み続ける |
| New birth | revert後の契約どおり動作する |
| Audit/privacy | raw override漏洩なし |
| Published package | 新patch versionが取得可能、問題versionは履歴として識別可能 |

## Stop and escalate

state互換failure、revert conflict、secret漏洩、npm provenance不整合、意図しないversion/tag変更があれば停止する。ユーザーへ対象SHA・version・failure実文・回復可能性を提示し、追加承認なしに履歴rewriteやartifact削除へ進まない。

## Ownership

rollback PRとrelease dispatchはleaderが実測結果を揃えてユーザー承認を得た後に実行する。P1/P2相当の障害なら、team ruleに従いtimeline、root cause、corrective actionを含むpost-incident reviewを残す。
