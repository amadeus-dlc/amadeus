# 260730-open-bug-batch-2 差分スキャン記録

## 実行メタデータ

- Date: `2026-07-30T15:34:39Z`
- Repository: `amadeus-dlc/amadeus`
- Base commit: `8b8016f62`
- Observed commit: `c42ef4d77ef79d4230efe4fdac5d0d7abf7155f2`
- Distance: `12 commits`
- Ancestry: `8b8016f62` は observed の祖先（`git merge-base --is-ancestor 8b8016f62 HEAD` exit 0）
- Scope: `self-fix` / Brownfield / single repository
- Scan mode: Developer static live-code scan を上流入力にした differential refresh。Architect の引用再確認あり。テスト未実行。
- Focus: [#1750](https://github.com/amadeus-dlc/amadeus/issues/1750)、[#1749](https://github.com/amadeus-dlc/amadeus/issues/1749)、[#1742](https://github.com/amadeus-dlc/amadeus/issues/1742)、[#1735](https://github.com/amadeus-dlc/amadeus/issues/1735)、[#1734](https://github.com/amadeus-dlc/amadeus/issues/1734)
- Delivery: 1 Issue = 1 Bolt = 1 GitHub Pull Request。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)

## Base 選定根拠

直前の現在節が宣言する observed `278d61d8e` は現 HEAD の**祖先ではない**（`git merge-base --is-ancestor 278d61d8e HEAD` exit 1）。その前の `22ee27dbe` も非祖先（exit 1）。squash マージ運用で record ブランチの observed が `main` に残らない既知現象であり、`cid:reverse-engineering:rescan-base-ancestry`（日付最新ではなく HEAD の祖先である observed のうち距離最小を選ぶ）に従い、祖先性を実測確認した `8b8016f62` を差分 base として採用した。

直前 intent の `re-scans/260730-skill-reviewer-fixes.md` および各成果物の履歴節に含まれる file:line は当時の observed 断面に固定されているため、参照する場合は `cid:requirements-analysis:historical-section-cite-check-at-observed` に従い当該 observed で照合する（HEAD 照合は偽陽性を生む）。

## 区間の変化

`8b8016f62..c42ef4d77` は12コミット、`116 files changed, 4276 insertions(+), 181 deletions(-)`。生成面（`dist/`）・self-install 面・`amadeus/` record を除く比較断面は `26 files changed, 997 insertions(+), 81 deletions(-)`。

| コミット | 実質面の変化 |
| --- | --- |
| `042237263`（#1753） | SKILL.md の new-work 経路ツール名修正（`amadeus-utility.ts next --new-intent` → `amadeus-orchestrate.ts next --new-intent`）。5ハーネス SKILL 各1行。新規 `tests/integration/t366-skill-new-intent-verb.test.ts`（64行） |
| `e839b20ce`（#1760） | degrade スコープの per-unit directive で `{unit-name}` を実ディレクトリへ解決。`amadeus-orchestrate.ts` +82行（`emitRunStageForSlug` に `unit` パラメータ、`degradeUnitDirectories()`、`degradeUnitResolutionError()`）。新規 `t367`（321行）、`t116` +93行、`t186` +41行 |
| `8bb81c2e7`（#1745） | TLC 標準モジュール行の parse を spawn した tmpdir 追従へ。`scripts/formal-verif/` 3ファイル |
| `ce19e0ec0` / `a38a1f4d3` | 前 intent（260730-skill-reviewer-fixes）の record 同期 |
| `86affbf03` / `1a20a9be6` | dist / self-install の生成面畳み込み |
| `a9cfc5a7c` / `da3ccaf56` / `b58ac4b06` / `2fa7c0c55` | metrics スナップショット |

core tools・sensors・hooks・scopes はいずれも件数不変。`tests/.coverage-patch-allowlist.json` が76行変化（行ピン remap 相当 — 本 intent が同ファイルを触る場合は `cid:code-generation:c1-allowlist-mechanical-remap` に従い機械 remap + 直読照合を要する）。

## Developer Code Scan の合成結果

