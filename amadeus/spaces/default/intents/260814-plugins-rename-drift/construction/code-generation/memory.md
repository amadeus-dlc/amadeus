> This file is maintained by the orchestrator during stage execution.

## Interpretations

- 2026-08-14T12:32:31Z — ユーザー是正(本セッション): builder の完了条件にローカルフルスイートを課したのは誤り。重い blocking 検証はリモート CI(PR の必須チェック)へ委ね、ローカルは typecheck/lint/targeted テスト + coverage-patch-quick advisory までとする。実装完了した Bolt は先に push + PR 作成して CI を並行させる(remote-first)。同種の失敗の再発としてユーザーから明示指摘 — §13 で恒久ノルム化する(ユーザー直接裁定)。

- 2026-08-14T12:43:59Z — ユーザー是正(強化・2 回目): 順序の原則は「先にリモートへ push して CI を開始し、ローカル検証はその後・並行で行う」。ローカルで全部通してから push する順序自体が誤り。実装がコミットされた時点で branch push + PR 作成を最優先し、blocking 検証はリモート CI を正とする。

## Deviations

## Tradeoffs

## Open questions
