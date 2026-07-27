# 再スキャン記録 — 260727-docs-impl-sync（docs と実装の乖離の同期）

上流入力（consumes 全数）: 本 intent の reverse-engineering ステージ Step 2（Developer スキャン結果）

- Developer スキャン結果 — base 選定の全数祖先判定（80 SHA）、区間規模と面別内訳、乖離クラスタ §4a-4c、非欠陥判定 §4d-4e、docs 構造スナップショット §5 を引き継いだ。**file:line・件数はすべて本 Step 3（Architect 合成）で observed `aabc0527d` に対して再実測し、不一致は下記「上流主張の再実測と訂正」に記録した。**

## メタ

| 項目 | 値 |
| --- | --- |
| Date | `2026-07-27` |
| Base commit | `1673c433209c74820881c75a0816bbce3fb2d512`（`chore(metrics): record snapshot (#1501)`、2026-07-26） |
| Observed commit | `aabc0527d96344420cf8236967763b81ce82ac83`（= 現 HEAD、`git rev-parse HEAD` 実測。ブランチ `main`） |
| 祖先性 / 距離 | `git merge-base --is-ancestor 1673c4332 HEAD` exit **0** / `git rev-list --count 1673c4332..HEAD` = **47** |
| 区間規模（全体） | **1602 files changed, 282182 insertions(+), 6842 deletions(-)** |
| 区間規模（record 除外） | **1034 files, +212379 / -6817** |
| Scope | `amadeus-document`、Brownfield、単一 repo `amadeus` |
| 方式 | 差分リフレッシュ（cid:reverse-engineering:c1）。フルスキャン不実施 |
| 測定 ref | 全 file:line・件数は observed `aabc0527d` の実ファイル直読、および `git rev-parse` / `git merge-base --is-ancestor` / `git rev-list --count` / `git diff --shortstat` / `git diff --numstat … \| awk` / `git diff --name-only … \| sed \| sort \| uniq -c` / `git show <base>:<path>` / `grep -ci` / `grep -c` / `grep -o … \| wc -l` / `ls -d … \| wc -l` / `find … \| wc -l` / `wc -l` 出力からの転記（cid:reverse-engineering:measurement-ref-in-artifacts、cid:requirements-analysis:numbers-from-command-output-only） |

## Focus

区間で着地した **7 番目のハーネス（Kimi Code）** と **plugin walking skeleton（CLI + 12 番目 hook + エンジン移設）** が、利用者向け docs のハーネス数・投影面数・hook 数の記述へ伝播していない。本 intent は実装を変えず、docs 側の乖離を同期する。

## base 選定の経緯（squash 運用起因の非祖先 observed 群）

conductor がブリーフィングした base `ad1ff5de9`（前 intent `260726-answer-manual-binding` の observed）は `git merge-base --is-ancestor ad1ff5de9 HEAD` = **exit 1 = 非祖先**で採用不能だった。

`re-scans/` 71 ファイル + ledger から抽出した **80 SHA** を全数祖先判定した結果:

| 区分 | 件数 |
| --- | --- |
| 祖先 | **30** |
| 非祖先 | **49** |

直近 5 observed の判定（全て非祖先）:

| SHA | 由来 intent | 判定 |
| --- | --- | --- |
| `ad1ff5de9` | 260726-answer-manual-binding | **非祖先** |
| `09c669901` | 260726-t258-p95-flake | **非祖先** |
| `f9a0fb86a` | 260726-mirror-state-split | **非祖先** |
| `e39402224` | 260726-mirror-envelope-lf | **非祖先** |
| `0d83aa48b` | （前世代） | **非祖先** |

祖先のうち距離最小の候補:

| SHA | 距離 |
| --- | --- |
| **`1673c4332`（採用）** | **47** |
| `e12259ba7` | 49 |
| `11f1ad61f` | 53 |

**機序**: org.md § Way of Working が定める Bolt worktree の**スカッシュマージ**運用により、worktree 上で記録された observed SHA は `main` の履歴に存在しない。cid:reverse-engineering:rescan-base-ancestry の「日付最新でなく HEAD の祖先かつ距離最小を選ぶ」に従い `1673c4332` を採用した。結果として本 scan の区間は前 5 intent が非祖先 base で部分的にしか走査できなかった面を包含する（cid:reverse-engineering:rescan-prompt-record-sync が警告する base 退行の実例）。

## 区間サマリ

トップレベル内訳（`git diff --name-only 1673c4332..HEAD | sed 's|/.*||' | sort | uniq -c`、record `amadeus/` 除外）:

