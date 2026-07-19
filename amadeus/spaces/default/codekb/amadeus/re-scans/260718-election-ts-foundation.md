# re-scan 記録 — 260718-election-ts-foundation

## 実行メタデータ

- Date: 2026-07-19(Asia/Tokyo)
- Observed at: HEAD `c2e4975ff2abe0290d899fdbd04b856213175c7a`(`git rev-parse HEAD` 実測、scan-notes 参照)
- Intent: `260718-election-ts-foundation`(選挙4類型ライフサイクルの決定的 TS 基盤 + user-invocable SKILL 薄ラップ。チーム内ツール・配布外、ソロ選挙も輸送抽象で取込 = D-12。本 intent は ideation のみ、実装は mirror Issue 経由の将来 intent)
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`e9a001105`(全 `re-scans/*.md` observed のうち HEAD 祖先で距離最小。`git merge-base --is-ancestor e9a001105 HEAD` exit 0 実測、`git rev-list --count e9a001105..HEAD`=**69**。base は 260717-swarm-dispatch-enum の observed に一致)。鮮度ポインタが指す 260718-hooks-config-conflict の observed `594ba21d…` は `--is-ancestor`=**exit 1(非祖先)**の並行 squash tip につき base 候補から除外(rescan-base-ancestry / re-timestamp-merge-resolution)。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- 測定 ref: 件数・行番号はすべて observed HEAD `c2e4975ff` の実ファイル直読(measurement-ref-in-artifacts)。区間変更は `git diff --stat e9a001105..HEAD` / `git log e9a001105..HEAD -- <path>` で実測。
- Per-intent 真実源: 本ファイルおよび `inception/reverse-engineering/scan-notes.md`
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。共有 `reverse-engineering-timestamp.md` は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## スキャン結論の要約

選挙 TS 基盤(S-01..S-08)が消費する seam の現行実装を6面 + 関連2 Issue で確定。区間 `e9a001105..HEAD`(69コミット、493 files / +80,871 / −693)の増分大宗は **codex-hooks 移行**でフォーカス面と非交差。フォーカス面の区間変更は軽微(mirror 8行、norm メモリ追記のみ)。

