# Code Summary — U8 docs-sync（Bolt 8）

> 上流入力(consumes 全数): requirements(FR-9)、functional-design/business-rules、functional-design/business-logic-model、harness-capability-matrix（U1 権威マトリクス）

## 変更ファイル

| ファイル | 変更 |
| --- | --- |
| `docs/guide/19-plugins.md`（英語） | +145 / -4（新規 4 節 + activation 節 + 導入・末尾節の 7/5 化） |
| `docs/guide/19-plugins.ja.md`（日本語対訳） | +137 / -24（英語と 1:1 対応） |

コード変更ゼロの文書 Unit（unit-of-work.md U8 / components.md C8）。実装ソースの手編集なし。

## 追加した節（両言語 1:1）

1. **CLI** — verbs（compose/doctor/drop/status）、`--if-stale`（no-op 高速路）、`--project-root`、配布コピー経由の実行形 `bun .claude/tools/amadeus-plugin.ts <verb>`、exit（成功0 / 適用失敗1 / doctor degraded1 / usage2）、`--help` なし・verb なしで usage。
2. **セッション起動時の自動 compose** — 7 面中 6 面（claude/codex/cursor/kimi/kiro/kiro-ide）が wired、opencode = manual-only の degrade 契約。`--if-stale` による起動レイテンシ非退行、フック失敗は非ブロッキング。
3. **`--doctor` プラグイン節** — 6 状態分岐表（ok/drift/advisory=visible-passing、degraded/recovery-pending/unknown=loud fail）、0-plugin は単一 pass 行。
4. **プラグインのホストへのインストール** — install bundle のクラス別手順（native-manifest/folder-drop-auto/manual-only）、INSTALL.md、OutDir 拒否集合。
5. **activation ポリシー: formal-model-check** — spec-hash advisory・TLC 自動実行なし・state 非書込（ADR-1 案A）。
6. 導入段落と末尾節を「6 packaged / 4 self-install」→「7 packaged / 5 self-install」（kimi 追加）へ実態更新（FR-9）。

## 裏取り file:line（記憶起草禁止 — 全数 grep 実測）

- CLI verbs/USAGE/exit: `packages/framework/core/tools/amadeus-plugin.ts:98-102`（USAGE）、`:69-72`（command union）、`:571-601`（renderPluginCliResult 各 exit）、`:319-320,579-580`（no-op）、`:106-109`（--project-root）
- 実行形・manual compose: 配布コピー `.claude/tools/amadeus-plugin.ts`（実在確認済み）、`scripts/plugin-projection.ts:557-559`（`bun <harnessDir>/tools/amadeus-plugin.ts compose`）
- SessionStart hook: `packages/framework/core/hooks/amadeus-plugin-compose.ts:16`、claude 配線 `packages/framework/harness/claude/settings.json.example:34-37`
- trigger/class/disposition: `scripts/plugin-projection.ts:459-467`（PLUGIN_COMPOSE_TRIGGER）、`:360-368`（PLUGIN_HOST_CLASS）、`:449-451,472-476`（classify/resolveFaceDisposition）
- opencode degrade doctor 文言: harness-capability-matrix.md 列6（転記）
- --doctor section: `amadeus-plugin.ts:495-506`（buildDoctorPluginSection）、`:531-544`（doctorPluginRows）、`:470-472`（isFailingPluginState）、`:465-466`（KNOWN 集合）、`:81`（DoctorLineState union）、`amadeus-utility.ts:2887-2890`（integration）
- install bundle: `scripts/plugin-projection.ts:580-609`（installDoc）、`:620+`（installArtifacts）、`:440-444`（OutDirRefusal）、`:461+`（classifyOutDir）
- activation: `packages/framework/core/tools/amadeus-plugin-activation.ts:1-7,34,40`、doctor activation 行 `amadeus-plugin.ts:503`
- 7/5 面: `scripts/plugin-projection.ts:42-50`（PACKAGE_HARNESSES=7）、`:56`（SELF_INSTALL_HARNESSES=5）

## CLI 実行スモーク（配布コピー、実測出力）

```
$ bun .claude/tools/amadeus-plugin.ts status --project-root <tmp>
Plugins: 0 installed, 0 composed, revision 0        exit=0
$ bun .claude/tools/amadeus-plugin.ts doctor --project-root <tmp>
(0-plugin: 出力なし)                                 exit=0
$ bun .claude/tools/amadeus-plugin.ts                (verb なし)
no verb given / usage ブロック                        exit=2
$ bun .claude/tools/amadeus-plugin.ts compose --nope  (未知フラグ)
compose: unexpected argument(s): --nope / usage        exit=2
```

## 対訳同期確認（BR-U8-3）

- H2 見出し: 両ファイルとも 11 節・同順（`grep -nE '^## '` で 1:1 照合）。
  EN: authoring / lifecycle / CLI / auto-compose / --doctor section / install / safety / deferred / activation / verifying / faces。ja は各対訳。
- 表行数: `grep -cE '^\|'` = EN 23 / ja 23（1:1）。
- 総行数: EN 275 / ja 263（対訳の折返し幅差による物理行差、内容対応は上記で一致）。

## 検証（配布コピー経由、exit code 個別記録）

| コマンド | exit | 判定 |
| --- | --- | --- |
| `bun run typecheck` | 0 | PASS |
| `bun run lint` | 0 | PASS（複雑度は既存 warning のみ、非ブロッキング。触れていない core hooks ファイル由来） |
| `bash tests/run-tests.sh --ci` | 2 | 2 file 失敗（下記）— いずれも本変更と無関係の既存失敗。FR-9 ゲート `t174-docs-legacy-refs-gate` は PASS |

### run-tests.sh --ci の 2 失敗（本 Unit と無関係 — 帰属確定済み）

assertion 実文を読んで帰属（local-ci-red-assertion-verbatim）。両失敗は 19-plugins を参照せず、HEAD の docs（本変更を revert）でも同一 2 失敗が再現（BASE_EXIT=1 実測）→ 本 docs-only 変更とは独立の既存失敗。

1. `tests/unit/t177-workspace-journey-fixture.test.ts:88` — `expect(existsSync(journey.root)).toBe(false)` が `true`。tmp ルートの cleanup 競合（環境起因のフィクスチャ）。docs 非関連。
2. `tests/integration/t199-generated-prefix-contract.test.ts:215` — offender `tests/conformance/t188-trace.md: content contains aidlc-`。U7 が着地させた conformance trace（commit `14b004f55`）の上流参照。docs-sync のスコープ外・U7 の成果物。

いずれも本 Unit のファイルではなく、安全・低コストに修正できる範囲外（U7 成果物 / 環境フィクスチャ）のため leader へ既存無関係失敗として報告し、本 Unit では修正しない（NEVER-ignore-red 遵守: 赤を green と報告せず明示フラグ）。

## 逸脱

なし。component-methods C1-C6 契約と実装・docs 記載の乖離 0 件（BR-U8-5）。ADR-4 正準 literal 逐語使用（BR-U8-6）。
