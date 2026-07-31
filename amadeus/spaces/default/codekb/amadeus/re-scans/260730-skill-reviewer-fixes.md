# 260730-skill-reviewer-fixes 差分スキャン記録

## 実行メタデータ

- Date: `2026-07-30T12:39:53Z`
- Repository: `amadeus-dlc/amadeus`
- Base commit: `22ee27dbef9027203658a6cd98bf97501c4b222c`
- Observed commit: `278d61d8efcea278bfefd2b384c22fcf72e717ab`
- Distance: `34 commits`
- Ancestry: `22ee27dbe` は observed の祖先（`git merge-base --is-ancestor` exit 0）
- Scope: `self-fix` / Brownfield / single repository
- Scan mode: Developer static live-code scan を上流入力にした differential refresh。Architect の引用再確認あり。テスト未実行。
- Focus: [#1736](https://github.com/amadeus-dlc/amadeus/issues/1736)、[#1711](https://github.com/amadeus-dlc/amadeus/issues/1711)
- Delivery: 1 Issue = 1 Bolt = 1 GitHub Pull Request。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)

## 区間の変化

`22ee27dbe..278d61d8e` は34コミット、`951 files changed, 54850 insertions(+), 8428 deletions(-)` である。生成面（`dist/`）・self-install 面・record を除く比較断面は `340 files changed, 16513 insertions(+), 2547 deletions(-)`。

主な変更は次の3系統。

1. **`bugfix` → `fix` スコープ改名と `self-*` スコープの集約**（#1683 `dd8532d1c`）。`packages/framework/core/scopes/amadeus-bugfix.md` → `amadeus-fix.md`。自己開発用 `self-*` 4種（`self-document` / `self-feature` / `self-fix` / `self-refactor`）は core にも dist にも置かれず、dogfood 5ハーネスの自己インストール面のみに存在する（tracked 20ファイル = 4 × 5）。整合検査のため新センサー `packages/framework/core/sensors/amadeus-self-scope-consistency.md` と実装 `amadeus-sensor-self-scope-consistency.ts`（231行）が新設された。walking-skeleton 免除集合 `amadeus-lib.ts:4027-4035` に `fix` / `self-fix` / `self-refactor` / `self-document` が加わった。
2. **Kimi caller-authorization の新設**（#1680 / #1716 `8ff40bc48`、#1707 `39b57d92d`）。`amadeus-caller-authorization.ts`（122行）が subagent role による engine state 変更を拒否する。消費側は `amadeus-orchestrate.ts:2108` と `amadeus-state.ts:828` / `:831` の2箇所のみ。
3. **mirror boundary 自動発火とワークフロー完了の2相化**（#1690 `dcb318e6e`、#1689 `c3f4bbf7f`）。`amadeus-workflow-completion.ts`（110行）が完了を2相化しクラッシュ回復を可能にする。`amadeus-orchestrate.ts` は +870行で本区間最大の変化。

core tools は base `76` → observed `79`（新規3件）。sensors は `6` → `7`。hooks `12` と scopes `10` は件数不変（scopes は改名のみ）。

## Developer Code Scan の合成結果

| Issue | 確定事項 | 根因確度 | 主対象 | 欠落テスト |
| --- | --- | --- | --- | --- |
| #1736 | `amadeus-utility.ts` に `next` verb は存在せず（`case "next"` = 0件）`:6182` の `default:` で die。`--new-intent` は `amadeus-orchestrate.ts:2405` / `:2412` に完全実装。SKILL.md 13ファイルの単一箇所ツール名誤り | 100% | 正本 harness SKILL.md 5面 + dist 5面 + self-install 3面 | 指示ツール名を固定する検査（t176 は結果のみ assert） |
| #1711 | degrade 分岐 `:3050-3057` が `directive.unit` を設定せず、produces に `{unit-name}` が残り `amadeus-reviewer.ts:74` が `required review artifact is missing` を throw。consumes には exempt（`:1771-1774`）があり produces には無い | 機序 100%／修正方式は未裁定 | 候補 A = orchestrate degrade、候補 B = reviewer-runtime `scopeForDirective` | degrade スコープでの reviewer scope 貫通検査 |

## Architect Synthesis