| Issue | 確定事項 | 根因確度 | 主対象 | 欠落テスト |
| --- | --- | --- | --- | --- |
| #1750 | boundary 種別は4種（`amadeus-mirror-lifecycle.ts:647` / `:651` / `:655` / `:658`）+ `manual`（`:633`）で intent 誕生時点が無い。`intent-capture` boundary の発行元は `amadeus-orchestrate.ts:4492` の1箇所のみで、SKIP されると発行機会が構造的に消える。`self-fix` は `intent-capture` / `approval-handoff` とも `SKIP` | 機序 100%／修正方式は未裁定 | mirror-lifecycle の種別集合 + orchestrate の発行経路 + receipt 表現 | Ideation 全 SKIP スコープでの初回 create タイミング検査 |
| #1749 | engine は `phase-check-<phase>.md` を fail-closed で要求（`amadeus-state.ts:330` / `:332`）。誤記 `[phase-boundary]-verification.md` は正本 `stage-protocol-governance.md:22` に由来し18ファイルへ投影（是正対象15 + 記録3） | 100% | 正本1行 + dist 7 + self-install 5 + docs 2 | 正準名と protocol 文言の照合（既存検査の有無は**未確認**） |
| #1742 | 発火対象の決定は `matches` glob のみ（`amadeus-sensor-fire.ts:199-202`、`:192` に `G1 lock-in: matches IS the filter.`）。全280行に `produces` 参照 0。record 配下の非成果物は `**/intents/**` に一致して発火し、`codekb/` の宣言済み成果物は不一致で発火 0 | 100% | sensor-fire hook の対象決定 | 欠落側（宣言済み成果物の無発火）の検査。過剰発火側は現行バグ挙動が `t94:298-306` と `t95` の11箇所でピンされている |
| #1735 | CLI は健全（`amadeus-election.ts:350` / `:360`）。発動 3類型の唯一の指示所在は `skills/amadeus-election/SKILL.md:28`。ハーネス固有面に auto-solo 記述は 0件。codex は method 層を on-demand `@`-mention で解決（`dist/codex/AGENTS.md:62`）。`stage-protocol.md` §13 に選挙への言及なし（grep ヒット 0） | 機序 高（設計ギャップは確定）／ codex 非投入は Issue の一次証拠（選挙0件）からの推論 | stage-protocol §13（中立層）が第一候補 | codex での §13 トリガー注入 → `open --trigger auto-solo` の live e2e |
| #1734 | apply（`mergeScopeGrid` `promote-self.ts:147-160`）はオブジェクト挿入順（dist キー → extras）で書き、check（`scopeGridInSync` `:130-142`）は JSON 意味比較のみでキー順も extras も見ない write⇔check 非対称。144行 churn の正体は**削除ではなく末尾への移動** | 100%（read-only シミュレーションで決定的再現） | `scripts/promote-self.ts` のみ | 前状態（extras が dist キーより前）を再構成した回帰テスト |

## Architect Synthesis

5件は「フレームワークが自らの文書・契約どおりに動かない」という共通テーマで1 Intent に収まる一方、所有機構と同期対象ファイル集合が重ならないため 1 Issue = 1 Bolt = 1 PR を維持して並行実装できる（`cid:code-generation:c6` の非交差判定を満たす）。

### 依存と順序

Bolt 間の実装上の順序制約は**なし**。ただし2点の運用上の注意がある。

1. **投影チェーンの競合**: #1735（protocol md）・#1742（hook ts）・#1750（tools ts）はいずれも `packages/framework/core/` を正本とし、`bun scripts/package.ts` → dist 7ハーネス → `bun run promote:self` → self-install 5面という同一チェーンを通る。ファイル単位では非交差だが生成面が競合するため、着地順は静的目録でなく実 diff で再評価する。
2. **裁定の重さ**: #1749（散文のみ）と #1734（`scripts/` のみ）は先行着地できる。#1750 は receipt 表現（`MIRROR_BOUNDARY_PHASES` 拡張 vs `createIdentity` をべき等キーに使う）の選択で影響面が変わるため最も設計裁定が重い。

### 要件段へ持ち越す裁定事項