- **F1 配布/インストールのチャンネル構造(反証課題の帰結)**: タスクの反証課題「local overlay チャンネル(dist 非対象コピー)が存在しないこと」は **反証**。`contrib/skills/` overlay チャンネルが実在(`promote-self.ts:45` `CONTRIBUTOR_SKILLS_ROOT = "contrib/skills"`、`:46` `CONTRIBUTOR_SKILL_DESTINATIONS = [".claude/skills", ".agents/skills"]`、投影ロジック :229-236)。ヘッダコメント(:7-9 verbatim)「Contributor-only skill runtime files under contrib/skills/ are projected into both harness discovery trees without entering dist/. Authoring-only eval assets remain at the canonical contributor path.」既存例 `contrib/skills/amadeus-upstream-sync/`(tracked 6ファイル)は `.claude/skills/amadeus-upstream-sync/` へ投影(3ファイル tracked)されるが `dist/claude/.claude/skills/` には**不在**(`git ls-files` 実測 = dist 0件)。→ 3層(canonical→dist→self-install)に加え **contrib overlay(dist バイパス)**が4本目のチャンネルとして実在。W-04(配布外)整合の SKILL 配置経路。
- **F2 GoA/選挙記録の parse 資産**: `packages/framework/core/tools/amadeus-norm-metrics.ts`(self-install `.claude/tools/` と 36,073 bytes 同一)は **区間変更ゼロ**。入力スキーマ正規表現 verbatim: `GOA_HEAD_RE`(:157)`/^GoA\[(E-[A-Z0-9]+)\]:\s*(.+)$/`、`GOA_TOKEN_RE`(:158)`/^([1-8])x(\d+)$/`、`PM_CID_RE`(:161)`/^PM-cid:\s+([a-z0-9-]+(?::[a-z0-9-]+)*)\s+incident=(.+)\s+round=(E-[A-Z0-9]+)$/`。`parseGoaLine`(:688)/`parsePmCidLine`(:704)は判別ユニオン `GoaBreakdown|ParseFailure` を返し never-estimates(malformed は ParseFailure)。→ C-08: S-05 の生成側(GoA 度数行・persist 文)はこの入力スキーマに **byte 互換**で対を成す(生成⇔parse の対称対)。
- **F3 agmsg 輸送 seam(repo 外)**: 実体 `~/.agents/skills/agmsg/scripts/`(SQLite ベース、実在確認)。`send.sh` 契約(:4-6 verbatim)`Usage: send.sh <team> <from> <to> <message>` — message は**単一位置引数**(構造化ペイロードは body エンコードで運ぶ)。未登録宛先でも成功を返す既知の無音不達(agmsg-recipient-typo)。team 名は `team-up.sh` の `AGMSG_TEAM`(default `amadeus`)/`TEAM_INSTANCE` 導出。→ C-05(D-12 改定)の輸送抽象: team=agmsg メンバー投票 / solo=spawn サブエージェント投票。S-02 blind 配信は agmsg 単一 body に「選挙 ID+正本パス」を載せる形が自然、W-05=agmsg 置換なし。
- **F4 チームローカルツール前例(`scripts/amadeus-mirror.ts`)**: 最有力実装写像元。ヘッダ契約(:1-10)「record tree は source of truth、sync は record→issue 一方向、状態は決定的ソース(intents.json + amadeus-state.md)からのみ read、書き込みは gh 呼び出しと state.md の Mirror Issue フィールドのみ」。Exit codes 0/1/2。`amadeus-lib` から決定的状態読取を import、`parseArgs`(:39)は判別ユニオン `ArgsOutcome`(:33、create/sync/close/usage)を返す(functional-domain-modeling-ts スタイル)。gh 境界 = `Bun.spawnSync`(:206-208)、runnable でなければ exit 127・`kind:"error"`、gh keyring 委譲でトークン非保持(team.md gh-scripts-boundary)。ラベル `intent-mirror`(:275)。区間変更は `cd9865194`(#1172 の countStageProgress 分母是正、+8行)1コミットのみでフォーカス契約無変更。→ 選挙ツールは同型 — `scripts/amadeus-election.ts`、決定的状態読取、判別ユニオン Result、exit code 契約、in-process seam テスト。**scripts/ は dist にも contrib 投影にも入らない**ため配布外(W-04)を構造的に満たす。ただし選挙は agmsg + record ファイルで完結し gh 不要。
- **F5 SKILL パッケージング**: `.claude/skills/` = 41ディレクトリ(40 framework 由来 = dist に存在、1 = `amadeus-upstream-sync` は contrib overlay 由来)。runner-gen(`amadeus-runner-gen.ts`)の管轄は stage-runner + scope-runner の2系統のみで**任意名の一般 SKILL は生成しない** — 選挙 SKILL は管轄外。→ `/amadeus-election` の user-invocable 化は (a) `contrib/skills/amadeus-election/`(dogfood 投影・配布外)か (b) framework session skill 化(dist 投影 = W-04 矛盾)の2択で、**(a) が W-04 整合の唯一経路**(amadeus-upstream-sync が既存パターン)。
- **F6 選挙ノルムの棚卸し(機械化対象 cid)**: team.md/project.md から機械抽出。**In-Scope(S-01..S-07 写像)= 13 cid**(election-protocol / gradients-of-agreement-scale が S-02/S-04 中核仕様、persist-vote-timeline-field / norm-pr-vote-count-check / reservation-transcription-count-check / citation-reservation-preservation / early-tally-with-block-reopen / election-distribution-verbatim-and-length / learnings-election / blocker-election / gate-report-s13-bundling / s13-before-approve-under-auto-delegate / election-answer-after-ruling + 補助 agmsg-git-evidence-split)。**Out-of-Scope(申し送り)**= W-01(no-election-judgment-gate)/ W-02(reviewer-filer-check 等)/ W-03(weekly-distillation-round 等)ほか。→ A 群のライフサイクル契約は区間**無変更**(区間内の team.md 追記は別 E-code 学習で選挙運用契約の書き換えではない)。

## 関連 open Issue(requirements 取込候補)

- **#1137**(OPEN、enhancement/P2)— 本 intent の直接先行起票。blind 配信・GoA 投票・開票・票タイムライン・留保転記の agmsg 手作業執行をスキル化 + 決定的 CLI で機械支援。**未決点(requirements へ)**: 票の授受を agmsg のままにするか **票ファイル方式**にするか。検証劇場回避 = 集計は実票データ導出のみ、落ちる実証(不正票・二重票の拒否)必須。
- **#1135**(OPEN、enhancement/P2)— S-02 blind 配信の受け皿。blind でも選択肢の位置が推奨を漏らす問題に、内部 No と表示番号を分離(起草は内部 No、配信時に表示番号 1..N をシャッフル・対応表は leader 手元、投票は表示番号、集計は内部 No へ写像、開票時に対応表公開)。→ S-01(内部 No 起票)/ S-02(表示番号配信)/ S-04(内部 No 集計)/ S-07(対応表公開)に自然に埋め込まれる。

## codekb 本文への反映判断

codekb 本文8ファイル(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment)のうち、本 intent のフォーカス面で実質の**新規知識は「contrib overlay チャンネル(dist バイパス)の存在」の1点**。これを `architecture.md` の配布境界に最小追補する(dist・self-install の2/3層記述に contrib overlay を1段追加)。他フォーカス面 — norm-metrics(区間0)・agmsg(repo 外・無変更)・mirror(契約無変更)・SKILL 投影(claude manifest 無変更)・選挙ノルム契約(無変更)— はいずれも本文と矛盾なく **温存**(churn 回避、cid:reverse-engineering:c1)。api-documentation.md は選挙ツールの CLI 契約が future intent(実装)で確定するため本 scan では温存。更新は本 re-scan エントリ + `reverse-engineering-timestamp.md`(鮮度ポインタ + 旧「最新: 260718-hooks-config-conflict」→履歴ラベル降格)+ `architecture.md` の contrib overlay 追補節。

## Delivery boundary

main merge/rebase、Issue close、GitHub 上のレビュー作成・更新操作、実装は本 scan で実施していない。既存 dirty state / 旧 intent audit は変更していない。
