# Tech Stack Decisions — harness-hook-correctness

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。U07はbrownfieldの既存choke pointを是正するため、技術追加ではなく現行stackの維持を決定する。

## 採用する既存stack

| Concern | Decision | Rationale |
|---|---|---|
| Runtime | Bun 1.3.13と`process.execPath` | adapterを実際に起動したruntimeを再利用し、PATH依存とruntime discoveryを除く。 |
| Language | TypeScript ESM | 既存core/harness/hooks/testsと同じ型・module境界を保つ。 |
| Process boundary | 既存`node:child_process`相当のargv型spawn seam | shell command文字列の組立てを増やさず、stdin/stdout/stderr/cwd/exitを明示的に保存できる。 |
| Payload handling | `unknown`入力からの既存adapter内判別union | host固有型をcoreへ漏らさず、unknown/failed eventをfail-closedにできる。 |
| Packaging | `scripts/package.ts`のmanifest-driven 6 harness projection | `packages/framework/`を正本とし、dist手編集を禁止できる。 |
| Self-install | 既存`scripts/promote-self.ts` closed list 4面 | 配布面とself-install面を混同せず、対象拡張を防ぐ。 |
| Testing | `bun:test`、既存unit/integration/e2e runner | 実filesystem・child process境界をintegration-firstで検証できる。 |
| Static checks | TypeScript typecheck、Biome lint、dist/self-install drift checks | repository既存gateを再利用し、新しいtoolchainを増やさない。 |

公開seamは`spawnHookWithRuntime(args, input)`、`parseKiroIdeHookContext(payload)`、`renderClaudeHookCommand(projectDirVariable, hook)`の正準3関数に限定する。具体型とsignatureはFunctional Designを正本とし、本成果物で追加具体化しない。

## 追加しない技術

- 新runtime dependency、package、daemon、network client、database、cache、queue、cloud infrastructure。
- PATH fallback、別runtime discovery、shell wrapper、汎用command execution API。
- host payloadのcore型、追加public API、statusline/permission書換えhelper。
- metrics backend、trace collector、独自audit event、独自retention policy。

これらはU07の要求を満たすために不要であり、NFR-7の最小変更、NFR-8の供給網境界、BR-U07-12〜13のownershipに反する。

## Source・生成・test ownership

正本は`packages/framework/core/`と`packages/framework/harness/<name>/`に置き、6 harness distはpackage generatorから導出する。U07は実在するadapter/settings choke pointだけを変更し、spawn siteがないharnessへdormant wrapperを追加しない。4 self-install面のclosed listは維持する。

testは純粋な分類/seamをunit、filesystem・child spawn・package projectionをintegration、全体配布journeyを必要最小のe2eへ置く。filesystemをmockだけで代替せず、PATH除去と空白入りtemp workspaceを実境界で確認する。push前local lcovでpatch追加行の未カバー0を確認し、spawn blind spotは対象moduleの計測状況を実測してin-process seamで覆う。waiverは既決の二段判定と公式証拠条件を満たす残余行だけに限定する。

## Decision consequences

利点は既定bytes、配布経路、security surfaceを保ちながら上流contractを適応できること、欠点はhost別adapterの差異を各fixtureで明示的に維持する必要があることである。新しいNFR閾値、failure分類、scope差が必要になった場合は実装で補わずE-OC1へ再付議する。

## トレーサビリティ

各decisionは`business-rules.md`のBR-U07-01〜13、`business-logic-model.md`のPublic seam/ownershipとFlow A〜C、`requirements.md`のFR-4、NFR-3〜8、C-1〜4、`technology-stack.md`の現行runtime・language・test・distribution構成に対応する。
