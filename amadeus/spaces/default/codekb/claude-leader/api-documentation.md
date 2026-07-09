# API ドキュメント

## 公開 API サーフェス

この repository に HTTP API、GraphQL API、service endpoint は存在しない。公開されている契約は CLI コマンド(`@amadeus-dlc/setup`、AI-DLC 内部ツール群)である。本 intent は既存契約の変更ではなく内部欠陥の修理であるため、CLI サーフェスの外形は維持される想定。

## `@amadeus-dlc/setup` CLI 契約(完成済み、#656 に関連)

```bash
npx @amadeus-dlc/setup install [--harness <name>] [<target-dir>]
npx @amadeus-dlc/setup upgrade [<target-dir>]
```

`upgrade` は内部で `Installation.detect(target, manifestIo)`(`packages/setup/src/domain/installation.ts:28`)を呼び、次の4種の `kind` を判定してから `admitsInstall(force)` で許可判断する。

- `none` — 既存導入なし → 常に `proceed`
- `manifested` — manifest あり → force なしなら `refuse-suggest-upgrade`
- `manual-or-unknown` — tools/・amadeus-common/ 両アンカーあり、manifest なし
- `partial` — 片方のアンカーのみ → `missing` を報告

**#656 の欠陥**: この4分岐に `LegacyLayout`(`packages/setup/src/domain/upgrade.ts:95-114`)の loose-file 検出結果が反映されない。ユーザー向けの CLI 出力・admission 判断は現状のコードでは実質的に正しく機能するが、`LegacyLayout.isUnsupported` 条件(b)が意図した通りに本番検出へ寄与しているかは保証されていない。

## AI-DLC 内部ツール契約(#657 に関連)

```bash
bun .claude/tools/amadeus-sensor-type-check.ts [args]
```

- PostToolUse hook から type-check センサーとして起動される。
- 内部で `spawnSync("bunx", ["tsc", ...])` を無条件実行する(`packages/framework/core/tools/amadeus-sensor-type-check.ts:173-174`)。
- 期待される exit code 契約: TS18003(空の include 相当)で exit 2。bunx が repo ピン外のバージョンを解決すると exit 1 になり、`tests/integration/t92.test.ts:1147-1172`(Group N test 44)が赤くなる。

## hooks の内部 API(#641 に関連)

```typescript
resolveProjectDirFromHook(): string  // .claude/tools/amadeus-lib.ts:240-259
```

- 全 hooks(state 同期、監査ログ、subagent tracking 等)が呼び出す共通関数。
- 契約上は「hook が現在対象とすべきプロジェクトルート」を返すが、worktree セッションでは engine の cwd と一致しない場合がある(architecture.md の相互作用図を参照)。

## Glossary API(#661 に関連)

`stage-protocol.md:657` の Glossary セクションが Bolt/Unit 関係の canonical な定義源であり、他の全ドキュメント(stage ファイル、knowledge、docs)はこれと矛盾しない記述を持つ契約である。現状この契約が複数箇所で破られている(code-structure.md 参照)。
