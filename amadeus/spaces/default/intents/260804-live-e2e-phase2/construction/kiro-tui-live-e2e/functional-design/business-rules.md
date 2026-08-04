# Business Rules — kiro-tui-live-e2e

## 入力と適用範囲

本規則は [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[components.md](../../../inception/application-design/components.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[services.md](../../../inception/application-design/services.md) に基づく。

対象はKiro CLI TUIだけである。Kiro IDE GUI/CDP、ACP、Kimi、Cursor、OpenCodeの能力を本規則から推定しない。

## Gate and isolation rules

- **BR-TUI-01:** `GITHUB_ACTIONS=true`はopt-inより優先し、canonical CI-deny SKIPを返す。
- **BR-TUI-02:** exact opt-in `1`以外はdisabled SKIPとし、process、lease、scratch、binding、ledger writeを0回にする。
- **BR-TUI-03:** child environmentはcapability declarationのallowlistから新規構築し、ambient sensitive key、raw credential、source auth/config pathを含めない。
- **BR-TUI-04:** tmuxはrun固有socketとsessionを使い、共有tmux serverへ接続しない。
- **BR-TUI-05:** assertionはdisk/state anchorを必須とし、pane captureだけ、モデル文面完全一致だけ、exitだけではPASSにしない。
- **BR-TUI-06:** pane evidenceはbyte limitを超える前に切り詰め、raw transcriptやraw promptをledger・Issue・diagnosticへ保存しない。

## Resource lifecycle rules

- **BR-TUI-07:** resourceは作成前に`planned`登録し、成功後だけ`created`へ遷移する。cleanupは`planned`と`created`の双方を安全に扱う。
- **BR-TUI-08:** cleanup順はtmux kill → descendant reap → auth/config binding除去 → scratch home/project除去とし、各操作を冪等にする。
- **BR-TUI-09:** cleanup barrierに未closed resourceが1つでもあればPASS receiptを禁止する。
- **BR-TUI-10:** cleanupを二重実行しても既closed resourceをfailureへ戻さず、外部の共有resourceを削除しない。

## Retry rules

- **BR-TUI-11:** retryable codeは`tmux-start-collision`、`kiro-startup-capacity`、`provider-throttled-before-anchor`のclosed setだけである。
- **BR-TUI-12:** retryは最大1回で、anchor確立前かつ前attemptの全resourceがclosedの場合だけ許可する。
- **BR-TUI-13:** timeout、anchor mismatch、auth/config error、policy violation、secret exposure、anchor確立後failureはretryしない。
- **BR-TUI-14:** retry attemptは新しいattempt identity、socket、session、scratchを使い、中間PASS receiptを作らない。
- **BR-TUI-15:** final ledgerへ残すattempt履歴はphase、canonical code、bounded digest、cleanup statusだけに限定する。

## Error precedence rules

- **BR-TUI-16:** 最初に発生したlifecycle failureを`primaryError`、cleanup中の追加failureを`secondaryError`として時系列を保存する。
- **BR-TUI-17:** execution成功後のcleanup failureはcleanup errorをprimaryとし、canonical codeを`cleanup-failed`にする。
- **BR-TUI-18:** executionとcleanupが両方失敗した場合はexecution errorをprimary、cleanup errorをsecondaryとし、`safetyOverride=cleanup-failed`を必須にする。
- **BR-TUI-19:** `safetyOverride=cleanup-failed`があるoutcomeは、primary codeにかかわらずPASS、green SHA更新、supported evidenceとしての採用を禁止する。
- **BR-TUI-20:** unknown canonical code、unknown phase、欠落provenanceをparse時に拒否し、自由文codeへfallbackしない。

## Direct/follow-up completion rules

- **BR-TUI-21:** direct completionにはTUI自身のadapter contract、integration tests、opt-in local live green receiptが全て必要である。
- **BR-TUI-22:** safe binding、deterministic anchor、resource closureの構造的blockerが一つでも解消不能なら、共通contractを緩和せずfollow-up branchへ進む。
- **BR-TUI-23:** follow-up Issueはblocker、sanitized evidence、推奨seam、再開条件、検証可能AC、Issue #1717へのlinkを必須とする。
- **BR-TUI-24:** registry/matrixが`follow-up-linked`とIssue URLを保持するまでfollow-up branchを完了扱いにしない。
- **BR-TUI-25:** ACPのgreen、Kimiのgreen、過去のKiro IDE動作をTUI完了証拠へ代用しない。

## Invariants and rejection examples

| Invariant | Reject example |
|---|---|
| deny before side effect | opt-inなしでscratch directoryを作る |
| cleanup before PASS | tmux kill未確認でgreen receiptを書く |
| one final receipt | retryの各attemptがPASS行を書く |
| evidence bounded | pane全文をIssueへ貼る |
| transport proof independent | ACP receiptでTUI matrixをsupportedにする |
| follow-up qualified | 「要調査」だけでIssueを作らずUnitを閉じる |
