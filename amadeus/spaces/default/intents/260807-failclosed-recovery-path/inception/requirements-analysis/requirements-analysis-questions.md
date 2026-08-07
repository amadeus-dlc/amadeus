# Requirements Analysis — 明確化質問

上流入力(consumes 全数): `business-overview`(`amadeus/spaces/default/codekb/amadeus/business-overview.md`)、`architecture`(同 `architecture.md`)、`code-structure`(同 `code-structure.md`)。`intent-statement` / `scope-document` / `team-practices` は scope `self-fix` が ideation フェーズと practices-discovery を SKIP するため不在(設計どおりの不在であり検証ギャップではない)。

## 選挙不要判定(E-OC1)

- **判定**: 本ファイルの全問は**選挙不要**。根拠種別 = **ユーザー専権事項**(エスカレーション正準リスト(4)「仕様変更 — 既存の要件・ユーザー可視契約・挙動を変更したい場合」および(3)「人間の関与が本質の事項」)。ソロ選挙の自動発動3類型((a) 設計逸脱 (b) ブロッカー (c) §13 学習選定)のいずれにも該当しない。Intent Autonomy Mode は `none` のため `decide-question` 経路も適用しない。
- **既決事項は問わない**: Issue #2385 の Q1〜Q5(2026-08-07 ユーザー裁定済み)、および §10 の Bolt 別チェックリスト・§11 の RAID 種は既決として扱い再質問しない(`cid:requirements-analysis:c3-260729-open-bug-batch` / `cid:intent-capture:c1`)。本ファイルの4問は、Reverse Engineering の observed 実測(`re-scans/260807-failclosed-recovery-path.md`)によって**新たに未決と判明した点**に限る。
- **記入順序**: `cid:requirements-analysis:no-election-judgment-gate` に従い、判定申告 → ユーザー承認 → `[Answer]` 記入の3段順序を守る。ユーザー承認の記録は本節末尾に追記する。

- **ユーザー承認**: 2026-08-07T04:29:50Z — 選挙不要判定を承認のうえ、Q1〜Q4 の裁定を AskUserQuestion で受領した(全問 A を選択)。

## Q1. #2313 の影響範囲の断定が observed で不成立 — どう扱うか

Issue #2313(および正本 #2385 の「影響・価値」節)は逐語で「全 PR の trusted base ゲートが内容と無関係に `BASELINE_INVALID` になるため、他2件を含むあらゆる修正 PR が着地できない」と述べ、これが **S1-FATAL / P1** の根拠になっている。

RE の observed 実測(`b8e3e664f`)はこれを反証した:

- main の最新 CI run **31135183415 は全 job success**(ratchet ステップを含む `Lint and complexity` も success)
- ローカル `bun tests/no-silent-drop-gate.ts check --base-revision <HEAD^ の完全 SHA>` → **exit 0** / `NO_SILENT_DROP_OK`
- 恒久赤は **main 限定の `No Silent Drop Evidence Reconcile` ワークフローのみ**(直近3 run すべて failure、コード `REBIND_NON_IDENTITY_DRIFT`)

修正の必要性自体は変わらない(reconcile が赤のままなら evidence binding は陳腐化し続ける)が、重大度の根拠文と受け入れ基準の書き方が変わる。

- A. requirements で影響範囲を実測どおりに書き直し、あわせて **#2313 と #2385 へ訂正コメントを投稿**する(Issue 本文の断定を実測に合わせる)
- B. requirements 内の記述訂正のみ行い、Issue へのコメント投稿はしない
- C. 記述は #2385 のまま維持し、reconcile 恒久赤のみを根拠に P1/S1-FATAL を維持する
- D. requirements で訂正しつつ、重大度ラベル自体の見直し(S1-FATAL → S2 等)も同時に諮る
- X. Other (please specify)

[Answer]: A — requirements で影響範囲を実測どおりに書き直し、あわせて #2313 と #2385 へ訂正コメントを投稿する(ユーザー承認 2026-08-07T04:29:50Z)

## Q2. #2330 回復 verb の対象範囲 — 単一 store か複数探索か

#2385 §10 Bolt 2 は「per-clone 前提(事前 census 不能、任意 clone・任意 intent の store で成立)」とのみ指定し、**verb が一度に扱う store の数**を決めていない。

RE の実測(本 clone、`find <clone root> -name '.amadeus-advisory-choice.json'`)では **6 件**が実在し、内訳は **schema 1 が 5 件・schema 2 が 1 件**。5 件の schema 1 は複数の worktree(`260805-subagent-type-guard` / `issue-1971-pr-convergence` / `tla-authoring-wt` / `docs-maintenance` / 本線 `260804-tla-authoring`)にまたがって滞留している。

なお #2385 §7(b) は、#2352(worktree セッションの project-dir が main チェックアウトへ解決される)の環境下で破棄系 verb が**本線 store を誤破棄**しうるため、破棄前に store の pending の intent identity と実行時 active intent の一致を検証し不一致なら loud に拒否する、という防御設計を要求している。探索範囲を広げるほどこの誤爆面も広がる。

- A. **単一 store のみ**(`--project-dir` で明示指定した1 store を対象とする。既定は cwd 解決の active intent)
- B. **clone 内を探索して複数を一括対象**にする(worktree 横断で schema 1 を検出し順に処理)
- C. **既定は単一、明示フラグで探索を許す**(例: `--all` / `--scan-root <path>` を付けたときのみ複数)
- D. 単一 store のみを処理対象とし、**探索は read-only の `list` 系サブ verb として分離**する(検出と変更を別 verb にする)
- X. Other (please specify)

