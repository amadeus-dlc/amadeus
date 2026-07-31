# 260730-open-bug-batch-3 差分スキャン記録

## 実行メタデータ

- Date: `2026-07-30T23:40:33Z`
- Repository: `amadeus-dlc/amadeus`
- Base commit: `a38a1f4d3`
- Observed commit: `3f73823b1cf5969836faa22dfa333b48b933f2fc`
- Distance: `25 commits`
- Ancestry: `a38a1f4d3` は observed の祖先（`git merge-base --is-ancestor a38a1f4d3 HEAD` exit 0）
- Scope: `self-fix` / Brownfield / single repository
- Scan mode: Developer static live-code scan を上流入力にした differential refresh。Architect の引用再確認あり。テスト未実行。
- Focus: [#1773](https://github.com/amadeus-dlc/amadeus/issues/1773)、[#1772](https://github.com/amadeus-dlc/amadeus/issues/1772)、[#1752](https://github.com/amadeus-dlc/amadeus/issues/1752) の3バグの機序確定と修正面候補の特定
- Delivery: 1 Issue = 1 Bolt = 1 GitHub Pull Request。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)

## Base 選定根拠

既存 codekb に記録済みの observed 3件はいずれも現 HEAD の**祖先ではない**。

| 記録済み observed | 出自 intent | `git merge-base --is-ancestor <observed> HEAD` |
| --- | --- | --- |
| `c42ef4d77` | 260730-open-bug-batch-2 | exit 1（非祖先） |
| `278d61d8e` | 260730-skill-reviewer-fixes | exit 1（非祖先） |
| `22ee27dbe` | 260729-open-bug-batch | exit 1（非祖先） |

squash マージ運用で record ブランチの observed が `main` に残らない既知現象である。`cid:reverse-engineering:rescan-base-ancestry`（日付最新ではなく HEAD の祖先である observed のうち距離最小を選ぶ）に従い、merge-base 復元で祖先性を実測確認した `a38a1f4d3` を差分 base として採用した（`git merge-base --is-ancestor a38a1f4d3 HEAD` exit 0、`git rev-list --count a38a1f4d3..HEAD` = 25）。

本 intent の observed `3f73823b1` は `origin/main` 系譜のコミットであり、次回 RE での非祖先化を避ける（`cid:reverse-engineering:c2-observed-mainline-commit`）。

既存成果物の履歴節に含まれる file:line は当時の observed 断面に固定されているため、参照する場合は `cid:requirements-analysis:historical-section-cite-check-at-observed` に従い当該 observed で照合する（HEAD 照合は偽陽性を生む）。本区間は `amadeus-orchestrate.ts` に大きな行シフトを与えているため特に注意する（`cid:reverse-engineering:upstream-cite-reresolve-on-shift`）。

## 区間の変化

`a38a1f4d3..3f73823b1` は25コミット、`588 files changed, 52675 insertions(+), 27351 deletions(-)`（`git diff --shortstat`）。生成面（`dist/`）・self-install 6面・`amadeus/` record・`metrics/` を除くソース面は `98 files changed, 9531 insertions(+), 2532 deletions(-)`。

ソース面の内訳（`git diff --numstat` からの機械集計 — `cid:requirements-analysis:numbers-from-command-output-only`）:

| ディレクトリ | files | insertions | deletions |
| --- | --- | --- | --- |
| `tests/` | 43 | 4773 | 505 |
| `packages/framework/core/` | 30 | 3023 | 1945 |
| `docs/` | 10 | 156 | 24 |
| `packages/framework/harness/` | 8 | 12 | 7 |
| `scripts/` | 4 | 1492 | 19 |
| `.github/` | 2 | 74 | 31 |
| `specs/` | 1 | 1 | 1 |

主要な変化:

| 変化 | 内容 |
| --- | --- |
| 自動起票 finding capability（#1744 `d56e76ddd`） | GitHub 汎用ゲートウェイ（`amadeus-github-gateway.ts` +953）と階層設定リゾルバ（`amadeus-layered-config.ts` +610）を mirror 専用実装から抽出。`gh` spawn の唯一の不純エッジを `amadeus-process-runner.ts`（+306）へ集約。新キー `auto-file-findings`（`:51`）。抽出元は `amadeus-mirror-config.ts` −689 / `amadeus-mirror-gateway.ts` −911 / `amadeus-mirror-runner.ts` −310 と縮小 |
| sensor 発火 scope 限定（#1758 / #1770） | `amadeus-sensor-invocation.ts`（+118）が宣言 outputs を `sensor-invocation.json` へ投影し、`hooks/amadeus-sensor-fire.ts:27` が exact-path allowlist として消費。前 intent #1742 の構造的解決 |
| degrade unit 一意解決（#1774） | `unitDirsUnderConstruction`（`amadeus-orchestrate.ts:3054`、呼び出し `:3264`）による engine 側 `{unit-name}` 解決・非一意 fail-closed・`directive.unit` 搬送。前 intent #1711 の解決 |
| mirror initial-create boundary（#1791 `ffb68c484`） | 新 boundary kind `intent-initialized`（`amadeus-mirror-types.ts:28`）、policy（`amadeus-mirror-policy.ts:65`）、新 state フィールド `Mirror Initial Create Receipt`（`amadeus-state.ts:320`）と新サブコマンド `mirror-initial-create`（`:913`）。前 intent #1750 の解決 |
| metrics 公開パイプライン（#1761） | `scripts/metrics-publication{,-domain,-github}.ts`（+114 / +701 / +656）、`metrics-maintenance.yml` 新設 |
| 契約の焼き込み（#1776 / #1782） | phase-check 正名化と auto-solo 選挙フックの `stage-protocol.md` 焼き込み（コード変更ゼロ）。前 intent #1749 / #1735 の解決 |
| record 同期 / metrics スナップショット | #1794 ほか15コミット（`codekb/metrics/**` のみ） |

構成カウント（`ls` / `git ls-tree` 実測）:

| 面 | base `a38a1f4d3` | observed `3f73823b1` |
| --- | --- | --- |
| core tools `*.ts` | `79` | `88`（**新規9件**） |
| core sensors | `7` | `7`（不変） |
| core hooks | `12` | `12`（不変） |
| core scopes | `10` | `10`（不変） |

新規 core tools 9件（`git diff --name-status a38a1f4d3 HEAD -- packages/framework/core/tools/ | grep '^A'`）: `amadeus-github-gateway.ts` / `amadeus-github-types.ts` / `amadeus-layered-config.ts` / `amadeus-process-runner.ts` / `amadeus-contained-file.ts` / `amadeus-finding.ts` / `amadeus-finding-types.ts` / `amadeus-finding-capability.ts` / `amadeus-sensor-invocation.ts`。

**含意**: 本区間は前 intent（260730-open-bug-batch-2）の5件のうち4件（#1750 / #1749 / #1742 / #1735）が構造的に解決された断面である。本 intent の3件はいずれもこれらと機構が重ならない。

## Developer Code Scan の合成結果