- **#1734 の「削除」誤読の訂正**（重要）: Issue 本文は「amadeus-* スコープのエントリが self-install ツリーから削除される」と記述するが、Issue 記載の base `c48877451` の実バイトへ `mergeScopeGrid` 相当を適用した read-only シミュレーションでは insertions 144 / deletions 144 で **extras 4件は全て merged に保存されている**。144行は削除ではなく末尾への移動（4エントリ × 36行）である。データ喪失バグではなく順序安定性バグであり、この訂正を引き継がないと存在しない喪失への対策が設計に入る。
- **#1734 は現 HEAD で再現しない**: `.codex` は既に dist 順 → extras 順に並び、`mergeScopeGrid` 再適用結果は現ファイルとバイト一致（16673 bytes 同士）。#1683 `dd8532d1c` の `amadeus-*` → `self-*` 改名で一度 apply された結果が commit されたため。潜在欠陥は残存するが、落ちる実証には前状態の再構成が要る。受け入れ基準を「現状で churn が出ないこと」に置くと検証劇場になる（org.md Forbidden）。
- **#1742 のテスト契約改訂**: `t94:298-306` と `t95` の11箇所が非宣言成果物への発火を正の期待値として固定している。修正は必然的にテスト契約の明示的改訂を伴うため、実装者の単独判断で期待値を書き換えない（`cid:requirements-analysis:implementation-deviation-election`）。
- **#1735 の修正層**: 中立層（stage-protocol §13）への焼き込みが第一候補。codex 固有面への追記のみの単独採用は他ハーネスで同型が再発しうるため非推奨（他ハーネスの include 方式は本スキャンで**未実測**）。
- **#1749 の drift guard**: Issue 受入条件が求める guard の実装形が未定。本契約を検査する既存テストの有無は grep で確認できておらず、**不在主張ではない**（`cid:requirements-analysis:absence-claim-grep-verify`）。

### 修正境界

- #1749: 正本1行 → `bun scripts/package.ts` → `bun run promote:self` → docs 2ファイル日英同期。record/memory 層の3件（`project.md:127` の既決ノルム、`260708-installer-distribution` の履歴2件）は**是正対象外**。
- #1742: hook `:186-202` の間に解決済み produces 集合との照合を挿入。`GraphStage` は `produces`（`amadeus-graph.ts:144`）と `optional_produces`（`:147`）を既に持つため追加ロード不要。`{unit-name}` 解決は本区間の #1760 が既存所在。
- #1750: `parseBoundaryArgs`（`:640-661`）への新種別追加 + `emitMirrorBoundaryIfNeeded`（`:452`）経路への初回 create 未実施条件。
- #1734: 書込側の正準化（キー名ソート）か検査側の対称化（`mergeScopeGrid(got, want)` と `got` の比較）。既存センサー `.claude/sensors/amadeus-self-scope-consistency.md:8` が本ファイルを既に監視対象にしているため責務の重複／相補を確認する。
- core 正本変更は 7 dist + 5 self-install へ再生成し、生成物を独立編集しない。

## 引用再確認の結果（Architect が observed `c42ef4d77` で独立再実測）

