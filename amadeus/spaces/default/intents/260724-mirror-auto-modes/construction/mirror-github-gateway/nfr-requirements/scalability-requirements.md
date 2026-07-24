# Scalability Requirements — mirror-github-gateway

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Capacity Model

Gatewayは単一repositoryのGitHub Issues API adapterであり、horizontal scalingやshared queueを導入しない。増加軸はIssue page数、body size、同時boundary呼出しである。

| Dimension | Target | Strategy |
|---|---|---|
| Issue count | 10,000件fixtureを完全検索 | `per_page=100`、全pagination、O(N) local filter |
| body size | benchmarkは各4 KiB、production受入上限は1 bodyのUTF-8 bytes ≤ 256 KiB | parse前にbyte上限を検査 |
| marker matches | 0／1／複数を保持 | Gatewayでcandidateを丸めない |
| sequential calls | 100 read-only callを合計60秒以内、cross-talk 0件で完了 | 同期runner、process-local immutable request、global repository stateなし |
| mutations | 同一operationを逐次1件 | C6 permit／receiptで直列化、Gateway内batchなし |

## Scaling Rules

- repository数が増えても1 callは指定repositoryだけを参照する。
- pagination数を固定上限で打ち切って候補0件にしない。GitHub／deadlineで完走不能ならfailureにする。
- remote rate limitをlocal parallelismで悪化させず、`rate-limit` typed failureを上位へ返す。
- cache、database、queue、daemonを追加せず、retry時はremote viewを再取得する。
- PR entryをIssue候補数へ含めない。
- 同期runnerを並行schedulerへ包まず、各callを完了してから次を実行する。
- find stdoutはHTTP envelope込み64 MiB、create／view／edit／closeは各1 MiBをhard limitとする。超過時は`invalid-response + no-effect-confirmed`（read-only）または`invalid-response + outcome-unknown`（mutation）を返す。

## Degradation

body／stdout capacity超過、rate limit、timeout時はworkflowを継続しつつMirrorをpending／warningへ移す。partial candidate set、古いcache、repository fallbackを返さない。

## Acceptance

1. 1／2／100 pageで同じmarker semanticsを維持する。
2. page途中failureがempty／partial successにならない。
3. 100逐次read fixtureが60秒以内に完了し、argv、stdout、repository identityが混線しない。
4. mutation throughput目的のparallel create／edit／closeを生成しない。
5. 64 MiB＋1 byteまたは256 KiB＋1 byteのfixtureがtyped capacity failureとなり、partial parseを返さない。