| 面 | ファイル数 |
| --- | --- |
| `dist` | 444 |
| `.kimi-code`（**新規セルフインストール面**） | 294 |
| `tests` | 109 |
| `packages` | 42 |
| `.claude` | 25 |
| `.opencode` | 24 |
| `.codex` | 23 |
| `.cursor` | 22 |
| `metrics` | 18 |
| `docs` | 18 |
| `scripts` | 7 |
| その他（`.agmsg-ballots` 3 / `specs` / `CLAUDE.md` / `AGENTS.md` / `.gitignore` / `.github`） | 8 |

**生成物面 = 832**（dist 444 + セルフインストール 5 面 388）、**正本コード = 49**（`packages/framework` 36 + `packages/setup` 6 + `scripts` 7）。

主要実装変更（PR 番号は `git log --oneline 1673c4332..HEAD` 実測）:

1. **Kimi Code ハーネス追加**（#1522 / #1549 / #1551）— `packages/framework/harness/kimi/` 8 ファイル、`.kimi-code/` 294 ファイル
2. **plugin walking skeleton**（#1554）— `core/tools/amadeus-plugin.ts` +454 新設、`scripts/plugin-composition.ts` → `core/tools/amadeus-plugin-compose.ts` 移設（+111/-7、現 1469 行）、`core/hooks/amadeus-plugin-compose.ts` +23（12 番目 hook）
3. **metrics ダッシュボード**（#1500 / #1504）— `scripts/metrics-visualize.ts` +292 新設、`metrics/*.json` = 141 件
4. **mirror v1 統一**（#1553 / #1559 / #1537）— legacy「Mirror Issue」読取全廃、`amadeus-mirror.ts` +73/-303 → 357 行、mirror 系 16 モジュール
5. **election 強化**（#1517 / #1516 / #1523）— `amadeus-election.ts` +61/-16
6. **CI 分割・bench ゲート**（#1528 / #1507 / #1508 / #1557）

## 乖離クラスタ A — README のハーネス数（区間内で導入）

| 所在 | 現記述 | 実態 |
| --- | --- | --- |
| `README.md:5` | "inside **six** coding-agent harnesses" | 7 |
| `README.md:67` | "extending the four shipped upstream to **six**" | 7 |
| `README.md:78-83` | ハーネス表 6 行（Kimi 行なし） | 7 |
| `README.ja.md:5` | 「**6つ**のコーディングエージェントハーネス」 | 7 |
| `README.ja.md:78-83` | 同表 6 行 | 7 |

- `grep -ci kimi README.md` = **0** / `grep -ci kimi README.ja.md` = **0**
- 実態: `ls -d packages/framework/harness/*/ | wc -l` = **7**（claude / codex / cursor / kimi / kiro / kiro-ide / opencode）
- `git diff --name-only 1673c4332..HEAD -- README.md README.ja.md` = **0 行** → **区間内で発生した陳腐化**（#1522 が README を同一変更で更新しなかった。project.md § Mandated の paired EN/JA docs 同時更新規範への実測違反）
- 対照（正）: `docs/guide/harnesses/README.{md,ja.md}` は区間内で更新され Kimi 行を持つ

## 乖離クラスタ B — plugin 投影面数（区間内で導入）

| 所在 | 現記述 |
| --- | --- |
| `docs/guide/19-plugins.md:14-15` | "the **six** packaged harness faces differ from the **four** self-install faces" |
| `:70` | "projects every plugin into the **six** packaged" |
| `:131` | "projects into all **six**" |
| `:148` | 見出し "Six packaged faces, four self-install faces" |
| `:150-156` | 6 面の明示列挙（**kimi なし**）+ "the four is never widened to six" |
| `docs/guide/19-plugins.ja.md` | 「6 つのパッケージ面、4 つのセルフインストール面」で同型 |

- 両ファイル `grep -ci kimi` = **0**
- 実態: `scripts/plugin-projection.ts:41-49` `PACKAGE_HARNESSES` = **7** / `:55` `SELF_INSTALL_HARNESSES` = **5**
- base 断面: `git show 1673c4332:scripts/plugin-projection.ts` の `:46-53` = 6 / `:59` = 4 → **6→7 / 4→5 の遷移は本区間内**
- `git diff --name-only … -- docs/guide/19-plugins.md docs/guide/19-plugins.ja.md` = **0 行**（未追随）
- **実害の性格**: 単なる数値ずれでなく**列挙の欠落**。読者が「Kimi にはプラグインが投影されない」と誤読しうる