| 対象 | Developer 報告 | 再実測 | 判定 |
| --- | --- | --- | --- |
| observed / base 祖先性 | `c42ef4d77` / `8b8016f62` exit 0 | 同一、`git rev-parse HEAD` = `c42ef4d77ef79d4230efe4fdac5d0d7abf7155f2` | 一致 |
| Distance / 区間規模 | 12 / `116 files, 4276+, 181-` | 同一 | 一致 |
| boundary 4種の所在 | `:646-658` | `:647` / `:651` / `:655` / `:658`（`parseBoundaryArgs` は `:640` 開始）、`manual` = `:633` | 一致（関数開始は `:640`） |
| `intent-capture` 発行元 | `:4492-4505` | `const intentCaptureMirror` = `:4492`、`slug === "intent-capture"` 三項 verbatim 一致 | 一致 |
| phase-check 正準名 | `amadeus-state.ts:330-336` | `:330` に `artifactPath`、`:332` に拒否メッセージ、`:211` / `:327` / `:334` も同名 | 一致 |
| `[phase-boundary]-verification` の全数 | 18ファイル（是正15 + 記録3） | `grep -rln` = **18**。是正15 = 正本1（`:22`）+ self-install 5（各 `:22`）+ dist 7（各 `:22`）+ docs 2（`:966` / `:817`）。記録3 = `project.md:127`、`260708-installer-distribution` の `memory.md:12` / `learnings-selections.json:17` | 一致 |
| root `.kiro` の不在 | `ls -d .kiro` で不在 | `No such file or directory`、exit 2 | 一致 |
| sensor-fire の matches-only | `:199-202`、`produces` 参照 0、280行 | `:199-202` verbatim 一致、`grep -c 'produces'` = **0**、`wc -l` = **280**、`:192` に `G1 lock-in: matches IS the filter.` | 一致 |
| sensor manifest の glob | 各 `:8` | `required-sections` / `upstream-coverage` = `**/{amadeus-docs,intents}/**`、`answer-evidence` = `**/*-questions.md`、`linter` = `**/*.{ts,js}`、`type-check` = `**/*.{ts,tsx}`、`self-scope-consistency` = `**/{scopes/amadeus-self-*.md,tools/data/scope-grid.json}` | 一致 |
| election の2箇所 | `:350` / `:360` | `:350` = `if (trigger !== "auto-solo")`、`:360` = `out({ opened: null, reason: "auto-solo-election-disabled" })` | 一致 |
| `SKILL.md:28` が auto-solo 唯一所在 | 唯一 | `grep -rn 'auto-solo' packages/framework/core/ packages/framework/harness/` = **7行**（election.ts `:66` / `:350` / `:360`、mirror-config.ts `:6` / `:53` / `:82`、SKILL.md `:28`）。harness 配下 0件 | 一致 |
| codex の on-demand 解決 | `dist/codex/AGENTS.md:62` | `:62` に `pull specific method files into context on demand` verbatim | 一致 |
| `self-fix` の ideation 全 SKIP | 全 SKIP | EXECUTE = `workspace-scaffold` / `workspace-detection` / `state-init` / `reverse-engineering` / `requirements-analysis` / `code-generation` / `build-and-test`。`intent-capture` = `SKIP`、`approval-handoff` = `SKIP` | 一致 |
| promote-self の write⇔check 非対称 | merge `:147-159` / check `:130-144` | `SCOPE_GRID_RE` = `:125`、`scopeGridInSync` = **`:130-142`**、`mergeScopeGrid` = **`:147-160`**、check 呼び出し `:479`、apply 呼び出し `:504` | 意味論一致、**行範囲を精密化** |
| HEAD で churn 非再現 | `mergeScopeGrid` 再適用がバイト一致 | self 14キー / dist 10キー / extras = `self-document` `self-feature` `self-fix` `self-refactor`。再適用結果 == 現ファイル（**True**）、16673 bytes 同士 | 一致 |
| `t94` の期待値 | `:298-304` | `:298-306` に `intent.md` を組み立てる `filePath`、直上コメントが「`**/amadeus-docs/**` に両センサーが一致する」と明示 | 一致（範囲を `:298-306` へ精密化） |
| `t95` の `intent.md` 出現 | 11箇所（`:272` `:290` `:300` `:312` `:329` `:431` `:441` `:455` `:465` `:487` `:516`） | `grep -c` = **11**、行番号も全一致 | 一致 |
| `amadeus-graph.ts` の宣言型 | `produces` `:144` / `optional_produces` `:147` | 同一 | 一致 |
| `MIRROR_BOUNDARY_PHASES` | `amadeus-state.ts:221-229` | 宣言 `:221`、型 `:229` | 一致 |
| `createIdentity` | `:423-425` | 同一 | 一致 |
| orchestrate の boundary 経路 | `persistedMirrorBoundary` `:340-356` / `hasPersistedMirrorBoundary` `:458-465` / `emitMirrorBoundaryIfNeeded` `:452-500` | `PREVIOUS_BOUNDARY_BY_PHASE` = `:256`、`currentMirrorBoundaryPhase` = `:263`、`persistedMirrorBoundary` = **`:341`**、`hasPersistedMirrorBoundary` = **宣言 `:359` / 呼び出し `:464`**、`emitMirrorBoundaryIfNeeded` = `:452` | 意味論一致、**行を精密化**（報告の `:458-465` は呼び出し側のみを指していた） |
| 前回 observed の非祖先性 | `278d61d8e` 非祖先 | `git merge-base --is-ancestor 278d61d8e HEAD` **exit 1**、`22ee27dbe` も **exit 1** | 一致 |

