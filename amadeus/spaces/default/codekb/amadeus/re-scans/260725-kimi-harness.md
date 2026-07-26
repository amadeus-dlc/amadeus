# Re-scan 記録 — intent 260725-kimi-harness(新ハーネス「kimi」/ `.kimi-code` 追加)

## 実行メタデータ

- Date(UTC, `date -u` 実測): `Sat Jul 25 07:16:09 UTC 2026`
- Base SHA(`git rev-parse 6d4df9056`): `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`
- Observed / HEAD SHA(`git rev-parse HEAD`): `d31b8a5db5798ef761f3871ca66824c87530afb4`
- 直近 codekb scan: `re-scans/260724-watcher-timeout-fix.md`(observed `6d4df9056`)
- **base 選定(cid:reverse-engineering:rescan-base-ancestry)**: `260724-harness-provenance` の observed `2d0da11d022565bf4a613da9fbcccf078716f8f4` は現 HEAD の**非祖先**(`git merge-base --is-ancestor 2d0da11d HEAD` → **exit 1**。前 run のブランチが squash マージで main へ着地したため観測点が HEAD 系統に無い)。記録済み observed のうち祖先である最小距離点を採る: `6d4df9056` は `git merge-base --is-ancestor 6d4df9056 HEAD` → **exit 0**(検証済み祖先)、`git rev-list --count 6d4df9056..HEAD` → **105**。よって base=`6d4df9056`(祖先かつ距離最小)。
- Scope: `amadeus-feature`
- Project type: Brownfield / Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)。Developer スキャン → Architect 合成の直列(cid:reverse-engineering:c3)
- Focus: differential refresh + kimi ハーネス追加に向けた移植面(harness-porting surface)の再測定
- 測定 ref: 全 file:line は Observed=HEAD `d31b8a5db` のワークツリー実ファイル直読(Developer scan + Architect 再検証、cid:measurement-ref-in-artifacts)。件数はすべてコマンド出力からの転記(cid:numbers-from-command-output-only)
- 手法: 既存 codekb からの差分リフレッシュ(cid:reverse-engineering:c1)+ 新ハーネス移植面の焦点スキャン

### diff 規模(base 6d4df9056..HEAD)

- `git rev-list --count 6d4df9056..HEAD` 転記: **105 commits**
- `git diff --shortstat 6d4df9056..HEAD` 転記: **624 files changed, 103965 insertions(+), 1957 deletions(-)**
- 非 record 差分(`git diff --shortstat ... -- . ':(exclude)amadeus/spaces/*/intents/*'`): **295 files, 34617 insertions(+), 1957 deletions(-)**
- 焦点面の numstat: `packages/framework/core/tools/amadeus-lib.ts` +21/−99、`amadeus-utility.ts` +3/−0、`scripts/plugin-composition.ts` +138/−15、`scripts/package.ts` +20/−15。

## 現行結論(区間の構造変化 4 クラスタ + kimi 移植面)

### 1. ハーネス検出クラスタの `amadeus-harness.ts` 分離(`58053fa61`)

新規 `packages/framework/core/tools/amadeus-harness.ts`(137 行、+137/−0 の新規追加、base では非存在)へ、`amadeus-lib.ts` から以下が移管された。

- `HarnessType`(:5-12)= `"claude-code" | "codex" | "cursor" | "opencode" | "kiro" | "unknown" | "manual"`
- `HARNESS_DIR_TO_TYPE`(:14-22)= 5 dir → type 写像
- `KNOWN_HARNESS_DIRS`(:34-40)= CWD probe 順(コメント :32-33 が canonical 写像との意図的分離を明記)
- `KNOWN_RULES_SUBDIR`(:53-57)= `.claude`→rules / `.kiro`→steering / `.codex`→amadeus-rules
- 手続き群: `harnessDir()` :101-103 / `detectHarnessType()` :105-115 / `rulesSubdir()` :131-137

`amadeus-lib.ts` は import(:7-14)+ 型 re-export(:15-18)+ compat facade(:152-166)に縮退(区間 +21/−99)。lib 内の `KNOWN_HARNESS_DIRS` 直接利用は :186/:229/:269 の 3 箇所。呼び出し側は既存シンボルを変えない(コメント :151-152「callers keep importing these established symbols from amadeus-lib while their implementation remains isolated in amadeus-harness」)。

### 2. plugin 同梱モデルの変更(`47d5e3f9c`)