[Answer]: A — 単一 store のみ(`--project-dir` で明示指定した1 store。既定は cwd 解決の active intent)(ユーザー承認 2026-08-07T04:29:50Z)

## Q3. #2358 の「明示宣言」の永続化先 — state 面をどこに置くか

#2385 §6 は「『開いた directive』の永続化チャンネルは現状**存在しない**(`emit()` は stdout 出力 + error 時の audit 追記のみ)。宣言フラグは state への新規書き込み面の新設を伴う」とし、§10 Bolt 3 は「宣言の永続化は state への新規書き込み面 — **追加的(additive)に設計し、mirror snapshot 述語(#2252 類)や既存 reader を巻き込まない**」と制約する。だが**具体的な置き場所は未指定**である。

scope `self-fix` は functional-design を SKIP するため、この設計判断は requirements で確定させる必要がある(次ステージは code-generation)。

- A. `amadeus-state.md` に**新しい H2 セクション**を追加する(既存 parse 面・checkbox ガードを触らない追加のみ)
- B. `amadeus-state.md` の既存 `## Current Status` 節に**新しいフィールド行**を追加する
- C. **record 配下の別ファイル**(`<record>/construction/.unit-declaration.json` 等)に置き、`amadeus-state.md` には一切触れない
- D. 既存の **audit イベント**として記録し、engine は audit を読んで判定する(state ファイルへの書き込み面を新設しない)
- X. Other (please specify)

[Answer]: A — `amadeus-state.md` に新しい H2 セクションを追加する(既存 parse 面・checkbox ガードを触らない追加のみ)(ユーザー承認 2026-08-07T04:29:50Z)

## Q4. #2385 §10 Bolt 1 が求める「将来 PR 作者向け手順の docs 化」— 対象文書と粒度

#2385 §10 Bolt 1 の最終項は「gate 実装を触る PR は t413 が赤くなる → branch 内 rebind(`bun scripts/no-silent-drop-evidence.ts rebind --target-revision <head>`)の手順を文書化する」と指示するが、**どの文書に書くか**を指定していない。

observed の docs 構成: `docs/reference` は 00〜24(次の新章は 25)、`docs/guide` は 00〜23、`docs/harness-engineering` は 00〜09。`docs/reference/11-contributing.md` は本区間で +53 行の更新を受け、worktree/branch 規範(#2331)を扱っている。日本語対訳面(`.ja.md`)の同期規約も適用される。

- A. `docs/reference/11-contributing.md` に節を追加する(コントリビュータ向け手順として既存文書に載せる。対訳 `.ja.md` も同時更新)
- B. `docs/reference` に**新章 25** を立てる(no-silent-drop の証拠束と rebind 運用の専用章)
- C. `tests/no-silent-drop/` 配下の **README** として置く(実装の隣に置き、docs 章番号空間に触れない)
- D. 文書は作らず、**t413 の失敗メッセージ自体に手順を埋め込む**(赤くなった人がその場で手順を読める)
- X. Other (please specify)

[Answer]: A — `docs/reference/11-contributing.md` に節を追加する(対訳 `.ja.md` も同時更新)(ユーザー承認 2026-08-07T04:29:50Z)

## Q5. Q2-A の敵対検証(RAID 種1)で残存ホール検出 — 第2段証明の再裁定

#2385 §11 RAID 種1「Q2-A の敵対検証: 全 tree 一致が防いでいた攻撃で、縮小後に通るものは何かの列挙を requirements 段で1回行う。通るものが見つかれば実装前に停止して再裁定」を実施した結果、**1件が通る**と判明した。

列挙(縮小後の保証 = 「binding ≡ PR head(証拠3ファイル除く全 tree)」+「PR head ≡ landing(証拠3ファイルのみ)」):

- (a) base 前進(並行 intent の record・metrics snapshot 着地)— **意図どおり通す**(Q2-A の目的)
- (b) **landing に並行 PR 由来の gate 実装変更(`tests/no-silent-drop/**/*.ts` / `tests/no-silent-drop-gate.ts`)が混入するケース — 残存ホール**。縮小後の第2段はこれを止めず、binding が landing になった後は freshness が `landing..next` を見るため吸収済み変更は以後 drift として検出されない。証拠束は旧 gate 実装の census を新実装に対して attest したまま固定される
- (c) landing への corpus(`packages/framework/core/tools`)変更の混入 — 新規露出なし(t413 既決裁定が corpus を freshness 対象外としている)

- A. **第2段証明を「Q1 の canonical freshness パス集合(gate 実装)で PR head と landing が一致すること」とする** — 証拠3ファイル限定でなく、canonical 集合を Q1 と共有。base 前進は許容され (b) は閉じる
- B. Q2-A のまま(3ファイルのみ)で進め、(b) は RAID の既知残存リスクとして #2216 の担当にする
- C. Q2-A のまま実装し、(b) を別 Issue に起票して追跡する
- X. Other (please specify)

[Answer]: A — 第2段証明は「canonical freshness パス集合(gate 実装 = `:(glob)tests/no-silent-drop/**/*.ts` + `tests/no-silent-drop-gate.ts`)+ 証拠3ファイル(`EVIDENCE_BUNDLE_PATHS`)の面で PR head と landing が一致すること」へ再定義する。canonical 定義は Q1 の export を共有する。base 前進(それ以外の差分)は許容され、残存ホール (b) は閉じる(ユーザー承認 2026-08-07T04:32:26Z)