| Issue | 判定 | 確定事項 | 根因確度 | 主対象 | 欠落テスト |
| --- | --- | --- | --- | --- | --- |
| #1773 | **現存** | 未開票中の全票本文（`goa` / `reservation` / `rationale` = `amadeus-election-model.ts:134-136`）が単一共有 tracked ファイル `ledger.json` に平文で載る（`amadeus-election-store.ts:464-465`）。blind lift（`materialize` `:500`、コメント `:498`）は tally 時のみで collecting 中は保護対象外。voter subagent は選挙ディレクトリを直接触る（`SKILL.md:51`）。`ledger.json` は git tracked（`git check-ignore` exit 1、tracked 183件）のため `git status` / `git diff` が第2の露出面。`timeline.json` にも投票済み者が可視（`:468` / `:472`） | 機序 100%／**方式裁定が未決** | `amadeus-election-store.ts`（appendBallot / ledger / materialize / status）、`LedgerFile` 型、`.gitignore`、`SKILL.md`、13配布面同期 | **blind 性を assert するテスト 0件** |
| #1772 | **現存** | `Choice`（`:48`）は `{ internalNo, label }` のみで description を持たない。`parseChoices`（`:73`）はホワイトリスト再構成で、`:79` の型検査後 `:80` が2フィールドだけを push — 未知フィールドは exit 0 のまま無音 drop（fail-open）。`DistributionView`（`:306-310`）に `question` が無く、投票者は設問文すら受け取らない | 100% | 型 / parse / view render（`shuffleView` `:338`）/ record render / tally（`choiceCounts` `:488-496`）/ docs / `SKILL.md:18` / 13配布面同期 | 3重固定（型 `:306-310` / 設計コメント `:304-305` / `tests/unit/t234-election-model.test.ts:190` `:192`）の改訂を要する |
| #1752 | **現存**（#1791 着地後も再現経路温存） | `amadeus-orchestrate.ts:4255` の `(answer === "create" && hasMirrorIssue)` が report 実行時点の state 再評価（`:4241-4242`）に立つため、ask の指示（`:519-529` で「先に create を実行せよ」）に従うと自分の成功が拒否条件になる自己矛盾。#1791 の初回 create 分岐（`:486-500`）は `:488` の auto モード優先により prompt モードで従来 ask 経路へ落ちる。`sync` / `skip` には対応する state 照合が無い片側実装 | 100% | `:4219-4278` の report 分岐。方式は (a) create receipt の存在判定（`classifyReceipt` 語彙）か (b) ask 時 binding 永続化（`amadeus-mirror-coordinator.ts` の `expectedPrompt` 照合 `:320` / `:560` / `:622` / `:742-746` が既習様式） | `tests/integration/t265-engine-boundary.integration.test.ts:793` の fixture は「offer されていない create」と「offer された create を実行済み」を区別できず分岐が要る |

## Architect Synthesis

3件は「選挙の情報設計が投票者・非投票者の双方に対して誤っている（#1773 / #1772）」と「mirror の指示と受理条件が矛盾する（#1752）」の2系統に分かれる。#1773 と #1772 は方向が逆で相補的である — 前者は「見えてはいけないものが見える」、後者は「見えるべきものが見えない」。同一 intent で扱うことで `Election.parse` の write⇔read 対称性という共通の設計面を1度で棚卸しできる。

### 依存と順序

**前 intent までと異なり、3件すべてが非交差ではない。**

| 組 | 交差 | 判定 |
| --- | --- | --- |
| #1773 × #1772 | **交差する** — 両者とも `amadeus-election-model.ts` を触る（#1773 は `OriginalBallot` `:134-136`、#1772 は `Choice` `:48` と `DistributionView` `:306-310`） | 直列化するか、実 diff で行レンジの非交差を確認してから並行させる（`cid:code-generation:c6` — 静的目録でなく実 diff で再評価する） |
| #1773 × #1752 | 非交差 | 並行可 |
| #1772 × #1752 | 非交差 | 並行可 |

3件とも `packages/framework/core/` を正本とし、`bun scripts/package.ts` → dist 7ハーネス → `bun run promote:self` → self-install 5面という同一の再生成チェーンを通る。ファイル単位で非交差でも生成面が競合するため着地順は実 diff で再評価する。#1752 は他2件と完全に非交差のため先行着地できる。

### 要件段へ持ち越す裁定事項

