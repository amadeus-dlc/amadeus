# Tech Stack Decisions — harness-provenance

上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

## 決定

business-logic-model.mdとbusiness-rules.mdの実装には、requirements.mdとtechnology-stack.mdで実測済みの既存stackだけを使う。

| Concern | Selection | Rationale |
|---|---|---|
| Language | TypeScript ESM | 既存core toolsと型union/mappingを同じ言語で実装 |
| Runtime | Bun | 既存CLI、test、packaging実行基盤 |
| Filesystem/path | `node:fs` / `node:path` / `node:url` | 既存resolverが使用、新規dependency不要 |
| Test | `bun:test` + existing custom runner | unit/integration/CI分類を維持 |
| Static checks | TypeScript compiler + Biome | 既存typecheck/lint gate |
| Distribution | manifest-driven `scripts/package.ts` | 6 harnessへ同一coreを投影 |
| Self-install | existing `promote-self` flow | project-local配布面のdrift検査 |
| Persistence | existing Markdown state writer | database/schema service不要 |

## 新規導入しないもの

外部SDK、framework、database、cache service、telemetry backend、validation library、path libraryを追加しない。7値parseとown-key mappingは標準TypeScriptで十分である。

## Test placement

- pure parse/mapping/cache挙動は`tests/unit/`
- filesystem、CWD、subprocess、配布tree、intent birthは`tests/integration/`
- 全6配布形態のAC-3d caseはfresh subprocessを使い、unit allowlistへfilesystem testを混ぜない
- 既存`t144-harness-seam`の責務と重なるcaseは同テストを拡張し、重複fixtureを増やさない

## Distribution discipline

編集正本は`packages/framework/core/`だけとし、生成済みdist/self-installを手編集しない。実装後にpackage/promoteを実行し、両drift checkを通す。

## Reversibility

新規dependencyやpublic APIを増やさないため変更は局所的にrevert可能である。ただしstateのHarness fieldはユーザー可視契約なので、導入後の値集合変更はrequirements・docs・互換testを伴う別判断とする。
