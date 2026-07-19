# Reverse Engineering — Developer Scan Notes: election-ts-foundation

> 上流入力(consumes 全数): intent-statement.md、scope-document.md

## 測定 ref / スキャンメタデータ

- Stage: reverse-engineering(2.1)Developer scan、Scope: `amadeus`(チーム内ツール、配布外 — W-04)
- Repository: `amadeus`、Project type: Brownfield、手法: diff-refresh(cid:reverse-engineering:c1、E-L63 base 選定則)
- **base** = `e9a001105`(全 `re-scans/*.md` observed のうち HEAD 祖先で距離最小。`git merge-base --is-ancestor e9a001105 HEAD` exit 0 実測、`git rev-list --count e9a001105..HEAD` = **69**)。base は 260717-swarm-dispatch-enum の observed に一致。
- **observed** = `c2e4975ff2abe0290d899fdbd04b856213175c7a`(`git rev-parse HEAD` 実測)
- 件数・行番号は observed HEAD の実ファイル直読、区間変更は `git diff --stat e9a001105..HEAD` / `git log e9a001105..HEAD -- <path>` で実測(measurement-ref-in-artifacts)
- **鮮度ポインタ注意**: `reverse-engineering-timestamp.md` の「最新」ヘッダは 260718-hooks-config-conflict(observed `594ba21d…`)を指すが、`git merge-base --is-ancestor 594ba21d… HEAD` = **exit 1(非祖先)** を実測。並行 intent の squash tip であり、本 scan の base 真実源にはしない(E-L63 rescan-base-ancestry / re-timestamp-merge-resolution)。

## 区間サマリ(e9a001105..HEAD、69コミット)

`git diff --stat` = 493 files / +80,871 / −693。増分の大宗は **codex-hooks 移行**(`harness/codex/tools/amadeus-codex-hooks*.ts` 3新規 +1,154行、integration テスト `t-codex-hooks-*` 3新規 +2,540行)で、本 intent のフォーカス面(配布チャンネル/選挙 parse 資産/agmsg/mirror 前例/SKILL packaging/選挙ノルム)とは**交差しない**。フォーカス面に交差する区間変更は下記のとおり軽微(mirror 8行、norm メモリの追記のみ)。

---

## Focus 1: 配布/セルフインストールのチャンネル構造 — **local overlay チャンネルは「存在する」(絶対確認)**

タスクの反証課題「local overlay チャンネル(正本→ .claude/.codex コピーのみ・dist 非対象)が現状存在しないこと」は **反証された**。grep 全数(absence-claim-grep-verify)で **`contrib/skills/` チャンネルが実在**する。

### 3層の配布/インストール経路(実測)
1. **正本 → dist**: `scripts/package.ts`(:11-22 設計コメント)が `packages/framework/core/` と `packages/framework/harness/<name>/` を manifest 投影で `dist/<harness>/` へ生成。dist はコミット済み・`--check` ドリフトガード対象(:32-33)。
2. **dist → self-install ツリー**: `scripts/promote-self.ts`(375行)の `managedDirs`(:36-42)が `dist/<h>/.<engine>` を repo ルート `.claude`/`.codex`/`.agents`/`.cursor`/`.opencode` へ複製。`preserved`(:84-96)= ドリフト照合から除外する per-machine ランタイム設定(`.claude/settings*.json`、`.codex/hooks.json`、`.opencode/opencode.json` など)。composed-scope の sanctioned write path は `COMPOSED_SCOPE_RE`(:100 付近、verbatim: `export const COMPOSED_SCOPE_RE = /^\.[^/]+\/scopes\/amadeus-[^/]+\.md$/;`)+ `SCOPE_GRID_RE` で、dist に無い composed scope を ORPHAN 誤判定せず温存(:103-106)。ORPHAN 検出は `orphanedFiles`(:263-276)+ `isPreserved`(:207-211)、`--check` で `ORPHAN:` として報告(:299)。
3. **contrib overlay(= local overlay チャンネル、dist 非対象)**: `promote-self.ts` の `CONTRIBUTOR_SKILLS_ROOT = "contrib/skills"`(:45)、`CONTRIBUTOR_SKILL_DESTINATIONS = [".claude/skills", ".agents/skills"]`(:46)。投影ロジック(:229-236 verbatim):
   ```
   const contributorSkillsAbs = join(repoRoot, CONTRIBUTOR_SKILLS_ROOT);
   if (existsSync(contributorSkillsAbs)) {
     for (const file of walk(contributorSkillsAbs)) {
       const relFromSkills = normalizeRel(relative(contributorSkillsAbs, file));
       if (relFromSkills.split("/")[1] === "evals") continue;
       const bytes = readFileSync(file);
       for (const dst of CONTRIBUTOR_SKILL_DESTINATIONS) {
         expected.set(normalizeRel(join(dst, relFromSkills)), bytes);
   ```
   ヘッダコメント(:7-9 verbatim): 「Contributor-only skill runtime files under contrib/skills/ are projected into both harness discovery trees without entering dist/. Authoring-only eval assets remain at the canonical contributor path.」
   - 唯一の現存例: `contrib/skills/amadeus-upstream-sync/`。投影先 `.claude/skills/amadeus-upstream-sync/`(SKILL.md・references/・agents/)は **git tracked**(`git ls-files` 実測)だが `dist/claude/.claude/skills/` には**不在**(`comm -23` で 40 dist skills 中 upstream-sync のみ差分)。`evals/` サブディレクトリは authoring-only で投影スキップ(:233)。