## 乖離クラスタ C — EN/JA 対訳の非同期（8 ファイル、区間内で導入）

12 番目 hook 着地に伴い EN 側 **8 ファイル**が更新され、**JA 対訳は 0 件**。

EN 専用変更 8 件（`git diff --name-only 1673c4332..HEAD -- docs/` の 18 件から抽出）:
`docs/amadeus-files.md` / `docs/guide/01-getting-started.md` / `docs/guide/12-cli-commands.md` / `docs/guide/15-troubleshooting.md` / `docs/guide/glossary.md` / `docs/reference/01-architecture.md` / `docs/reference/06-hooks-and-tools.md` / `docs/reference/11-contributing.md`

JA 側の残存旧数値:

| 所在 | 残存記述 | 出現 |
| --- | --- | --- |
| `docs/reference/06-hooks-and-tools.ja.md:5` / `:13`(×3) / `:15` / `:50` / `:496` | 「11個」 | **7 出現 / 5 行** |
| `docs/guide/15-troubleshooting.ja.md:39` | 「11 個すべての TypeScript フック」+ 11 個の列挙（`amadeus-plugin-compose.ts` 欠落） | 1 |
| `docs/guide/glossary.ja.md:45` | 「11 個のフックを使い」 | 1 |
| `docs/reference/01-architecture.ja.md:476` | 「11個のフック」 | 1 |

- `grep -c 'plugin-compose' docs/reference/06-hooks-and-tools.ja.md` = **0**（EN = **2**）
- 実態: `ls packages/framework/core/hooks/ | wc -l` = **12**
- **情報格差**: JA 読者は 12 番目の hook（plugin 自動合成）の存在自体を知る手段を持たない

## 未裁定仮説（欠陥断定しない）

EN 側 8 ファイルのうち 6 ファイルは**件数語を除去**（count-free 化、cid:code-generation:count-comment-sync-on-catalog-change の推奨形）で是正された一方、`docs/reference/06-hooks-and-tools.md` は**硬数値**を採用: `:5`「all **twelve** hook scripts」/ `:13`「uses **twelve** … All **twelve** are TypeScript … the other **eleven** via the `hooks` block」/ `:15`「**Eleven** of the **twelve** are non-blocking」/ `:52`「All **twelve** TypeScript hooks」。

どちらを正準様式とするかは**判断事項**として記録し、本 RE では欠陥と断定しない。事実として、硬数値を維持する限り 13 番目の hook 着地時に同じ手動同期負債が再発する。

## 非欠陥判定（スコープ膨張防止のため明示記録）

- **(D)** `docs/reference/06-hooks-and-tools.md` に CLI ツール目録 46 件の全数記載がないことは**欠陥でない** — 当該章は hook システム・監査イベント分類・ツール設定を扱う章であり、全ツール網羅は章スコープ外。「不在」を欠陥として起票すると章の責務境界を壊す。
- **(E-1)** 「11 domain-expert agents」を主張する docs 20 ファイルは**正** — `ls packages/framework/core/agents/*.md | wc -l` = **14** は 11 domain-expert + reviewer 2（architecture-reviewer / product-lead）+ composer 1 の内訳。
- **(E-2)** ただし `docs/reference/01-architecture.md:60`「**Eleven** flat agent files」/ `.ja.md:60`「**11個**のフラットなエージェントファイル」は**誤**（flat agent files = 14）。これは**区間外の pre-existing** 乖離であり、本 intent のスコープに含めるかは requirements-analysis で裁定する（含めない場合は Issue 化して追跡）。

## docs 構造スナップショット

- `find docs -name '*.md' | wc -l` = **197**（EN **100** / JA **97**）
- ディレクトリ別: `docs` 4 / `guide` 54 / `guide/agents` 24 / `guide/harnesses` 14 / `harness-engineering` 20 / `reference` 44 / `reference/04-stages` 10 / `reference/agents` 24 / `research` 3
- 非対訳 EN **3 件**: `docs/guide/team-messaging.md` / `docs/guide/publishing-setup.md` / `docs/research/upstream-sync/reports/v2.2.0-to-v2.3.0-plan.md`（research 配下が対訳対象外かは**仮説**、裁定は後続）
- 孤児 JA **0 件**

## 共通機序

