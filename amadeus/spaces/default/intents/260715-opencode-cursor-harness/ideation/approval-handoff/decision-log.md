# Decision Log — Ideation フェーズの意思決定記録

intent: `260715-opencode-cursor-harness`(Issue #626)

> evidence-split(agmsg-git-evidence-split 準拠): 「git 検証可能」= 監査シャード・コミット・成果物で裏取り可能な事実。「agmsg 出典」= 配信・裁定タイムスタンプが agmsg メッセージにのみ残る事実。

## 上流成果物との対応

本ログの決定はすべて Ideation 成果物へ遡れる: D-1〜D-4 は intent-statement(intent-capture)、D-5〜D-7 は feasibility-assessment / constraint-register / raid-log(feasibility)、D-8〜D-11 は scope-document / intent-backlog(scope-definition)を確定させた決定である。

## 決定一覧

| # | 決定 | 手続き | 根拠の所在 |
| --- | --- | --- | --- |
| D-1 | intent birth(scope=amadeus、Issue #626) | leader ディスパッチ(既決ノルム cid:default-scope-amadeus の執行) | git: intents.json + amadeus-state.md(コミット dc3386a5)。agmsg: 割当指示 15:54:28Z |
| D-2 | intent-capture 4問 = すべて Issue #626 verbatim 接地で回答 | 選挙不要判定 → leader 承認(是正1回: 先記入→空欄戻し→申告) | git: intent-capture-questions.md 冒頭判定。agmsg: 是正指示 16:05:31Z / 承認 16:06:48Z |
| D-3 | §13(intent-capture)= c3 採用(E-OC1、判定申告→承認→記入の3段順序ノルム化) | blind 選挙 4/4 | git: team.md cid:no-election-judgment-gate(PR #1014)+ delegate シャード。agmsg: 開票 16:11:32Z |
| D-4 | intent-capture ゲート承認 | leader delegate-approval | git: DELEGATED_APPROVAL 16:11:33Z(監査シャード)+ GATE_APPROVED |
| D-5 | feasibility 6問 = 既決・実測接地で回答 | 選挙不要判定 → leader 承認 | git: feasibility-questions.md 冒頭判定。agmsg: 承認 16:18:51Z |
| D-6 | §13(feasibility)= 0件採用(E-OC2) | blind 選挙 4/4 | git: delegate シャード(E-OC2 裁定込み)。agmsg: 開票 16:26:13Z |
| D-7 | feasibility ゲート承認 | leader delegate-approval | git: DELEGATED_APPROVAL(コミット 1a70a018 cherry-pick)+ GATE_APPROVED |
| D-8 | scope-definition 5問 = Issue verbatim・承認済み上流・実測接地で回答(Q4 の判断成分は申告時に明示) | 選挙不要判定 → leader 承認 | git: scope-definition-questions.md 冒頭判定。agmsg: 承認 16:31:13Z |
| D-9 | backlog 序列 = walking-skeleton(opencode 先行)+ risk-first(Cursor hook seam を RE 先行検証) | org.md 既決規律+承認済み feasibility 序列からの導出(D-8 Q4) | git: intent-backlog.md B-1〜B-7 |
| D-10 | §13(scope-definition)= 0件採用(E-OC3) | blind 選挙 3/4(e1 残票は結果に影響せず締切前開票、到着次第追記) | git: delegate シャード(E-OC3 裁定込み、コミット 315091fa cherry-pick)。agmsg: 開票 16:34:48Z |
| D-11 | scope-definition ゲート承認 | leader delegate-approval | git: DELEGATED_APPROVAL + GATE_APPROVED |

## 是正・ヒヤリハット(Ideation 中)

- [Answer] 先記入(intent-capture、D-2)→ E-OC1 ノルム化(D-3)で構造的に再発防止。feasibility では起草直後の先記入を送信前に自己検知して是正(diary Tradeoffs 記録)— ノルムの実効を次回ローリング PM で振り返る(E-OC1 留保 e2)
- cherry-pick で issuer シャードを除外すると delegate provenance 検証が fail する実測知見を leader へ共有(復元コミット 630134b4)