**帰結(設計含意)**: 本 intent は「配布外のチーム内ツール」(W-04)であるため、S-08 の SKILL 薄ラップは **`contrib/skills/amadeus-election/` に置けば dist ドリフトガードを汚さず `.claude`/`.agents` の discovery ツリーへ投影される**。決定的 TS ツール本体は Focus 4 の `scripts/*.ts` 前例(dist・投影いずれの対象でもない repo ローカル)が自然な家。どちらを採るかは requirements/設計の未決点。

### manifest 投影(harness/claude/manifest.ts)
`harnessFiles`(:39-51)で session skills(session-cost/replay/outcomes-pack/grilling)を `skills/<name>` として投影。stage/scope runner は `amadeus-runner-gen.ts` が compiled graph から生成(Focus 5)。**区間変更**: manifest.ts の変更は codex 側のみ(`harness/codex/manifest.ts` +18行、hooks 契約由来)。claude manifest のフォーカス面は無変更。

---

## Focus 2: GoA/選挙記録の parse 資産(`amadeus-norm-metrics.ts`)— **区間変更ゼロ・スキーマ安定**

- canonical `packages/framework/core/tools/amadeus-norm-metrics.ts` と self-install `.claude/tools/amadeus-norm-metrics.ts` は同一 36,073 bytes。**区間変更ゼロ**(`git log e9a001105..HEAD` 空)。
- 入力スキーマ正規表現(verbatim):
  - `GOA_HEAD_RE`(:157)= `/^GoA\[(E-[A-Z0-9]+)\]:\s*(.+)$/`
  - `GOA_TOKEN_RE`(:158)= `/^([1-8])x(\d+)$/`
  - `PM_CID_RE`(:161)= `/^PM-cid:\s+([a-z0-9-]+(?::[a-z0-9-]+)*)\s+incident=(.+)\s+round=(E-[A-Z0-9]+)$/`