2件は「フレームワークが自らの文書・契約どおりに動かない」という共通テーマを持つため1 Intent で追跡できる。一方、所有コンポーネントは完全に分離しており（#1736 = harness SKILL.md の散文層、#1711 = core engine + reviewer 層）、同期対象ファイル集合も重ならないため 1 Issue = 1 Bolt = 1 Pull Request を維持し並行実装可能である（`cid:code-generation:c6` の非交差判定を満たす）。

### 依存と順序

順序制約は**なし**。ただし:

1. #1736 は散文のみで engine 挙動に触れないため先行着地して差し支えない。正本5面は互いに共有がないため5ファイル個別編集が必須。
2. #1711 は**要件段で修正方式（候補 A / B）を裁定してから実装に入る**。現挙動は `t186:351-361` / `t186:490-503` / `t116:380-403` で verbatim にピンされ、`amadeus-orchestrate.ts:3052` のコメントが `Zero behaviour change off this path.` と明示するため、候補 A は設計意図とテスト契約の明示的改訂を伴う。実装者の単独判断で進めない（`cid:requirements-analysis:implementation-deviation-election`）。

### 修正境界

- #1736 は正本5面（claude `:116` / codex `:112` / kimi `:116` / kiro `:118` / kiro-ide `:118`）を編集し、`bun scripts/package.ts` で dist 7ハーネスを再生成、`bun run promote:self` で self-install を同期する。cursor / opencode は SKILL.md を持たず command 面（`:23`）が正しく orchestrate を指すため対象外。
- #1711 は produces / consumes の実在検査の非対称を解消する。修正時は他の対操作（write⇔check、resolve⇔commit）にも同型の片側実装がないか棚卸しする（`cid:requirements-analysis:symmetric-pair-review`、`cid:code-generation:same-root-inventory`）。
- どちらの候補でも `stage-protocol.md:898` の「pass the **unchanged** current `run-stage` directive JSON on stdin」規定との整合を成果物に明記する。現行の運用回避（conductor が実 unit 名へ解決した JSON を渡す）はこの規定からの逸脱を運用で固定している。
- core 正本変更は 7 dist + 5 self-install へ再生成し、生成物を独立編集しない。

## 引用再確認の結果（Architect が observed `278d61d8e` で独立再実測）

| 対象 | Developer 報告 | 再実測 | 判定 |
| --- | --- | --- | --- |
| `amadeus-utility.ts` の `switch (subcommand)` | `:6088` | `:6088` | 一致 |
| 同 `default:` | `:6179` | **`:6182`** | **相違（訂正）** |
| 同 `case "next"` の不在 | 不在 | `grep -c 'case "next"'` = `0` | 一致 |
| orchestrate `--new-intent` 分岐 | `:2405-2412` | `:2405` / `:2412` / `return` = `:2413` | 一致 |
| SKILL 患部の全数 | 13件 | `git ls-files -z \| xargs -0 grep -ln` = 13ファイル、行番号も全一致 | 一致 |
| orchestrate degrade 分岐 | `:3050-3057` | `:3050-3057` | 一致 |
| `UNIT_NAME_PLACEHOLDER` | `:1588` | `:1588` | 一致 |
| missing throw の所在 | `amadeus-reviewer.ts:71-75`（throw `:74`） | `:71-75`、throw `:74` | 一致（Developer が依頼メモの `reviewer-runtime:74` を訂正済み。その訂正が正しい） |
| `t186` test 5 のピン | `:351-361` | `:351` にテスト宣言、`:359` に `{unit-name}` verbatim 期待 | 一致 |
| `stage-protocol.md` の unchanged 規定 | `:897` | **`:898`** | **相違（訂正）** |
| 新規 core tool | 5件（mirror-policy 55行 / team-up-codex-safety-wait 122行 を新設と記載） | **3件のみ**。`git diff --name-status 22ee27dbe 278d61d8e` で `amadeus-mirror-policy.ts` と `team-up-codex-safety-wait.ts` は `M`（base にも実在）。現在の総行数は 514 / 689 で、報告の 55 / 122 は diff 追加行数 | **相違（訂正）** |
| core tools 件数 | 79（base 106 と記載） | observed `79` / base **`76`** | 件数一致、base 値を訂正 |
| sensors / hooks / scopes | 7 / 12 / 10 | 7 / 12 / 10 | 一致 |
| `technology-stack.md` の「6 sensors」陳腐化 | 「最新節 `:26`」 | 当該記述は **`260728-slop-cleanup` の履歴節内**（`## Slop cleanup の技術断面（…履歴、observed ca8ff0af4）`）。履歴節の断面値であり誤りではない（`cid:requirements-analysis:historical-section-cite-check-at-observed`） | **相違（是正対象外と判定）** |
| `code-structure.md:462` の「hooks 配下 11 ファイル」陳腐化 | 陳腐化と指摘 | `resolveProjectDirFromHook` の**実呼び出し行数**が 11（`grep -rn … \| grep -v import \| wc -l` = 11）。hooks 総数 12 とは別の量であり陳腐化ではない | **相違（是正対象外と判定）** |

