# Requirements Analysis 質問

> E-OC1証跡: Guide meによるソロモード・ユーザー本人のHUMAN_TURN直接回答。Q1〜Q4の個別回答後、Q5で合意サマリーを確認した。leader（ユーザー本人）承認: 2026-07-29T07:52:34Z。

## Q1: Intent作成後に追加されたBugの扱い

Intent作成後にopen bugとなった[#1680](https://github.com/amadeus-dlc/amadeus/issues/1680)をどう扱いますか。

Q1の「このIntentへ追加する」は、Issue本文に記載された次の要求を7件目の正本として採用することを含む。

- Kimiのforwarding-loop Stop hookはmain conductorだけへ作用し、reviewer・support・exploreなどのsubagentではno-opになる
- subagent roleからの`next`、`report`、`park`、state mutationはprompt依存でなくruntime authorizationで拒否される
- reviewer READYだけでは人間のstage gateを承認できない
- `GATE_APPROVED`は当該gate responseのprovenanceへ結び付き、別質問のHUMAN_TURNを流用しない
- main conductorに対するStop-hook強制は維持する
- Kimi subagentのpending directive、reviewer READY、recovered gate-startをintegration testで保護する

- A. このIntentへ追加する — 7件目として1 Issue = 1 Bolt = 1 PRで修正する
- B. 別のBugfix Intentへ分離する — 現在のIntentは当初の6件だけを扱う
- C. OTel Intent #1679で扱う — 本Bugfix Intentの対象外とする
- X. Other (please specify)

[Answer]: A — このIntentへ追加する（2026-07-29T07:33:13Z、ユーザー直接回答）

## Q2: #1662のdirty worktree契約

[#1662](https://github.com/amadeus-dlc/amadeus/issues/1662)で、未コミット変更があるローカルcoverage patch checkをどう扱いますか。

- A. fail-fastする — dirty worktreeを検出して、commitまたはstashを促す実行可能なエラーを返す
- B. working tree差分を含める — diffとLCOVを現在のworking tree snapshotへ揃えて検査する
- C. 一時clean snapshotで再実行する — committed diffと同じsnapshotのcoverageを別途生成する
- X. Other (please specify)

[Answer]: A — fail-fastする（2026-07-29T07:34:07Z、ユーザー直接回答）

## Q3: flaky系3件の完了基準

[#1667](https://github.com/amadeus-dlc/amadeus/issues/1667)、[#1664](https://github.com/amadeus-dlc/amadeus/issues/1664)、[#1663](https://github.com/amadeus-dlc/amadeus/issues/1663)の完了基準をどうしますか。

- A. evidence-firstで閉じる — 決定的な再現または制御されたstress証拠で根因を確定し、回帰テストと最小修正を同じBoltへ含める。診断追加だけでは完了にしない
- B. diagnosis-firstを許可する — 根因未確定なら診断強化だけのPRを先に出し、Issueは後続修正までopenに保つ
- C. 緩和で閉じる — timeout調整、serial化、診断強化などで再発率を下げれば根因未確定でも完了とする
- X. Other (please specify)

[Answer]: A — evidence-firstで閉じる（2026-07-29T07:35:13Z、ユーザー直接回答）

## Q4: OTel Intentとの順序

進行中の[OTel Intent Mirror #1679](https://github.com/amadeus-dlc/amadeus/issues/1679)はINCEPTIONです。共有するworkflow終端・承認境界のBugをどう順序付けますか。

- A. #1607から#1680を直列で先行する — 共有ファイル競合を避け、両方の完了後にOTel Constructionへ進む。他の独立Bugは並行実行する
- B. #1680から#1607を直列で先行する — 承認迂回を先に閉じてからcompletion transactionを修正する。他の独立Bugは並行実行する
- C. OTelを先行可能とする — Bugfix Intentとは独立に進め、共有ファイル競合を統合時に解消する
- X. Other (please specify)

[Answer]: A — #1607から#1680を直列で先行する（2026-07-29T07:46:53Z、ユーザー直接回答）

## Q5: 合意サマリーの確認

Q1〜Q4の回答を要件生成の正本として確定してよいですか。

- A. 正しい — この合意サマリーからrequirements.mdを生成する
- B. 修正する — 変更する回答と内容を指定する
- X. Other (please specify)

[Answer]: A — 正しい（2026-07-29T07:52:34Z、ユーザー直接回答）

## Q6: 今後へ残す学習

今回のRequirements Analysisで得た判断のうち、プロジェクトルールとして残すものを選んでください（複数選択可）。選択した項目はprojectへ保存し、teamへ昇格したい場合は回答時に指定してください。

- A. Reverse Engineering承認後に追加されたIssueの根拠をrequirements質問票へ追補する
- B. flaky bugはEvidence-firstで閉じる
- C. Intent作成後にopen bugとなったIssueを同じIntentへ追加する
- D. workflow completionではcomplete後専用audit appendを採用しない
- E. coverage patch gateはdirty worktreeをfail-fastする
- F. 共有境界のBugを依存順に直列化し、独立Bugを並行化する
- G. すべて保存しない
- X. Other (please specify)

[Answer]: A — Reverse Engineering承認後に追加されたIssueの根拠をrequirements質問票へ追補する（2026-07-29T08:02:52Z、ユーザー直接回答）

## Q7: 次回へ追加すること

次回のRequirements Analysisへ追加で残したいことはありますか。

- A. なし
- X. Other (please specify)

[Answer]: A — なし（2026-07-29T08:03:21Z、ユーザー直接回答）
