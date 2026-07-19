# Code Summary — fix-1261-tally-choice-ruling

上流入力(consumes 全数): requirements.md(per-unit 設計6点は bugfix degrade スコープの consumes_absent 宣言どおり不在 — FD 委譲分は code-generation-plan.md が確定)

> 測定 ref: bolt コミット `da7834f`(`bolt/fix-1261-tally-choice-ruling`、base = origin/main `afa872034`、push 直前再 fetch で前進なし)。PR: [#1268](https://github.com/amadeus-dlc/amadeus/pull/1268)(Fixes #1261)。

## 実装(builder subagent — 逸脱選挙1回を挟み2段で完遂)

- 実装前停止1回(deviation-stop 準拠・コード0行): plan の outcome 二値廃止が handleRender の人間 hold 裁定合成(choice-blind 二値)と構造衝突 → 逸脱選挙 **E-TCRCG = A**(人間解決 hold は rulingOverride で二値維持、t236 期待不変)→ 再開・完遂。
- `scripts/amadeus-election-model.ts`: TallyResult established = `{winner, choiceCounts, goa}`(outcome 廃止)/ tally = GoA 成立判定(順序不変)→ 棄権(GoA4)除外母集団で choice 単純多数 → tie は hold("tie")/ Ballot.parse に unknown-choice(unknown-voter 直後)+分類順序規約コメント / `_election`→`election`。
- `scripts/amadeus-election-record.ts`: rulingText winner 描画+renderPersistDraft `rulingOverride?`。
- `scripts/amadeus-election.ts`: handleRender の established 捏造撤去 → rulingOverride で二値裁定行。
- テスト4ファイル: 新規4(E-GMEBT 回帰/棄権除外/tie hold/unknown-choice)+choice-blind 前提の既存6箇所を宣言更新(builder 報告に全列挙)。
- 配布面変更なし(dist:check/promote:self:check green で非対象を実証)。

## 検証エビデンス

| 検証 | 実測 |
|---|---|
| typecheck / lint / --ci / dist:check / promote:self:check / coverage | 全 exit 0(--ci: 388 files / 5504 assertions / Failed 0) |
| 落ちる実証(E-GMECG 追補準拠) | fix コミット後 `checkout afa872034 --` 切替 → t234 6 fail → `checkout da7834f --`(SHA 明示)復元 → 17 pass・tree clean |
| 閉包 | E-GMEBT 3票の tally 直呼び → winner.internalNo=2(exit 0) |
| lcov | diff 追加行未カバー 0(DA:0 2行は既存行の continuation 偽陰性で追加行外) |
| conductor 裏取り | scratch worktree(origin/bolt head)で t234/t238/t236 = 38 pass / 0 fail |
| deslop | 除去対象なし(既存様式整合をレビュー) |

## 逸脱・インシデント(申告)

- **worktree 隔離喪失**: 逸脱選挙後の builder 再開(SendMessage resume)が隔離 worktree でなく conductor 本線ツリー(engineer-1)で実行された(cwd 実測で検知)。実害なし — team ブランチは全 push 済みで、builder 完了後に branch --show-current 検証付きで復旧(clean・record 無傷)。bolt 成果物は正常。ハーネス挙動の罠として §13 候補へ。

## 関連

- 裁定: E-TCRRA1〜4(留保7件転記済み)+E-TCRCG(留保 = #1267 起票で履行)。
- e2 直列: 本 PR 先行着地 → e2 が CG で再接地(合意済み)。レビュー: PR #1268 を e3 へ依頼。
