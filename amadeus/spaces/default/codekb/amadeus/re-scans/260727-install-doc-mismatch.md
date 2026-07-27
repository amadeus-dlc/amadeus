# re-scan: 260727-install-doc-mismatch

上流入力（consumes 全数）: Developer スキャン結果（本 intent `260727-install-doc-mismatch` の reverse-engineering ステージで実施、conductor 経由で Architect 段へ受領した実測済みスキャンノート）

## スキャン諸元

| 項目 | 値 |
| --- | --- |
| intent | `260727-install-doc-mismatch`（[Issue #1569](https://github.com/amadeus-dlc/amadeus/issues/1569)、ユーザー裁定 A） |
| Scope | `amadeus-bugfix`、Brownfield、単一 repo `amadeus` |
| Base commit | `0d83aa48b886fe85cd977569c0e7b3015b84d3e5`（前 intent `260726-plugin-host-delivery` の observed） |
| 祖先性 | `git merge-base --is-ancestor 0d83aa48b886fe85cd977569c0e7b3015b84d3e5 HEAD` **exit 0 = 祖先**、`git rev-list --count 0d83aa48b..HEAD` = **70**（cid:reverse-engineering:rescan-base-ancestry） |
| Observed commit | `46a75f2e7c53aaa475a19cc217d10c9172ad4129`（= 現 HEAD、`git rev-parse HEAD` 実測。worktree `fix-plugin`、ブランチ `fix/plugin`） |
| 区間規模 | `git diff --name-only 0d83aa48b..HEAD \| wc -l` = **458 files** |
| 面別内訳 | amadeus/spaces 192 / dist 111（うち dist/plugins 37）/ tests 55 / packages/framework 16（core 10・harness 6）/ .kimi-code 16 / .claude 13 / docs 12 / .cursor 10 / .codex 10 / .opencode 9 / scripts 4 / plugins 2（`git diff --name-only … \| awk -F/ '{print $1"/"$2}' \| sort \| uniq -c` 出力の転記） |
| 患部導入 | 前 intent `260726-plugin-host-delivery` の U3 host-projection-all（`250265adb`）で installDoc の案内先を導入 |
| 方式 | 差分リフレッシュ（フルスキャン不実施、cid:reverse-engineering:c1） |

## 区間の性格

**本区間 `0d83aa48b..46a75f2e7`（70 commits）はほぼ全体が前 intent `260726-plugin-host-delivery`（plugin ホスト配信）の Construction である。** 前回 RE（observed `0d83aa48b`）は同 intent の inception 段で実施され、その時点では plugin-composition / `dist/plugins` / トップレベル `plugins/` は**未着地**だった（前節が「区間内で完全に無変更」と記録したとおり）。本区間はその Construction 本体（U2–U8）を含み、`dist/plugins`（7 面 install bundle・37 files）・`plugins/`（authoring source）・composition engine の core 再配置がすべて**この区間で新規着地**した。

主系統（`git log --oneline 0d83aa48b..HEAD`）:

- U2 walking-skeleton + engine core 再配置 `f8fe817c5`（[PR #1554](https://github.com/amadeus-dlc/amadeus/pull/1554)）
- U3 host-projection-all `250265adb`（§12a 是正 `30b3afc99` = OutDirRefusal 配線 + claude INSTALL_doc）— **#1569 の患部を導入**
- U4 hook-wiring-remaining `a6b20dfe4`
- U5 doctor observability `a0b15e1ab`
- U6 activation-policy `8ae1ef058`
- U7 conformance-suite `14b004f55`（t188、32-case trace）
- U8 docs-sync `60eb7517e` / §12a 是正 `4858fb8d7`（19-plugins EN/JA、docs `:183`/`:175` の現行文言はここで確定）
- 周辺: promote-self kimi 配線 `e688c9f79` / `f1905d7cd`、mirror 非対称是正 [#1553](https://github.com/amadeus-dlc/amadeus/issues/1553) `82df115ae`、t177 flake 修正 [#1565](https://github.com/amadeus-dlc/amadeus/pull/1565) `46a75f2e7`

## #1569 対象面の実測（observed `46a75f2e7`）

| 面 | 判定 | file:line（実測一致） |
| --- | --- | --- |
| discovery（**正**） | 走査先の単一定義 | `packages/framework/core/tools/amadeus-plugin.ts:278` `pluginSourceRootOf(hostRoot) = join(hostRoot, ".amadeus-plugin-src")`（private・非 export）。呼び出し 3 経路 `isRecordCurrent:288` / `handleCompose:323` / status `:405`、`hostRoot = resolveProjectRoot:268` 由来 |
| installDoc（**誤**、修正対象） | 案内先が入力先とずれる | `scripts/plugin-projection.ts:593` `Copy this bundle's plugins/<name>/ into <harnessDir>/plugins/<name>/.`。class 分岐 `:580-610`（copy 行を出すのは folder-drop-auto と manual-only の 2 クラス、native-manifest=claude は `:582-591` marketplace 手順で copy 行なし）。`manualComposeCommand:557-559` は正しい（修正不要） |
| 非依存の実測 | 一致強制機構の不在 | `grep -c ".amadeus-plugin-src" scripts/plugin-projection.ts` = **0**。installDoc は discovery 定数を参照せず独立管理 |
| dist 配布物（6 面） | 修正後に再生成必須 | `dist/plugins/formal-model-check/{codex,cursor,kimi,kiro-ide,kiro,opencode}/INSTALL.md:3`（`grep -rln "Copy this bundle" dist/plugins/` 実測、claude は対象外。face ディレクトリ全数 7 面） |
| docs（EN、修正対象） | 手書き複製 | `docs/guide/19-plugins.md:183` |
| docs（JA 対訳、修正対象） | 手書き複製 | `docs/guide/19-plugins.ja.md:175`（`:183` と同一の誤り） |
| SELF_INSTALL_HARNESSES | 5 面 | `plugin-projection.ts:56` = `["claude","codex","cursor","opencode","kimi"]` |
| dist ガード | 機械化済み | `package.ts:80` `pluginsRoot` → `:302` `repoPlugins` → `:787-796` `pluginBundleExpected`（installDoc からバイト再導出）→ `:832` `checkPluginProjections`（バイト比較）。docs prose は対象外 |

## Architect 段の独立再検証

上流 Developer スキャン結果の file:line・件数を observed `46a75f2e7` で全数直読照合した。**訂正 0 件**（cid:reverse-engineering:cite-shift-vs-nonshift-separation）。

| 照合対象 | 結果 |
| --- | --- |
| `amadeus-plugin.ts:278` `pluginSourceRootOf` / 呼び出し `:288`/`:323`/`:405` / `:268` resolveProjectRoot | 一致（`sed -n` 直読 + `grep -n`） |
| `plugin-projection.ts:593` `Copy this bundle's …` verbatim | 一致（`grep -n "Copy this bundle"` = `:593`） |
| `plugin-projection.ts` の class 分岐 `:580-610` / `manualComposeCommand:557-559` / `SELF_INSTALL_HARNESSES:56` | 一致（`sed -n` 直読） |
| `grep -c ".amadeus-plugin-src" scripts/plugin-projection.ts` = 0 | 一致 |
| dist 6 面 INSTALL.md（`grep -rln "Copy this bundle" dist/plugins/`） | 一致（codex/cursor/kimi/kiro-ide/kiro/opencode、claude 不在） |
| `docs/guide/19-plugins.md:183`（EN）/ `19-plugins.ja.md:175`（JA） | 一致（`sed -n` 直読） |
| t307 `:53`/`:60` が `plugins/${FIXTURE}/plugin.json` のみアサート（copy 先非アサート） | 一致 |
| `.amadeus-plugin-src` の test 配置 6 箇所（t299:109,276 / t302:70,87 / t328:49 / t338:80） | 一致（`grep -n` 出力） |
| core plugin 3 ファイルの行数（`amadeus-plugin.ts`=607 / `amadeus-plugin-compose.ts`=1469 / `amadeus-plugin-activation.ts`=295）、`plugin-projection.ts`=877 / `package.ts`=898 | 一致（`wc -l`） |

## 合成上の主要な確定事項

1. **真因は「案内先」と「走査先」の非対称**。installDoc（`plugin-projection.ts:593`）が案内する `<harnessDir>/plugins/<name>/`（compose 出力先・compile 可視）と、CLI discovery（`amadeus-plugin.ts:278`）が走査する `.amadeus-plugin-src/<name>/`（入力先・dot-dir）が別モジュールで独立管理され、一致を強制する機構がない（cid:requirements-analysis:symmetric-pair-review の未充足クラス）。ユーザー裁定 A は **CLI discovery を正**とし installDoc / docs を入力先へ寄せる。
2. **docs は二重管理**。`19-plugins.md:183`（EN）と `19-plugins.ja.md:175`（JA 対訳）が installDoc の内容を手書き複製しており、ドリフトガード非対象。installDoc 正本の是正と同一変更で両方を直す（cid:requirements-analysis:docs-language-ownership）。
3. **修正の機械ガードは片側のみ**。installDoc 修正後、dist 6 面 INSTALL.md の stale は `package.ts:832` `checkPluginProjections` → `dist:check` が必ず検出する（落ちる実証はここで成立、cid:code-generation:injection-surface-verify — テストが読む面 = dist）。**docs prose はガード外**のため、docs 側は grep ベースの別検査が要る。
4. **回帰テストの空白**。「doc の指示先 == CLI の走査先」不変量が未固定。t307 は installDoc の body flavour（`plugins/${FIXTURE}/plugin.json`、`:53`/`:60`）のみアサートし copy 先を非アサート。discovery 側の正解パスは t299/t302/t328/t338 が `.amadeus-plugin-src` 配置で実証済み（一次証拠）。回帰テストは「installDoc の案内先 == `pluginSourceRootOf` の相対パス」を固定するのが自然。
5. **未使用引数リスク**。文言是正で `:593` の `harnessDir` 参照が減るが、`manualComposeCommand:557-559` が使い続けるため関数全体では未使用化しない見込み — 実装時に Biome lint で要実測。

以上は後続の requirements-analysis 以降で修正方式（共有定数化による構造的一致強制 vs 文言のみ是正 / docs 検査の実装 / 回帰テストの不変量固定先）を裁定する。本 scan は codekb の差分更新のみを成果物とし、patch は提案しない。

## センサー不適用と代替検証

RE ステージが宣言する 3 センサー（`required-sections` / `upstream-coverage` / `answer-evidence`）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**であり発火不能である（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わない。**

代替として以下を実施した。

**(a) H2 見出し数の機械確認（`grep -c '^## '`、H2 ≥ 2 を要件とする）**

| 成果物 | H2 数 | 判定 |
| --- | --- | --- |
| `reverse-engineering-timestamp.md` | 64 | PASS |
| `architecture.md` | 48 | PASS |
| `code-structure.md` | 47 | PASS |
| `component-inventory.md` | 35 | PASS |
| `code-quality-assessment.md` | 51 | PASS |
| `api-documentation.md` | 22 | PASS |
| `dependencies.md` | 18 | PASS |
| `business-overview.md` | 16 | PASS |
| `technology-stack.md` | 16 | PASS |
| `re-scans/260727-install-doc-mismatch.md`（本ファイル） | 7 | PASS |

**(b) 上流入力への実参照の確認** — 更新 9 成果物の本 intent 節および本ファイルに、上流入力（Developer スキャン結果）への参照が実在することを機械確認した。いずれも装飾トークンではなく本文の依拠箇所からの参照である（cid:code-generation:artifact-upstream-inputs-header の趣旨）。

**(c) 旧「現在」マーカーの降格確認** — `grep -rn '^## .*、現在' amadeus/spaces/default/codekb/amadeus/*.md` を実行し、intent マーカーを含む「現在」ヒットが本 intent `260727-install-doc-mismatch` の **4 節のみ**（`architecture.md:3` / `code-structure.md:3` / `component-inventory.md:3` / `code-quality-assessment.md:3`）であることを機械確認した。前 intent `260726-plugin-host-delivery` の H2 4 件はすべて「履歴」へ降格済み（cid:reverse-engineering:c3-relabel）。`reverse-engineering-timestamp.md:3` の「現在」ヘッダも本 intent へ更新済み。

（(a)(c) の数値はいずれもコマンド出力からの転記。測定 ref: observed `46a75f2e7`。cid:requirements-analysis:numbers-from-command-output-only）

## Delivery boundary

本 scan の成果物は codekb 9 成果物の差分更新と本 per-intent 記録のみ。患部コード（`plugin-projection.ts` / `docs/guide/19-plugins.md` / `.ja.md` / `dist/plugins`）・テスト・coverage allowlist・GitHub Issue の操作・intent record / state / audit・生成配布物への書込は一切行っていない。修正方式は後続の requirements-analysis 以降で裁定する。
