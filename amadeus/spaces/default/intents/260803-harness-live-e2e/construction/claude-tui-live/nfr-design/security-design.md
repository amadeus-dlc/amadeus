# Security Design — claude-tui-live

## 上流契約

本設計は`business-logic-model.md:7-35`を入力とし、Claude TUIとtmuxをrun-owned failure domainへ隔離する。

## Controls

- GHA hard denyとstrict `AMADEUS_TUI_LIVE`をtmux/CLI probe前に評価し、runner flagによる暗黙opt-inを禁止する（同:7）。
- socket path/session nameは128-bit run nonceからscratch内に生成し、全tmux commandでprivate `-S`を明示する。default socketのlist/attach/killを禁止する（同:10,17）。
- C5はclosed argv/env/cwd/credential pipeを構成し、C4のrun-owned supervisor capabilityへ渡す。tmux server、pane、Claude childを同一owner receiptへ登録する。
- pane captureはraw byte 1,048,576、行16,384、single line 65,536を上限にincremental digestし、超過時はsession→server→groupを有界停止してexecution failureとする。
- cleanup順はsession→private server→credential→scratch。server PID/start identity/socket inodeを再検証し、developer tmuxへsignalしない（同:12,17）。debug保持はsanitized capture/projectだけでsecret/session/serverを残さない。
- tool/state/audit/file anchorはrun nonce/state revisionへ結合し、stale capture/prose-only successを拒否する。

## Verification

default socket接続、foreign session、socket replacement、pane flood、leader/server先行終了、implicit opt-in、credential/path leakをU02 mutant redにする。AWS/HTTP/databaseは非適用。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T16:00:54Z
- **Iteration:** 1
- **Scope decision:** none

private tmux socket、bounded pane capture、implicit opt-in禁止は具体的だが、credential/cleanup所有権、tmux server消失時のprocess containment、current-run anchor契約が閉じていない。

### Findings

- BLOCKER | credentialとcleanup coordinatorの所有権が矛盾する | business-logic-modelはC5がauth leaseをpreflightしchild envを準備し、security-designもC5がcredential pipeを構成すると定める。一方logical-componentsはC4がcredentialを所有し、TmuxCleanupCoordinatorのownerとC4/C5間interfaceを定義しない。session→server→credential→scratchの順序を実装する際、lease handle、tmux identity、destroy責任の所在が一意に決まらない | C5をcredential bindingとtmux protocolのowner、C4をregistrarと全体cleanup順序のownerとして固定し、C4がCleanupTargetをC5へ渡してsession/server cleanup receiptを受け、その後credential/scratchを処理するinterfaceと失敗時優先順位を定義する
- BLOCKER | tmux server先行終了時のcredential-bearing pane containmentが未定義 | security-designはserver PID/start identity/socket inodeを再検証してsession→server→groupを停止するとするが、tmux serverまたはsocketが先に消失しClaude pane/descendantだけが残った場合の識別・停止経路を定義していない。Verificationはleader/server先行終了を要求するものの、logical-componentsのrun-owned supervisorとtmux daemon/paneを結ぶowner identityもないため、private socket経由cleanup不能後にmodel processが残り得る | server、pane leader、Claude child、descendantをrun nonce付きowner receiptへ個別登録し、socket消失後もOS identityで有界停止できるsupervisor契約を定義する。server先行終了・socket消失fixtureでcredential-bearing process残存0を必須にする
- BLOCKER | current-run anchorが抽象名だけで実装不能 | functional designはtool/state/audit/file anchorを列挙するだけで、security-designもrun nonce/state revisionへの結合を宣言するのみである。literal prompt、anchor producer、期待field/value、revisionの前後関係、terminal順序・重複条件がなく、stale pane captureやprose-only応答をどう拒否するか実装者が決められない | promptと正の構造化実行証拠をclosed schemaで定義し、tmux session/run nonce、実行前revision、実行後revision、tool/audit/file receipt、exactly-one terminalの順序を結合する。stale・foreign-session・duplicate・prose-only fixtureをmutant redに追加する