- `parseGoaLine`(:688)→ `GoaBreakdown | ParseFailure`。8-bin 厳格(`tokens.length !== 8` で fail、bin 順序検査 `Number(tok[1]) !== i+1`、非数値 fail)。**never estimates**(:663-664 コメント、malformed は ParseFailure、US-3.2/P2)。返却 `GoaBreakdown = { ok:true; ecode:string; votes:[8-tuple] }`(:668-672)。
- `parsePmCidLine`(:704)→ `PmIncident = { ok:true; cid:string; incident:string; round:string }`(:675-680)。`normaliseCid` で `stage:stage:slug` 二重名前空間を畳む。
- 対応テスト: `tests/unit/t-norm-metrics.test.ts:582-596`(`describe("PhaseBSchemas …")`、8-bin parse・too-few-bins・out-of-order・non-numeric の落ちる実証を保持)。
- **C-08 互換の含意**: S-05(記録生成)の GoA 度数行・persist 文出力は **この既存パーサの入力スキーマに byte 互換**であること = 生成側と parse 側が対を成す(#1137 本文「既に parseGoaLine 等のパーサが #1112 で存在し、生成側を対にする形」)。スキーマ実文は上記 3 正規表現が権威。W-03(PM ラウンド)は out だが S-05 出力は norm-metrics スキーマ互換で下流(蒸留ラウンド)を壊さない契約。

---

## Focus 3: agmsg 輸送 seam(repo 外、実在と主要契約のみ)

- 実体: `~/.agents/skills/agmsg/scripts/`(実在確認、SQLite ベース。`send.sh`/`inbox.sh`/`check-inbox.sh`/`api.sh`/`delivery.sh`/`config.sh` 等)。
- **`send.sh` 契約**(:4-6 verbatim): `Usage: send.sh <team> <from> <to> <message>`。位置引数4つ、message は**単一位置引数**(構造化ペイロードは message 本文へエンコードして運ぶ)。INSERT で `messages(team, from_agent, to_agent, body)` へ1行(:21)。未登録宛先でも成功を返す(既知の無音不達 — team.md agmsg-recipient-typo)。
- **`inbox.sh` 契約**(:4-8): `Usage: inbox.sh <team> <agent_id> [--quiet]`。`--quiet` は未読時のみ出力(hooks 用)。
- team 名/モード: `scripts/team-up.sh` が `AGMSG_TEAM`(default `amadeus`、:24)、`TEAM_MSG`(`agmsg` default / `herdr`、:33)、`TEAM_INSTANCE` で instance 別 team を導出。`AMADEUS_OPERATING_MODE=team` を全セッションへ設定(team.md Operating Modes)。
- **含意**: S-02(blind 配信)は agmsg の単一 message body に「選挙 ID + 正本パス」の短通知を載せる形が自然(推奨・先行票は body に含めない)。S-03(投票収集)の受付台帳は agmsg を輸送のまま利用(W-05 = agmsg 置換なし)。票データそのものは agmsg body でなく**票ファイル方式**が #1137 の論点(ツールは生成・集計のみか、票ファイルか)— requirements の未決点。

---

## Focus 4: チームローカルツール前例(`scripts/amadeus-mirror.ts`)— **最有力の実装前例**

- ヘッダ契約(:1-10 verbatim 要点): 「mirror-issue CLI for the intent-first filing practice … The record tree is the source of truth; sync is strictly record -> issue (one-way). State is read only from deterministic sources (intents.json + amadeus-state.md); the tool never writes intents.json … its only writes are gh calls and the `Mirror Issue` field in amadeus-state.md.」Exit codes: 0 ok / 1 fault / 2 usage。
- 構成: `packages/framework/core/tools/amadeus-lib`(`activeIntent`/`getField`/`intentsDir`/`readIntentRegistry`/`recordDirMatches`/`setOrInsertField`)を import(:16-25)。`parseArgs`(:36)は判別ユニオン `ArgsOutcome`(create/sync/close/usage)を返す(functional-domain-modeling-ts スタイル準拠)。
- **gh 境界**: `Bun.spawnSync`(:206-208)で gh 起動、runnable でなければ exit 127・`kind:"error"`(:215)。ready チェック `if (ready.kind === "error") return fail("gh not ready: …")`(:266/310/335)。gh keyring 委譲でトークンは持たない(team.md gh-scripts-boundary、260717-mirror-issue-tool Q1 裁定)。**gh 依存は scripts/ 配下の repo ローカル開発支援ツールに限定許容**(配布フレームワークには持ち込まない — Bun-only Forbidden 整合)。
- **intent-mirror ラベル運用**(:274-277 verbatim): `gh issue create … "--label", "intent-mirror", "--label", "enhancement"`。
- **区間変更**: `cd9865194 fix(mirror): exclude scope-SKIP suffix rows from countStageProgress denominator (#1172)(#1198)` の1コミットのみ(+8行本体、+82行テスト `t232`)。フォーカス契約(gh 境界・状態読取・ラベル)は無変更。
- **含意**: 選挙ツールは amadeus-mirror と同型 — `scripts/amadeus-election.ts`、`amadeus-lib` から決定的状態読取、判別ユニオン `Result`、gh 不要(選挙は agmsg + record ファイルで完結)、exit code 契約、`tests/unit/t*-amadeus-election.test.ts` に in-process seam テスト。**scripts/ は dist にも contrib 投影にも入らない**ため配布外(W-04)を構造的に満たす。ただし SKILL の user-invocable 化(S-08)には contrib/skills 経路が必要(scripts/ は `/amadeus-*` にならない)。

---

## Focus 5: SKILL パッケージング

- `.claude/skills/` = **41ディレクトリ**。40 は framework 由来(dist/claude に存在)、1(`amadeus-upstream-sync`)は contrib overlay 由来(Focus 1)。
- session skills 4(session-cost/replay/outcomes-pack/grilling)は `harness/claude/skills/` 正本 → manifest 投影。stage/scope runner は `amadeus-runner-gen.ts` が **compiled stage graph(`data/stage-graph.json`)+ shipped `.claude/scopes/*.md`** から生成(:1-23)。runner-gen 管轄は「stage-runner(runnable stage 毎)」「scope-runner(shipped scope 毎)」の2系統で、**任意名の一般 SKILL は生成しない** — 選挙 SKILL は runner-gen の管轄外。
- **含意**: `/amadeus-election` を user-invocable にするには (a) contrib/skills/amadeus-election/(dogfood 投影、配布外)か (b) framework session skill 化(dist 投影 = W-04 と矛盾)。**(a) が W-04 整合の唯一経路**。amadeus-upstream-sync が (a) の既存パターン(dist 非対象・agents.yaml・references/・evals authoring-only)。

---

## Focus 6: 選挙ノルムの棚卸し(機械化対象 cid、測定 ref = team.md@HEAD c2e4975 / project.md@HEAD)

`grep -oE 'cid:…' amadeus/spaces/default/memory/{team,project}.md` から機械抽出。**本 intent スコープ(選挙4類型ライフサイクル)の機械化対象**と**隣接(W-01/02/03 で out)**を分離。件数は列挙から機械計算(ledger-count-mechanical-recalc)。

### A. 機械化対象(In-Scope: S-01..S-07 に写像、計 **13 cid**)
1. `cid:requirements-analysis:election-protocol`(team.md:57)— blind 配信・独立投票・可否同数エスカレーション・read-only cross-worktree 参照
2. `cid:requirements-analysis:gradients-of-agreement-scale`(:58)— GoA 8-bin・集計規則(i)-(v)・verdict 写像・0件ラベル(**S-04 開票計算の中核仕様**)
3. `cid:requirements-analysis:learnings-election`(§13 採否選挙)
4. `cid:requirements-analysis:blocker-election`(ブロッカー選挙)
5. `cid:requirements-analysis:persist-vote-timeline-field`(票タイムライン様式 — S-05)
6. `cid:requirements-analysis:norm-pr-vote-count-check`(票数表記照合 — S-06)
7. `cid:requirements-analysis:reservation-transcription-count-check`(留保必須票 GoA 2/3/6 件数照合 — S-06)
8. `cid:requirements-analysis:citation-reservation-preservation`(留保転記の完全性 — S-05/S-06)
9. `cid:requirements-analysis:early-tally-with-block-reopen`(早期開票・後着票記録・GoA 8 再審 — S-04/S-07)
10. `cid:requirements-analysis:election-distribution-verbatim-and-length`(verbatim 配信・truncate 迂回 — S-02)
11. `cid:requirements-analysis:gate-report-s13-bundling`(§13 候補同梱 — learnings 選挙の入口)
12. `cid:requirements-analysis:s13-before-approve-under-auto-delegate`(§13 ゲート両側維持 — learnings 選挙)
13. `cid:requirements-analysis:election-answer-after-ruling`(project.md:裁定後記入 — 起票/記録順序)+ 補助 `cid:requirements-analysis:agmsg-git-evidence-split`(project.md:agmsg 出典 vs git 事実の分離 — S-05 記録の出典明示)

### B. 隣接・出力互換のみ(Out-of-Scope、申し送り)
- `cid:requirements-analysis:no-election-judgment-gate`(= E-OC1 選挙不要判定 → **W-01**)
- `cid:requirements-analysis:weekly-distillation-round` / `distillation-round-1-record`(蒸留選挙 → **W-03**、ただし S-05 出力は norm-metrics スキーマ互換で下流温存)
- `cid:requirements-analysis:reviewer-filer-check` / `pr-reviewer-nomination-creator-first` / `late-verdict-diff-absorption`(クロスレビュー/PR レビュアー系 → **W-02**)
- `cid:requirements-analysis:no-election-for-decided-norms`(既決は選挙対象外 — 起票フィルタの前提知識、機械化対象外)
- `cid:requirements-analysis:implementation-deviation-election`(逸脱選挙 — 4類型外の選挙誘発条件)
- `cid:requirements-analysis:autonomous-decision-immediate-report`(自律決定即報告 — ガバナンス)

**区間変更**: team.md/project.md は区間内で norm PR による追記が複数(E-SDE-*/E-SMF-*/E-770-CGBT 等)あるが、**A 群の election-protocol/GoA スケール等のライフサイクル契約自体は無変更**(追記は別 E-code の学習で、選挙運用契約の書き換えではない)。→ codekb body は温存判定。

---

## Focus 7: 関連 open Issue(requirements 取込候補)

### #1137(OPEN、enhancement/P2)— 本 intent の直接先行起票
- 要望: blind 配信・GoA 投票・開票・票タイムライン・留保転記の agmsg 手作業執行を **スキル化 + 決定的 CLI** で機械支援。
- 実現形の見立て(leader): (1) 決定的 CLI `amadeus-election.ts` — 選挙定義(内部 No)→ 配信文生成(**表示番号シャッフル #1135 込み・対応表内部保持**)/ 票記帳(GoA・受容度・留保)/ 開票(多数決・GoA 度数分布行・票タイムライン行の機械生成)/ persist 文テンプレート出力。(2) SKILL `/amadeus-election` — 配信〜開票の手順書 + ツール呼び出し。
- **論点(requirements 未決点)**: 票の授受を agmsg のままにするか **票ファイル方式**にするか。検証劇場回避 = 集計は実票データからの導出のみ(ハードコード禁止)、**落ちる実証(不正票・二重票の拒否)必須**。
- 関連: #1135 / #1112(GoA/PM-cid パーサ)/ team.md election-protocol・gradients-of-agreement-scale。着手はユーザー決定。

### #1135(OPEN、enhancement/P2)— S-02 blind 配信の受け皿
- 問題: blind でも**選択肢の位置が推奨を漏らす**(起草者本命が A 位置 → 統計的判別。実測: 設計選挙3本で全問 A 採用)。
- 提案: 内部 No と表示番号を分離 — (1) 起草者は内部 No で提出 (2) **leader が配信時に表示番号 1..N をシャッフル**(対応表は leader 手元のみ) (3) 投票は表示番号、集計は内部 No へ写像 (4) 開票公表時に対応表公開(検証可能性)。
- 限界: 位置チャネル封鎖のみ(選択肢本文からの判別・自己認知は対象外)。
- 実装形論点: ノルムのみか、ツール支援(シャッフル+対応表生成 CLI、開票時の写像検証)まで作るか。**手作業写像は M4 転記ミスリスクのため機械化価値あり**。
- **含意**: #1135 のシャッフル+写像は S-01(内部 No 起票)/ S-02(表示番号配信)/ S-04(内部 No 集計)/ S-07(対応表公開)に自然に埋め込まれる。本 intent の S-02 は #1135 の実装受け皿。

---

## 主要発見(要約)

1. **local overlay チャンネルは実在**(反証成立): `contrib/skills/`(promote-self.ts:45-46,229-236)が正本→`.claude/skills`+`.agents/skills` を **dist 非対象**で投影。既存例 `amadeus-upstream-sync`(dist 不在を `comm` 実測)。W-04 整合の SKILL 配置経路。
2. **`scripts/amadeus-mirror.ts` が最有力実装前例**: repo ローカル・dist/投影いずれも非対象・`amadeus-lib` 決定的状態読取・gh 境界(scripts 限定許容)・判別ユニオン Result・exit code 契約。選挙 TS 基盤の写像元。
3. **GoA/PM parse 資産は区間変更ゼロ・スキーマ安定**: `GOA_HEAD_RE`/`GOA_TOKEN_RE`/`PM_CID_RE`(norm-metrics.ts:157-161)+ `parseGoaLine`/`parsePmCidLine`(:688/:704、never-estimates)。S-05 生成側はこの入力スキーマに byte 互換で対を成す(C-08)。
4. **選挙ノルム機械化対象 = 13 cid**(In-Scope)、隣接6+ cid は W-01/02/03 で out。election-protocol・gradients-of-agreement-scale が S-02/S-04 の中核仕様。ライフサイクル契約は区間無変更(codekb 温存判定)。
5. **#1137 が直接先行起票・#1135 が S-02 受け皿**: 未決点=票ファイル方式 vs agmsg、落ちる実証(不正票/二重票拒否)必須。agmsg send.sh は単一 message body 位置引数(構造化票は body エンコードか票ファイル)。

---

## codekb 反映提案(Architect 合成段が判断)

- **`code-structure.md` / `component-inventory.md`**: `contrib/skills/` overlay チャンネルと `scripts/*.ts`(amadeus-mirror 前例)の2つの「配布外 repo ローカル」経路を明記する追補を提案。現行 codekb が dist/self-install の2層のみ記述で contrib overlay を欠く場合は追記価値あり(本 scan で初めてフォーカスされた面)。
- **`architecture.md`**: 「配布境界」節に3層(canonical→dist→self-install)+ contrib overlay(dist バイパス)を1段追加。ただし本 intent のライフサイクル契約(norm-metrics parse・agmsg・mirror)はいずれも区間変更ゼロのため、**body 大半は churn 回避で温存**(reverse-engineering:c1)。
- **`api-documentation.md`**: 選挙ツールの CLI 契約は future intent(実装)で確定するため本 scan では追記不要(温存)。
- **`reverse-engineering-timestamp.md`**: 「最新」ヘッダを本 intent(260718-election-ts-foundation、observed c2e4975)へ更新し、260718-hooks-config-conflict を履歴ラベルへ降格。ただし hooks-config-conflict の observed 594ba21 は非祖先(並行 squash)である旨を注記(re-timestamp-merge-resolution / rescan-base-ancestry)。per-intent `re-scans/260718-election-ts-foundation.md` を新規作成。
- **温存判定の根拠**: フォーカス6面のうち norm-metrics(区間0)・agmsg(repo 外・無変更)・mirror(契約無変更)・SKILL 投影(claude manifest 無変更)・選挙ノルム契約(無変更)は本文と矛盾なし。実質の新規知識は「contrib overlay チャンネルの存在」の1点であり、これを code-structure/architecture へ最小追記するに留めるのが churn 最小。

---

## Architect 合成

> Developer scan の6面 + 2 Issue を独立再照合(observed HEAD `c2e4975ff` で確約級引用を verbatim 再測 — promote-self.ts:7-9/45-46/229-236、norm-metrics.ts:157-161/parseGoaLine:688/parsePmCidLine:704、amadeus-mirror.ts:33/39/206-208/275、contrib upstream-sync の dist 0件/self-install 3件 = すべて一致・訂正なし)。以下は合成の追加知見(scan の事実は再掲せず、構成マップ・配置含意・seam 位置・#1135 の構造上の置き場所に絞る)。

### (a) 選挙基盤の構成要素マップ(mirror.ts 写像)

`scripts/amadeus-mirror.ts` を写像元に、選挙 TS 基盤 `scripts/amadeus-election.ts`(【推定】将来 intent で確定)を次の5層に分解する。各層は S-01..S-08 と 1:1。

| 層 | 責務(選挙) | mirror.ts 写像元 | S-ID |
|---|---|---|---|
| データモデル | 選挙定義(質問・選択肢・投票者集合・種別)+ 票(選択・GoA・留保・根拠)の判別ユニオン型。無効状態を表現不能に(parse-don't-validate) | `ArgsOutcome`(:33)判別ユニオン + `amadeus-lib` 決定的状態読取(activeIntent/getField) | S-01/S-03 |
| 開票純関数 | GoA 集計の決定的計算(賛成 1-3/6・反対 7-8・棄権4除外・8 ブロック保留・多数決/タイ判定)。結果=「成立/保留(要人間)」。**票データからの導出のみ**(検証劇場回避、ハードコード禁止) | (mirror に相当層なし — 新規。純関数 export で in-process seam テスト = bun-coverage-spawn-blindspot 回避) | S-04 |
| 記録生成 | 票タイムライン行・GoA 度数行(`GoA[E-…]: 1x<n> … 8x<n>`)・persist 文素案の自動生成。**既存 `parseGoaLine`/`parsePmCidLine` の入力スキーマに byte 互換**(生成⇔parse の対称対、C-08) | (新規。norm-metrics.ts:157-161 の3正規表現が出力形の権威) | S-05 |
| 照合 | 留保必須票(GoA 2/3/6)の件数 vs 転記の機械照合、票数表記の照合(現行人力チェックの機械化) | (新規。norm-pr-vote-count-check / reservation-transcription-count-check の機械化) | S-06 |
| CLI | `export function main(argv): number` + `import.meta.main` 起動、exit code 0/1/2、サブコマンド分岐 switch idiom | `parseArgs`(:39)+ `Bun.spawnSync` 境界様式(:206-208)。ただし選挙は **gh 不要**(agmsg + record ファイルで完結) | S-01..S-07 |
| SKILL 薄ラップ | `/amadeus-election` — 配信〜開票の手順書 + 上記 CLI 呼び出し。判断はラップしない | (mirror は SKILL 化なし — 新規。amadeus-upstream-sync が contrib overlay パターン) | S-08 |

**開票純関数の設計上の要**: GoA 集計規則(i)-(v)は `gradients-of-agreement-scale`(team.md:58)が唯一の権威仕様。純関数 = `(votes: Vote[]) → Tally`(成立/保留 + GoA 度数)で副作用ゼロ、落ちる実証(不正票・二重票・8-bin 逸脱の拒否)を in-process seam テストで固定する。**W-06(人間裁定の自動化)は out** — タイ・GoA 8 再審・エスカレーションは「保留(要人間)」を返すのみ。

### (b) contrib/skills 配置 vs scripts/ の含意(決定は application-design へ委任)

TS 本体の置き場所は2案あり、いずれも配布外(W-04)を構造的に満たすが性質が異なる。**両案の実測に基づく比較のみを記し、決定は application-design に委ねる**。

| | 案A: `scripts/amadeus-election.ts` | 案B: `contrib/skills/amadeus-election/<tool>.ts` |
|---|---|---|
| dist ドリフト | 非対象(package.ts の入力は core/harness のみ) | 非対象(promote-self が dist バイパス投影 :229-236) |
| self-install 投影 | **されない**(scripts はどのツリーにも投影されない) | `.claude/skills/` + `.agents/skills/` へ投影(:46) |
| CI lint/typecheck | 自動収容(biome.json `scripts/**` + tsconfig `scripts/*.ts` — 追加配線不要、mirror 前例) | 【推定】contrib 配下の lint/typecheck 収容は要実測(application-design で biome/tsconfig の includes を確認) |
| user-invocable `/amadeus-election` | **不可**(scripts は SKILL discovery 対象外) | **可**(SKILL.md を同梱すれば discovery ツリーに載る) |
| 前例 | `amadeus-mirror.ts`(同型ツール) | `amadeus-upstream-sync`(SKILL + references + agents、evals authoring-only) |

**トレードオフの核**: S-08(user-invocable SKILL)を満たすには contrib overlay 経由が**必須**(scripts は `/amadeus-*` にならない — F5 実測)。よって「CLI 本体を scripts に置き SKILL だけ contrib」の分離案(案A+薄 SKILL)と「CLI も SKILL も contrib 配下に同居」の一体案(案B)の二択が実質論点。分離案は CI 自動収容の既知性が利点、一体案は投影一貫性(1ディレクトリで完結)が利点。**決定は application-design**(C-07 の「ファイル正本」定義と併せて確定)。

### (c) 輸送抽象(agmsg member / solo subagent)の seam 位置

C-05(D-12 改定)の輸送抽象は**票構造・開票・記録の共通層の外側**に置く薄い seam。層マップ(a)の「配信」と「投票収集」だけがモード分岐し、開票純関数・記録生成・照合はモード非依存(両モード共通)。

- **team モード**: 配信 = leader→各投票者 agmsg(単一 body に「選挙 ID+正本パス」)。投票収集 = 投票者→leader agmsg 私秘(C-02 blind 維持)。seam = agmsg `send.sh`(位置引数4・単一 message body — 構造化票は body エンコード or 票ファイル参照)。
- **solo モード**: 配信 = spawn サブエージェント(構造的隔離が blind 性を**無償保証** — サブエージェントは他票を見られない)。投票収集 = サブエージェント最終報告の回収(spawned-agent-result-delivery / disk-evidence-early-takeover の回収規律)。
- **共通契約**: 票に voter 種別(`member`/`subagent`)を**必須属性**として明記(C-05)。開票純関数は種別を集計に使わず記録のみ(監査可能性)。**W-05=agmsg 置換なし** — 輸送はそのまま利用し、抽象は「配信/収集の呼び出し口を1関数にまとめ、team/solo で実装差し替え」の薄い interface に留める。**未決点(requirements へ)**: 票の授受を agmsg body のままにするか **票ファイル方式**にするか(#1137 の中核論点。票ファイルなら solo/team で輸送実装を統一でき、agmsg body なら solo は subagent 報告テキストの parse が要る)。

### (d) #1135 シャッフルの構造上の置き場所

#1135(位置チャネル封鎖の内部 No/表示番号分離)は選挙基盤の**データモデル層 + CLI 層に自然に内包**され、独立機構を要さない。写像:

- **S-01 起票**: データモデルは選択肢を **内部 No(安定 ID)** で保持。起草者は内部 No で提出。
- **S-02 配信**: CLI が配信文生成時に表示番号 1..N を**シャッフル**し、内部 No↔表示番号の**対応表を record 内に非公開保持**(leader 手元相当 = ツールが対応表ファイルを blind 期間中は投票者非可視の場所に置く)。配信 body には表示番号のみ。
- **S-04 開票**: 投票の表示番号を対応表で内部 No へ**写像してから**集計。→ 手作業写像の M4 転記ミス(numbers-from-command-output-only 違反)を機械化で封じる = #1135 の機械化価値の核。
- **S-07 開票時票公開**: 対応表を**公開**(検証可能性回復)。全票の内部 No/表示番号両建てをファイル化。

**構造含意**: シャッフル+写像は「開票純関数の**手前の変換層**」(表示番号→内部 No の正規化)として実装し、開票純関数自体は内部 No のみを扱う純粋関数のまま保つ(シャッフルは非決定要素だが seed 記録で再現可能にすれば落ちる実証が書ける)。#1135 の限界(位置チャネル封鎖のみ、選択肢本文からの判別・自己認知は対象外)は本 intent でも不変 — ツールは位置漏洩のみを機械的に塞ぐ。

### 合成の結論(下流ステージへの申し送り)

1. **application-design 決定事項**: (b) の案A(scripts + 薄 SKILL 分離)vs 案B(contrib 一体)、(c) の票ファイル方式 vs agmsg body、C-07 の「ファイル正本」形式の3点。
2. **requirements 固定事項**: 票構造(選択+GoA+留保+根拠+voter 種別)、開票純関数の入出力契約、落ちる実証(不正票/二重票/8-bin 逸脱/表示番号写像不能の拒否)、S-05 出力の norm-metrics スキーマ byte 互換(C-08)。
3. **codekb 温存の妥当性**: 選挙のライフサイクル契約(norm-metrics parse・agmsg・mirror・SKILL 投影・選挙ノルム)はいずれも区間無変更で、実装は future intent。本 scan の唯一の構造的新知識 = contrib overlay(architecture.md へ最小追補済み)。