plugin は harness 中立バンドル `dist/plugins/<name>/` のみで出荷され、per-harness `<harnessDir>/plugins/` への投影は廃止。`scripts/package.ts:316` `projectPluginsIntoHarnessTree`(呼出 :505)は read-source 会計(#735 の未参照ソース scan 用)のみの no-op。`dist/plugins/formal-model-check/` が初のバンドルで、base では `dist/plugins/` ディレクトリ自体が非存在(`git ls-tree` 実測)。

### 3. plugin 信頼層(`f67b931c2` + `454194231`)

`scripts/plugin-composition.ts`(1365 行、`f67b931c2` で +138/−15):

- sha256 `contentDigest` フィールド(:128/:135/:191)
- stage index 検証 `parseStages`(:293、呼出 :286)
- journal 内の信頼付与(trust grant)`validJournal`(:813、digest 形式検査 :826 `/^sha256:[0-9a-f]{64}$/`)
- drop 時のドリフト拒否

`454194231`「cover runtime trust verification」が実行時信頼検証のテストを追加(`tests/unit/t252-plugin-composition.test.ts` 更新 + `t-formal-verif-plugin-lifecycle.integration.test.ts` +90 行)。

### 4. intent birth での harness provenance(`dc1eeba20`)

`amadeus-lib.ts` +78/−9、`amadeus-utility.ts` +3/−0。新テスト: `tests/unit/t269-harness-provenance.test.ts`(canonical 写像の pure テスト)、`tests/integration/t269-harness-provenance.cli.test.ts`(resolver provenance・検出優先順位・legacy cache)、`tests/integration/t270-harness-provenance-birth.test.ts`(全 packaged ハーネスでの実 intent birth、`Harness` フィールド)、`tests/integration/t271-migration-harness-validation.cli.test.ts`(`amadeus-migrate` dry-run)、`tests/integration/t144-harness-seam.cli.test.ts`(harness seam の解決 ladder)。

## kimi 新ハーネス touch list(全て HEAD `d31b8a5db` 実測)

| seam | 所在 | 注記 |
|---|---|---|
| harness 型/dir 正本 | `packages/framework/core/tools/amadeus-harness.ts` :5/:14/:34/:53 | §1。新ハーネスの dir/type/rulesSubdir の第 1 登録面 |
| packager 自動発見 | `scripts/package.ts:85-91` `discoverHarnessNames`(コメント :80-84) | `harness/<name>/manifest.ts` 保持 scan。編集不要で 1 dir + manifest 行 |
| self-install 管理 dir | `scripts/promote-self.ts:37-43` managedDirs(5 行)+ `PACKAGE_HARNESSES` :169(4 面) | project root へ反映する面 |
| plugin-projection 閉集合 | `scripts/plugin-projection.ts:46-53` `PACKAGE_HARNESSES`(6 面)/ :59 `SELF_INSTALL_HARNESSES`(4 面)/ membership :407 | 6 面と 4 面は意図的に非対称(コメント :56-58) |
| CI drift glob | `scripts/detect-ci-changes.sh:20` | `.claude/.codex/.kiro/.cursor/.opencode` の drift 検知対象 |
| setup CLI 型 | `packages/setup/src/domain/harness.ts:9`(union)/ :21-28(`HarnessName.all`)/ :33(parse) | branded type + canonical list |
| setup engine dir 写像 | `packages/setup/src/domain/engine-layout.ts:8-15` `ENGINE_DIR_BY_HARNESS` | kiro/kiro-ide は `.kiro` 共有の先例あり |
| setup reporter | `packages/setup/src/modules/reporter.ts:24-25`(usage)/ :137(invalid-harness メッセージ) | ユーザー可視のハーネス列挙 |
| swarm driver | `packages/framework/core/tools/amadeus-swarm.ts` `DRIVER_VALUES` :93(`["subagent","claude-ultra","codex-ultra"]`)/ `HARNESS_VALUES` :100(`["claude","codex","kiro","kiro-ide"]`) | cursor/opencode を意図的除外。kimi 追加は opt-in で `resolveDriver` :118-136 が未知値を fail-closed 拒否 |
| doctor | `packages/framework/core/tools/amadeus-utility.ts` `handleDoctor` :1196、`.claude` arm :1275、adapter hook 名 :1350-1351、`.kiro` arm :1366、`.codex` arm :1379、fix hint :1439、`otherTrees` :1446(5 dir) | ハーネス別の診断分岐 |

**非対称の要点**: 新ハーネスは `PACKAGE_HARNESSES`(6)/ `SELF_INSTALL_HARNESSES`(4)/ swarm `HARNESS_VALUES`(4)の 3 閉集合へ**個別に判断して**追加(または非追加を維持)する。

## 雛形・バージョン・テスト様式

- **区間内に新ハーネス dir 追加なし**: `packages/framework/harness/` = base・HEAD とも claude/codex/cursor/kiro/kiro-ide/opencode の 6 dir。
- **kimi の雛形**: cursor/manifest.ts(75 行: rules→amadeus-rules、adapter+lib harnessFiles、skipRunnerGen、emit)= 最小面の参照。codex/emit.ts(375 行: HOOK_WIRING :29-39、trust pre-seed、agent TOML、`.agents/skills`)= フル emit の参照。
- **バージョン**: `packages/framework/core/tools/amadeus-version.ts:4` `AMADEUS_VERSION = "0.1.5"`。
- **テスト様式**: t145 は `package.ts --check` を spawn する byte-parity keystone。t-cursor-adapter は注入 spawn spy の in-process 型。t-opencode-emit は in-process write⇔check。t149 smoke は module スコープのリテラル期待ファイル表(manifest 由来ではない)。

## Delivery boundary

実装・修正コード、`bun scripts/package.ts` / `bun run promote:self` による dist・self-install 再生成、main merge/rebase、Issue close、PR 作成・更新は本 scan で未実施。kimi ハーネス本体の実装は未着手。