**総括**: Developer 報告の主要引用は所在・意味論とも**全件一致**。相違は関数の行**範囲**表記3点（`scopeGridInSync` `:130-142`、`mergeScopeGrid` `:147-160`、`hasPersistedMirrorBoundary` 宣言 `:359`）のみで、いずれも結論に影響しない。

## 更新成果物

実質更新（4件）:

- `architecture.md`: 現在節を新設し、5件の対象機構 A〜E を file:line 付きで記述。boundary 4種の表、`matches` フィルタの verbatim、write⇔check 非対称、「削除ではなく移動」の訂正、修正候補の挿入点を含む。
- `code-structure.md`: 現在節を新設し、#1749 の18ファイル表（是正15 / 記録3）、#1742 の hook・manifest・テスト面配置、#1750 の mirror 層配置、#1735 の auto-solo 全数7行、#1734 の promote:self 配置、区間の構造変化を追加。
- `code-quality-assessment.md`: 現在節を新設し、5件の根因確度表と品質所見6件（write⇔check 非対称クラスタ / Issue 本文の誤読訂正 / HEAD 非再現と検証劇場リスク / ハーネス依存の文脈投入ギャップ / テスト契約の構造的盲点 / 正本誤記の3週間運用回避）、検証順序の推奨を追加。
- `business-overview.md`: 現在節を新設し、5件の利用者影響表、業務上の優先度所見、delivery boundary を追加。

判断1行のみ（4件）— 本区間で該当断面に変化がなく、現在マーカーの整合（`cid:reverse-engineering:c3-relabel`）を保つ目的で判断のみを記載:

- `technology-stack.md`: 構成カウント（core tools / sensors / hooks / scopes）不変。
- `component-inventory.md`: 新規コンポーネントの追加・削除なし。患部はすべて既存コンポーネント内。
- `api-documentation.md`: 公開契約の変化なし。ただし #1750 / #1742 / #1734 は修正時に内部契約を変えうるため、裁定後に要再訪。
- `dependencies.md`: 外部依存の変化なし。Bolt 間の順序制約もなし。投影チェーンの競合のみ記載。

加えて `reverse-engineering-timestamp.md`（現在節を新設し freshness pointer を observed `c42ef4d77` へ更新、base 選定根拠と引用再確認の相違を記載）と本ファイル。

共有 codekb 8成果物の line 3 現在ヘッダ（`260730-skill-reviewer-fixes、現在、observed 278d61d8e`）はすべて `履歴` へ降格した（`cid:reverse-engineering:c3-relabel`）。履歴節の本文と file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。

## 制約と未解決事項

- 本 scan は静的解析であり、対象テスト・full suite は未実行。#1734 の症状再現は read-only の Python シミュレーション（`promote-self.ts` の `mergeScopeGrid` ロジックを忠実に再実装し、`git show` した実バイトへ適用）で行い、`promote:self` 自体は実行していない。
- 5件とも**修正方式は未裁定**であり、裁定は Requirements Analysis / Functional Design に属する。特に #1750 の receipt 表現、#1742 の `{unit-name}` 解決 seam、#1734 の書込側 / 検査側いずれを直すかは影響面が大きく異なる。
- #1735 の「codex で実際に文脈へ投入されていない」ことは、Issue の一次証拠（intent 実行期間内の選挙0件）と `AGENTS.md:62` の on-demand 記述からの**推論**であり、live 実行での非投入は本 scan で観測していない。他ハーネス（kimi / kiro / cursor / opencode）の include 方式も未実測。
- #1749 の drift guard を担う既存テストの有無は grep で確認できておらず、**不在を主張していない**。
- 本 intent は `self-fix` スコープで走り units-generation を SKIP するため、自らの code-generation ステージが degrade 経路を通る。本区間で着地した #1760（`e839b20ce`）が `{unit-name}` 解決を実装済みのため前 intent の運用回避（`cid:code-generation:degrade-scope-unit-dir-layout`）は不要になっている可能性があるが、**未検証**。
- intent state、audit、report、GitHub Issue / Pull Request は本 scan で変更していない。