- **#1773 の修正方式が未裁定（最重要）**: 格納分離（票ごとの分割 / 暗号化 / 非 tracked 化）と通知抑制（読取経路の遮断）で修正面の広さが大きく変わる。`.gitignore` を触る場合、tracked な 183件の扱い（履歴からの除去 vs 以後の非追跡）が追加の設計判断になる — `packages/framework/core/` の外側へ出る唯一の経路である。
- **#1773 の受け入れ基準の置き場所**: 設計された配布面（`status` / `vote` 出力 / ShortNotification）と blind lift の設計は**健全**であり、破れているのは格納設計と配置の2点だけである。受け入れ基準を「配布面が blind であること」に置くと既に真である命題を検証することになり検証劇場になる（org.md Forbidden）。基準は collecting 中の格納面と git 面に置く。
- **#1772 はテスト契約の明示改訂を伴う**: 配布ビューのキー集合は型（`:306-310`）・設計コメント（`:304-305`、`BR-2 pins the key set`）・テスト（`t234:190` `:192`）の3重で固定されている。ただし BR-2 が禁じているのは「推薦マーカー・先行票・peer status」であって設問文ではない。3重固定は「バグでない」ことの証明ではなく**変更に裁定が要ることの証明**であり、実装段で着手せず要件段で仕様裁定とテスト契約の改訂をセットで確定する（`cid:reverse-engineering:c1-pinned-behavior-ruling`、`cid:code-generation:cg-invariant-conflict-explicit-revision`）。
- **#1752 を #1791 の着地で閉じない**: 関連機能（`intent-initialized` boundary）が本区間で着地しているが、prompt 経路の自己矛盾は温存されている。着地面の実読で閉包を確認する（`cid:requirements-analysis:close-after-landing-verification`）。
- **同根パターンの棚卸し**: 3件のうち2件（#1772 / #1752）が write⇔check / write⇔read 非対称クラスタに属する。前 intent の #1734（apply⇔check）・#1711（produces⇔consumes）に続き3 intent 連続で同型が観測されており、修正時は他の対操作（resolve⇔commit、emit⇔terminal、fork⇔merge）にも同型が無いか棚卸しする（`cid:requirements-analysis:symmetric-pair-review`、`cid:code-generation:same-root-inventory`）。
- **#1772 の同根（本 Issue のスコープ外だが要記録）**: `OriginalBallot` の `reservation`（`:135`）/ `rationale`（`:136`）も書かれるが配布ビューには現れない。空 `label` の通過、未知フィールドの無音 drop は `Election.parse` 全体の方針であり、#1772 単体の欠陥ではなく設計方針の帰結である。スコープをどこで切るかを要件段で明示する。

### 修正境界

- **#1773**: `amadeus-election-store.ts` の格納層に閉じるのが最小形。`.gitignore` へ波及する場合のみ core 外へ出る。core 正本のため 7 dist + 5 self-install 再生成（`cid:build-and-test:bt-dist-regen-seven-harnesses`）。
- **#1772**: `amadeus-election-model.ts` の型拡張は store・tally（`choiceCounts` `:488-496`）・record render へ下流伝播する。概念の追加・改名は全成果物 grep で伝播漏れを検査する（`cid:functional-design:c3`）。
- **#1752**: `amadeus-orchestrate.ts` 内で閉じる。修正候補 (b) は `amadeus-mirror-coordinator.ts` の既習様式の踏襲であり新規依存の追加ではない。
- core 正本変更は 7 dist + 5 self-install へ再生成し、生成物を独立編集しない（project.md Forbidden）。

### プロセス所見（本 intent の患部外）

本区間で追加されたテストに**番号重複が3組**ある（`ls tests/integration tests/unit` の実測）:

| 番号 | ファイル |
| --- | --- |
| `t366` | `t366-amadeus-finding-cli.integration.test.ts` / `t366-amadeus-finding-coordinator.test.ts` / `t366-skill-new-intent-verb.test.ts` |
| `t367` | `t367-amadeus-finding-protocol.integration.test.ts` / `t367-degrade-unitname-resolution.test.ts` |
| `t368` | `t368-amadeus-finding-cli.integration.test.ts` / `t368-phase-check-name-contract.test.ts` / `t368-safe-contained-file.integration.test.ts` |

`cid:code-generation:swarm-test-number-reservation`（並列ディスパッチ時のテスト番号事前予約）が守られなかった実測である。本 intent が新規テストを追加する場合、採番は `t371` より後を使う（`t369` / `t370` / `t371` は各1件で埋まっている）。テスト引用は `tNNN` 短形でなくフルパスで書く（`cid:requirements-analysis:mechanism-cite-verify-at-draft` 追補 — 同一番号の複数ファイル共存が実在する）。

なお本 intent は `self-fix` スコープで走り units-generation を SKIP するため degrade 経路を自ら通るが、本区間の #1774 着地により conductor の手動 directive 解決は不要である（`cid:build-and-test:c1-degrade-interim-retired`）。手動解決が再び必要になった場合は退行として扱い Issue 起票する。