3 クラスタとも「**実装側に単一の機械可読な正準定義があるのに、docs 側で手書き数値・手書き列挙として複製している**」ことが機序である。真実源は `packages/framework/harness/*/`（ハーネス）、`scripts/plugin-projection.ts:41-49` / `:55`（投影面）、`packages/framework/core/hooks/*.ts`（hook）。construction.md § Code Completeness の「canonical な1定義から導出するか、ディスクから discover する」がコード面のみに適用され docs 面へ及んでおらず、加えて **docs 面には `dist:check` / `promote:self:check` に相当するドリフトガードが存在しない**ため、乖離は CI で検出されない。

## 上流主張の再実測と訂正

Architect 段の独立再検証で observed `aabc0527d` に対し全数 spot-check し、**訂正 2 件**を確定した（cid:reverse-engineering:cite-shift-vs-nonshift-separation、cid:requirements-analysis:mechanism-cite-verify-at-draft）。

| # | 上流主張 | 実測 | 判定 |
| --- | --- | --- | --- |
| 1 | `kimi-hooks.ts +401（新）` | **当該ファイル名は実在しない**。実体は `harness/kimi/hooks/amadeus-kimi-lib.ts` **+352** と `amadeus-kimi-adapter.ts` **+28**（`git diff --numstat` 実測） | **訂正** |
| 2 | docs 変更 **20** | `git diff --name-only … \| grep -c '^docs/'` = **18** | **訂正** |
| 3 | base 祖先性 exit 0 / 距離 47 | 一致 | 一致 |
| 4 | briefed base `ad1ff5de9` 非祖先 exit 1 | 一致 | 一致 |
| 5 | record 除外 1034 / +212379 / -6817 | 一致 | 一致 |
| 6 | harness 7 | `ls -d … \| wc -l` = 7 | 一致 |
| 7 | `PACKAGE_HARNESSES`=7 `:41-49` / `SELF_INSTALL_HARNESSES`=5 `:55` | 一致（ファイルは `scripts/plugin-projection.ts`） | 一致 |
| 8 | hook 12 | `ls … \| wc -l` = 12 | 一致 |
| 9 | agents 14（11 domain + 2 reviewer + 1 composer） | 一致 | 一致 |
| 10 | docs 197 / EN 100 / JA 97、孤児 JA 0 | 一致 | 一致 |
| 11 | README kimi 0 hit（EN/JA 両方） | 一致 | 一致 |
| 12 | 19-plugins kimi 0 hit（EN/JA 両方） | 一致 | 一致 |
| 13 | EN 専用 8 ファイル | 一致 | 一致 |
| 14 | JA 06-hooks「11個」×5 (:5/:13/:15) | 行数 5 は一致だが**所在は `:5`/`:13`/`:15`/`:50`/`:496`**、出現は **7** | 精密化 |
| 15 | 15-troubleshooting.ja `:39` / glossary.ja `:45` / 01-architecture.ja `:476` | 一致（表記は「11 個」= 半角スペースあり） | 一致 |

## センサー不適用と代替検証

RE ステージが宣言する 3 センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、以下を代替検証とした。

| 検証 | 手段 | 結果 |
| --- | --- | --- |
| H2 floor（≥2） | 更新 9 成果物 + 本記録へ `grep -c '^## '` | 全件 ≥ 2（結果は最終報告に転記） |
| 上流入力の実参照 | 各成果物本文に「Developer スキャン結果」への参照と乖離クラスタの実測を記載 | 充足 |
| 旧「現在」マーカー降格 | `grep -n '現在' *.md \| grep '^\S*\.md:[0-9]*:## '` の残存確認 | 本 intent 節 4 件のみが「現在」（構造見出し 2 件は intent マーカーでないため対象外） |

## Delivery boundary

本 scan は codekb の差分更新（9 成果物）と本 per-intent 記録のみを成果物とし、**`docs/` 本体・README・正本コード・生成配布物・GitHub Issue・intent record / state / audit への書込は一切行わない**。是正方針は後続の requirements-analysis 以降で裁定する:

1. README（EN/JA）の 6 → 7 とハーネス表 Kimi 行の追加
2. `19-plugins.{md,ja.md}` の 6/4 → 7/5 と面リストへの kimi 追加
3. JA 8 ファイルの対訳同期（hook 11 → 12、roster への `amadeus-plugin-compose.ts` 追加、plugin-compose 記述の移植）
4. EN 側の正準様式（count-free vs 硬数値）の裁定
5. pre-existing な「Eleven flat agent files」（`01-architecture.{md,ja.md}:60`）を本 intent で扱うか Issue 化するか
6. docs 面のドリフトガード導入の是非（構造対策）
