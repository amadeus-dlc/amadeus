# Security Test Instructions — intent-autonomy

## 入力とtrust boundary

5 Unitの `code-generation-plan.md`、`code-summary.md`、`nfr-design/security-design.md` を入力とする。短命CLIでnetwork endpointを持たないためDASTを捏造せず、schema、provenance、authorization、redaction、tamper resistance、supply-chain driftを検証する。

## Commands

```sh
bun test --timeout 120000 \
  tests/unit/t426-loop-monitor.test.ts \
  tests/unit/t427-loop-monitor-runtime.test.ts \
  tests/unit/t428-quality-repair.test.ts \
  tests/unit/t431-intent-autonomy.test.ts \
  tests/unit/t433-autonomy-review-observability.test.ts \
  tests/unit/t434-intent-completion.test.ts
bun run lint
bun run source-only:check
bun run distribution:check
```

## Security oracle

- unknown schema、dangling descriptor、cross-scope identity、revision / digest mismatchをfail-closedにする。
- canonical permit / reservation commit前のJudge、repair、grant effect、review、live dispatchを拒否する。
- standing grant、headless fact、synthetic turnをreal-human provenanceへ変換しない。
- raw prompt、credential、attestation本文、secret、個人情報をaudit / status / telemetryへ保存しない。
- forged / duplicate / skipped / mismatched receiptをcompletion evidenceへ採用しない。
- completed sealをreview extensionが変更せず、partial terminal transactionを公開しない。

## Test dataと外部検証

fixtureはopaque fake credential IDとdigestを使い、secret-like raw valueを出力しない。実credential-attested live seamは5 harness分がすべてそろう場合だけ実行し、不足時は `AWAITING_HUMAN` と明示する。依存lock、coverage registry、package projectionのdrift guardをsupply-chain整合性の検証に含める。