## 引用再確認の結果（Architect が observed `3f73823b1` で独立再実測）

| 対象 | Developer 報告 | 再実測 | 判定 |
| --- | --- | --- | --- |
| observed / base 祖先性 | `3f73823b1` / `a38a1f4d3` exit 0 | `git rev-parse HEAD` = `3f73823b1cf5969836faa22dfa333b48b933f2fc`、`--is-ancestor` exit 0 | 一致 |
| Distance | 25 | `git rev-list --count` = 25 | 一致 |
| ソース面規模 | `97 files / +9,530 / −2,531` | `98 files changed, 9531 insertions(+), 2532 deletions(-)`（`dist` / self-install 6面 / `amadeus` / `metrics` 除外） | 実質一致（除外集合の定義差で1ファイル分の差） |
| core tools 件数 | 新規9モジュール | base `79` → observed `88`、`^A` 実測で9件 | 一致 |
| sensors / hooks / scopes | 件数不変 | `7` / `12` / `10`（いずれも base と同数） | 一致 |
| #1773 ledger 書込 | `:464-465` | `:464` `const next: LedgerFile = …` / `:465` `writeStoreFile(ledgerPath, …)` | 一致 |
| #1773 blind lift | `materialize :498-518` | コメント `:498`、関数宣言 `:500` | 一致（宣言は `:500`） |
| #1773 票内容 | `:134-136` | `goa` `:134` / `reservation` `:135` / `rationale` `:136` | 一致 |
| #1773 timeline 可視 | `:467-472` | `kind: "ballot"` `:468` / `voter` `:472` | 一致 |
| #1773 SKILL 手順 | `SKILL.md:51` | `:51` verbatim 確認 | 一致 |
| #1773 git tracked | `check-ignore` exit 1 | exit 1、tracked `ledger.json` = 183件 | 一致 |
| #1773 hooks 配信機構 | 「0件」 | `grep -rn 'ledger' .claude/hooks/` は**3ヒット**（`amadeus-mint-presence.ts:4` / `:37`、`amadeus-audit-logger.ts:67`）。全件実読の結果いずれも監査シャードの append-only ledger を指す語彙で選挙 ledger と無関係 | **結論一致・過程を精密化**（`cid:requirements-analysis:absence-claim-grep-verify`） |
| #1772 `Choice` 型 | `:48` | `:48` verbatim 確認 | 一致 |
| #1772 parse 無音 drop | `:79-80` | 型検査 `:79`、再構成 `:80`、関数宣言 `:73`、呼び出し `:92` | 一致 |
| #1772 `DistributionView` | `:306-310` | 宣言 `:306`、フィールド `:307-309`、BR-2 コメント `:304-305` | 一致 |
| #1772 テスト固定 | `t234:190-192` | キー集合 `:190`、entry キー集合 `:192` | 一致 |
| #1772 view / tally | `shuffleView :337-356` / `choiceCounts :485-496` | 宣言 `:338`、`choiceCounts` 構築 `:488` / 消費 `:493-494` / `:500`、`ChoiceCount` 型 `:427` | **精密化**（宣言行は `:338` / `:488`） |
| #1752 拒否条件 | `:4251-4255`、state 再評価 `:4242` | 条件式 `:4252-4256`、患部節 `:4255`、`expectedPhase` `:4241` / `hasMirrorIssue` `:4242` | **精密化**（条件式の範囲） |
| #1752 #1791 分岐 | `:477-500`、prompt 降格 `:479` | 分岐 `:486-500`、`initialCreateIsOutstanding` 判定 `:487`、prompt 降格 `:488`（宣言 `:373`、別呼出 `:421`） | **精密化**（降格行は `:488`）。結論（prompt 経路の再現温存）は一致 |
| #1752 fixture | `t265:791-810` | `:793` `["unoffered create", "inception", "create"],` | **精密化**（fixture 行は `:793`） |

**総括**: Developer 報告の所在・機序・結論は**全件一致**。相違は行範囲表記の精密化5点と、不在主張1件の過程の精密化（結論は同一）に留まり、いずれも修正方針に影響しない。