## 更新成果物

- `technology-stack.md`: 現在節を新設し構成カウントを測定コマンド付きの実測値へ（core tools 79 / sensors 7 / hooks 12 / scopes 10、`self-*` 20ファイル）。`self-*` が非出荷面である旨と 13コピー同期境界、`self-fix` が #1711 の直撃経路である点を追加。
- `component-inventory.md`: 現在節を新設し2件の所有コンポーネントと共有境界を追加。区間の新規 core tool を **3件**として表化し、mirror-policy / team-up-codex-safety-wait が新設でない旨を明記。
- `architecture.md`: 現在節を新設し対象機構2つ（機構 A = SKILL new-work 経路と verb 所有権、機構 B = per-unit degrade と produces 実在検査の非対称）を file:line 付きで記述。修正候補 A/B の表とテスト契約制約、プロトコル制約を含む。
- `api-documentation.md`: 現在節を新設し CLI verb 所有権と reviewer 読取スコープの内部契約を表化。区間追加の2型（`MainConductorAuthorization` / `WorkflowCompletionPreparation`）を追加。
- `code-structure.md`: 現在節を新設し13ファイルの患部配置表、core engine + reviewer 層の配置表、テスト面配置、区間の構造変化を追加。
- `business-overview.md`: 現在節を新設し2件の利用者影響と delivery boundary を追加。
- `dependencies.md`: 現在節を新設し reviewer 層への一方向依存図、非対称の所在、投影チェーン、Bolt 間順序制約なしの判定を追加。
- `code-quality-assessment.md`: 現在節を新設し根因確度、4件の品質所見（テスト構造的盲点 / 現挙動のピン / 運用回避の負債 / 非対称クラスタ）、検証順序を追加。
- `reverse-engineering-timestamp.md`: 現在節を新設し freshness pointer を observed `278d61d8e` へ更新。引用再確認の相違3点を記載。
- `re-scans/260730-skill-reviewer-fixes.md`: 本ファイル。

共有 codekb 8成果物の line 3 現在ヘッダ（`260729-open-bug-batch、現在、observed 22ee27dbe`）はすべて `履歴` へ降格した（`cid:reverse-engineering:c3-relabel`）。履歴節の本文と file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。

## 制約と未解決事項

- 本 scan は静的解析であり、対象テスト・full suite は未実行。実行プローブも行っていない（`next` は utility にとって既知 mutating verb ではないが、`cid:code-generation:no-help-probe-on-mutating-verbs` に従い switch の静的読解を根拠とした）。
- #1711 の修正方式（候補 A = engine 側解決 / 候補 B = reviewer-runtime 側解決）は**未裁定**。候補 A は `t186:351-361` / `t186:490-503` / `t116:380-403` のテスト契約変更と `amadeus-orchestrate.ts:3052` の設計コメント改訂を伴い、候補 B は層の逆転を伴う。裁定は Requirements Analysis に属する。
- 本 intent は `self-fix` スコープで走り units-generation を SKIP するため、自らの code-generation ステージが #1711 の患部経路を通る。レビュー段が exit 1 する場合は既知の運用回避（project.md `cid:code-generation:degrade-scope-unit-dir-layout` 追補）を適用し、適用自体を diary に記録する。
- intent state、audit、report、GitHub Issue / Pull Request は本 scan で変更していない。
