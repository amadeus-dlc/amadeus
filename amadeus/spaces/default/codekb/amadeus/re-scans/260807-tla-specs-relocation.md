# re-scan: 260807-tla-specs-relocation

## 実行メタデータ

- Date: `2026-08-07`
- Intent: `260807-tla-specs-relocation`（scope `self-refactor`、Brownfield、単一 repo `amadeus`、Depth: Minimal、Test Strategy: Comprehensive）
- 起点 Issue: [#2398](https://github.com/amadeus-dlc/amadeus/issues/2398) — TLA+ 仕様を `specs/tla/` → `amadeus/spaces/<space>/specs/tla/` へ移設し、仕様層の正準配置を `amadeus/spaces/<space>/specs/{rfc,tla}` に統一する（rfc 側は兄弟 Issue #2396 が担う）
- Base commit: `7060956c5617125dd2f4e284957aa180cb306484`（本 intent の prior record はなし。`re-scans/` 中で最新の observed を共有する `260805-cross-harness-resume` / `260805-subagent-type-guard` の `7060956c5` を採用。`cid:reverse-engineering:rescan-base-ancestry` に従い祖先性を実測 — `git merge-base --is-ancestor 7060956c5 d98dd9039` **exit 0**）
- Observed commit: `d98dd9039db3949eeb140941deeb4468f717e57a`（= 本 worktree HEAD。`git rev-parse HEAD` で一致、exit 0）
- 区間規模: **85 commits / 1232 files**（`git rev-list --count base..HEAD` = 85、`git diff --name-only base..HEAD | wc -l` = 1232、いずれも実測）
- Scan mode: **xrev scan mode**（`cid:reverse-engineering:c1-xrev-single-issue`）+ **DIFFERENTIAL refresh**（`cid:reverse-engineering:c1`）。2 件のクロスレビュー verdict（reviewer-1 / reviewer-2、ともに CONFIRMED_WITH_REFINEMENTS）を Developer scan の一次入力とし、Architect が load-bearing seam を observed 断面の verbatim 実読・実コマンドで独立に再検証した
- Focus: TLA+ 仕様層の配置。患部は (a) model-map.json の登録状態と digest 機構、(b) model-map v2 validator の正準パス固定、(c) activation watch（glob + `specRootForHost` + advisory 文言）、(d) model-completeness センサー、(e) TLA loader / CI runner のパス結合、(f) `specs/tla` リテラルの全域分布

本記録の file:line はすべて observed `d98dd9039db3949eeb140941deeb4468f717e57a` 時点。

## 一次患部の構造（再検証で確定）

### 結合点の6系統

`specs/tla` パスは単一の設定点に集約されず、6系統に散在する: (a) `specs/tla/model-map.json` の `path` 値（`:7,:11,:60,:64,:69`）、(b) センサー frontmatter glob（`packages/framework/core/sensors/amadeus-model-completeness.md:8`）+ 実装定数（`amadeus-sensor-model-completeness.ts:37`、ほか `:507,:535,:760` の直接生成）、(c) activation watch（`amadeus-plugin-activation.ts:42` `ACTIVATION_WATCH_GLOBS = ["specs/tla/**"]`）+ advisory 文言（`:229,:231,:233,:304-305`）、(d) 形式検証定数（`amadeus-formal-verif-model-map.ts:52-56` + 生成関数 `:58,:62`、plugin 側は byte-identical 鏡像）、(e) loader の境界（`tla-model-loader-internal.ts:186,:344,:364,:367,:371`）、(f) CI runner（`ci-model-check-domain.ts:189`、`run-model-check-diagnostic.ts:217`）。

### 2つのハッシュ機構の非対称

- model-map の identity（`canonicalIdentity()`、`:33-43`）は domain 分離 canonical ハッシュでパスを畳み込まない — **移設で identity は不変**。実測: `shasum -a 256 specs/tla/FormalElection.tla` = `2c7d6dbf…` ≠ map の identity `e8cc39a9…`（設計どおり、反証ではない）。
- activation watch の spec hash（`computeSpecHash(specRootForHost(hostRoot), …)`、`:296,:447,:481`）は相対パスを fold する — **移設は必ず drift として検出される**（設計どおり。「落ちる実証で閉じる」方針と整合）。
- 正準パスはスキーマレベルで固定: model/cfg は `parseAssetIdentity`（`:171`）が `:335,:337` で生成値への完全一致を要求、auxiliaries は `isCanonicalAuxiliaryPath`（`:247`）内の `posix.dirname(value) !== "specs/tla"`（`:250`）で固定。**機械置換ではなく validator 定数の定義変更を要する**。

### space 解決機構との未接続

`amadeus-lib.ts:429` `ACTIVE_SPACE_POINTER` / `:1122` `activeSpace()`（explicit arg > active-space pointer > `"default"`）は存在するが、formal-verif 系4ツール（activation / model-map / sensor / loader）からの `activeSpace` 参照は **0 件**（grep exit 1 実測）。現行の spec 層は space 非依存のルート固定。

## 独立再検証の台帳（Architect 実測）

| seam | 実測コマンド / 結果 | 判定 |
| --- | --- | --- |
| `specs/tla/` 9ファイル | `git ls-tree -r HEAD --name-only -- specs/` → 9 ファイル | 再現 |
| model-map 登録 2 モデル | `grep -n '"name"' specs/tla/model-map.json` → `:5` FormalElection / `:58` MirrorLifecycle の 2 件 | 再現 |
| 未登録 pin | `t-formal-verif-mirror-model-registration.integration.test.ts:106` が `toBeUndefined()`（`:103-106` 実読） | 再現 |
| digest 機構 | `canonicalIdentity` = `amadeus-formal-verif-model-map.ts:33-43`（domain 分離、実読） | 再現 |
| 定数・生成関数 | `:52-56`（`TLA_MODEL_MAP_PATH = "specs/tla/model-map.json"` 等）、`tlaModelPath :58` / `tlaCfgPath :62` | 再現 |
| validator 正準パス固定 | `:250` / `:272` は **auxiliaries 側**。model/cfg 側は `parseAssetIdentity :171` が `:335,:337` でピン（**訂正1**） | 訂正して採用 |
| core ↔ plugin 鏡像 | `cmp` 両コピー → byte-identical。投影は `scripts/package.ts:808-809` | 再現 |
| watch glob / 基底 | `ACTIVATION_WATCH_GLOBS :42`、`specRootForHost :100-102`（`return dirname(hostRoot)`）、`computeSpecHash` 呼出 `:296,:447,:481` | 再現 |
| advisory 文言 | `:229` / `:231` / `:233` / `:304-305` 実読。audit 実記録 `260804-tla-authoring/audit/j5ik2o-mac-studio-lan-2a22dd80e265.jsonl:525` に 1 件（`grep -c` = 1） | 再現 |
| watch-root ノルム | `amadeus/spaces/default/memory/project.md:408` に cid コメント付きで実在 | 再現 |
| センサー glob | `packages/framework/core/sensors/amadeus-model-completeness.md:8` `matches: "**/{specs/tla/**,…}"`。ステージ側は `plugins/formal-model-check/stages/formal-model-check.md:14-15` の id 宣言のみ（`inputs:` は `:12`） | 再現 |
| `MODEL_MAP_RELATIVE_PATH` | `amadeus-sensor-model-completeness.ts:37`（+ `:239,:349` 等の定数経由、`:507,:535,:760` 直接生成） | 再現 |
| CI ジョブ | `ci.yml:663` `formal-model-check:` / `:665` `workflow_dispatch`。`grep -n "specs/tla" .github/workflows/ci.yml` → **exit 1（0 件）** | 再現 |
| runner パス結合 | `plugins/formal-model-check/tools/ci-model-check-domain.ts:189`（bind mount 検査）、`run-model-check-diagnostic.ts:217`。`scripts/ci-model-check-domain.ts` は**非存在**（前提誤りの訂正は Developer scan 済み、ここでも確認） | 再現 |
| loader 境界 | `:186`（境界文言）、`:344,:364`、`:367,:371`。identity 照合の構成点は `:69-70,:118,:231`（**訂正4**） | 訂正して採用 |
| `specs/tla-evidence` | `tla-evidence.ts:434` `DEFAULT_STORE_ROOT`。全域 15 ファイル / 28 行（actionable は同所 + `docs/reference/22-formal-model-supply.md:238` / `.ja.md:121` の 3 ファイルのみ） | 再現 |
| `activeSpace` 未接続 | formal-verif 系4ファイルへの grep → **exit 1**。resolver 本体は `amadeus-lib.ts:429,:1122` に実在 | 再現 |
| リテラル総量 | `git grep -c "specs/tla" HEAD` = **264 ファイル**、`git grep` 行数 = **727 行**、`git grep -o` = **826 occurrences** | 再現 |
| 面別内訳 | core 6/27、plugins 10/28、specs/tla 5/10、docs 8/21、tests 51/272、intents 141/302、elections 30/36、codekb 12/30、memory 1/1 — 面別に全件再計測して一致 | 再現 |
| dist 焼き込み | `grep -ro "specs/tla" dist/` = **477** / `grep -rl` = **138 ファイル**。`find dist -name "specs" -o -name "*.tla"` = 0 件（specs 自体は非投影） | 再現 |
| `.gitignore` | `grep -n "specs" .gitignore` → exit 1 | 再現 |
| 外部依存 | 区間 diff は `package.json` の `pi.extensions` 1行のみ、`bun.lock` 無変更 | 再現（Architect 追加実測） |
| 区間内の影響面着地 | `git diff --name-only base..HEAD` に `specs/tla/FormalElection.tla`、`specs/tla/model-map.json`、core 2ツール、plugin 複数、ci.yml を確認（specs/ + plugins/formal-model-check/ で 10 ファイル） — 影響面は生きている | 再現 |

## Developer scan との差分（引用訂正）

| # | 項目 | Developer scan | observed 実読 | 扱い |
| --- | --- | --- | --- | --- |
| 1 | validator の正準パス固定の所在 | 「`:250` v2 validator が `posix.dirname(value) !== "specs/tla"` を fail 条件に固定（`:272` auxiliaries も同様）」 | `:250` / `:272` は `isCanonicalAuxiliaryPath`（`:247`）= **auxiliaries 側**。model/cfg 側の固定は `parseAssetIdentity`（`:171`、`value.path !== expectedPath`）が `:335` / `:337` で `tlaModelPath` / `tlaCfgPath` 生成値へピンする形で、dirname リテラル比較は auxiliaries にのみ存在 | **訂正して採用**（結論 = スキーマレベル固定の存在・機械置換不可は不変。reviewer-2 §5 も同じ帰属のずれを持つ） |
| 2 | activation の model-map 読み手座標 | consumers 表 `amadeus-plugin-activation.ts:233,290` | `evaluateTlaModelReadiness` の実呼出は `:427`（import `:33`）。`:290` は `resolveActivationJudgment` 呼出、`:233` は advisory 文言 | 精密化して採用 |
| 3 | sensor の parse 結線座標 | consumers 表 `amadeus-sensor-model-completeness.ts:37,365,376` | `:37`（定数）は一致。`parseTlaModelMap` の結線点は deps 注入 `:329`（import `:22`、型 `:110`） | 精密化して採用 |
| 4 | loader の identity 照合座標 | `:304-307` identity 照合（SOURCE_DRIFT 棄却） | SOURCE_DRIFT の構成点は `:69-70`（kind/code 定義）、`:118`（loadError）、`:231`（`canonicalIdentity(source, domain)` 再計算） | 精密化して採用 |

そのほかの主要引用（9ファイル / 登録2モデル / identity 値 / `:42` / `:100-102` / `:229,:231,:233,:304-305` / sensor `:8,:37` / ci.yml `:663,:665` / runner `:189,:217` / `:434` / `:449` / `:361` / 826・264・727 / 477・138 / 面別内訳 / 51・272 / 8・21 / `project.md:408` / audit `:525` / 登録テスト `:106`）は observed 断面で**全件一致**。

## テストベースライン（Developer scan 実測の採用 — Architect は再実行なし）

Architect はコードを一切変更していないため、Developer scan が observed SHA で実測したベースラインをそのまま検証値として採用する:

| ファイル | pass | fail | expect | exit |
| --- | --- | --- | --- | --- |
| `tests/integration/t-formal-verif-mirror-model-registration.integration.test.ts` | 7 | 0 | 20 | 0 |
| `tests/unit/t-formal-verif-model-map-v2.test.ts` | 27 | 0 | 102 | 0 |
| `tests/integration/t402-tla-module-deps.test.ts` | 19 | 0 | 40 | 0 |
| `tests/integration/t403-tla-loader-generalization.test.ts` | 12 | 0 | 36 | 0 |
| **計** | **65** | **0** | **198** | **0** |

coverage は `cid:code-generation:c1-coverage-single-owner` に従い未実行。**最大 tNNN は t480** — 後続 Bolt は t481 以降を採ること。

## Current decisions

1. **患部は「パス参照の付け替え + validator 定数の再定義 + digest 再ピン」で閉じるクラス**であり、意味論変更を含まない。ただし正準パスはスキーマレベルで固定されているため、機械的文字列置換ではなく validator 定数（生成関数 `tlaModelPath` / `tlaCfgPath` と auxiliaries の dirname 固定）の定義変更を要する。
2. **移設は watch ハッシュの drift として必ず検出される**（`computeSpecHash` は相対パスを fold）。設計どおりの挙動であり、「落ちる実証で閉じる」方針と整合する。model-map の identity は不変で、再ピン対象は map 内の `path` 値5箇所。
3. **現行の spec 層は space 非依存のルート固定**であり、`activeSpace()` は formal-verif 系から未参照（grep exit 1 実測）。space 配下への移設は「監視対象を所有するルート」の再宣言を意味し、ノルム `cid:code-generation:cg-watch-root-separation`（`project.md:408`）の解釈を設計段で明示する必要がある。
4. **全域 826 occurrences / 264 ファイルのうち actionable は 80 ファイル / 358 行**（core 6/27 + plugins 10/28 + specs/tla 5/10 + docs 8/21 + tests 51/272）。残り 184 ファイル / 369 行は歴史記録・派生キャッシュ・ノルム層で書換禁止。`dist/` の 477/138 は生成物で `bun run build` が追従する。
5. **区間内変更**: 85 commits / 1232 files の大半は docs/metrics ノイズだが、影響面（`specs/tla/` 本体・model-map ツール・センサー・`plugins/formal-model-check/`・ci.yml）への着地があり影響面は生きている（10 ファイルを実測確認）。外部依存の変化なし。

## Requirements Analysis へ送る裁定事項

1. **active-space 解決規則**（Developer scan open question 1、reviewer-1 未解決1 と一致）: どの space の `specs/tla` を watch・実行対象にするか（active-space カーソル連動 / explicit 指定 / 固定）。現行コードに機構なし。
2. **`specs/tla-evidence` の扱い**（open question 2、reviewer-2 未解決2）: 移設対象に含めるか。含める場合、watch glob 外に置く ADR（`260804-tla-authoring/inception/application-design/memory.md:19`）との整合をどう取るか。
3. **watch 基底の再宣言**（open question 3）: `specRootForHost = dirname(hostRoot)`（プロジェクトルート）を維持して glob だけを `amadeus/spaces/<space>/specs/tla/**` に変えるか、所有ルート自体を space 配下へ再宣言するか — `cid:code-generation:cg-watch-root-separation` の解釈を確定する。
4. **複数 space 時の model-map 解決**（open question 4）: space 切替で map・digest pin・センサー対象がどう切り替わるか。
5. **`docs/amadeus-files.{md,ja.md}` の layout 追記**: `amadeus/spaces/<space>/` 配下の layout 定義に `specs/` エントリが存在しない（grep exit 1 実測）。新設される `spaces/<space>/specs/{rfc,tla}` を正本 layout へ追記する形を要件段で確定する。
6. **移設告知（migration notice）の設計**: advisory 文言（`:229,:231,:233,:304-305`）は audit 実記録を持つユーザー可視契約であり、移設で文言ごと変わる。配布先 workspace（8ハーネスの dist + self-install 面）で新パスが規約として機能することの告知形（文言の新旧併記期間、docs の移行ガイドの有無）を要件段で確定する。

## 更新した成果物

- `business-overview.md` / `architecture.md` / `code-structure.md` / `api-documentation.md` / `component-inventory.md` / `code-quality-assessment.md` — 本 intent の現在断面を substantive に追加
- `technology-stack.md` / `dependencies.md` — 区間内にスタック・外部依存の変化がない旨の最小追記（1節）
- `reverse-engineering-timestamp.md` — 現在節を追加し、旧「現在」マーカー3件を履歴へ降格
- 旧「現在」マーカー（`260805-cross-harness-resume` / `260805-subagent-type-guard` / `260805-semi-redefine-autonomy-f`）は全 9 成果物で本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`。`grep -n "、現在、\|（現在:" amadeus/spaces/default/codekb/amadeus/*.md` の残存ヒットが本 intent の節のみであることを機械確認）
- 履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）
- 本ファイル `re-scans/260807-tla-specs-relocation.md`（新設）
