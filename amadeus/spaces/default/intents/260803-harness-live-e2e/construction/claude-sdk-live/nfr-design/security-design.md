# Security Design — claude-sdk-live

## 上流契約

本設計は`business-logic-model.md:7-21`を入力とし、SDK/session/streamをadapter-owned child workerへ隔離する。

## Controls

- GHA hard denyとstrict `AMADEUS_CLAUDE_SDK_LIVE`をprobe前に評価する（`business-logic-model.md:7-8`）。
- project-only settingsとallow-listed non-secret envだけをworker起動時に渡し、user/local settingsとsource pathを除外する（同:10,19）。credentialはC4が作るone-shot anonymous pipeだけで受け渡す。worker identity handshake後、parentは`{runNonce,generation,childKey,secret}`をlength-prefixed frameとして1回だけwriteし即close/zeroizeする。read FDは対象workerだけがinheritし、他FDは`CLOEXEC`、filesystem/argv/logへ出さない。workerはrun/generation一致を検証してprocess-local envへ射影し、frameをzeroize/closeする。abort/TERM/KILL/crashではgroup reap後にparent leaseをdestroyし、遅延/再読/別generationを拒否する。
- parent owns 90秒deadline、abort generation、TERM 10秒、KILL 5秒、reap 5秒。workerはrun-owned supervisor group内で、遅延IPC/eventをgeneration mismatchで破棄する（同:12,21）。
- IPC/event collectorはJSON parse前のraw byteで計測し、single event 65,536 bytes、全event 1,048,576 bytes、4,096 events、in-memory queue 16 eventsかつ262,144 bytesを上限とする。SHA-256は定数memoryでincremental更新する。最初の超過でaccept queueを閉じ、`FAIL:EXECUTION_FAILED/output-limit-exceeded`を固定し、abort→TERM→KILL→reapを開始する。その後のpipe bytesはdigest/count後に即破棄してreapまでdrainする。receiptはbyte/event count、digest、truncated boolean、limit kindだけを持つ。
- duplicate/late/foreign terminal、partial-only、output flood、credential/path leakはnon-green。cleanup/process/credential残存0を必須にする。

## Verification

U02 kitでabort無視、worker/supervisor crash、late event、duplicate terminal、permission denial、credential pipe replay/generation mismatch、各limitの直前/exact/1超過、queue saturationをmutant redにする。stable assertionsは`SDK_CREDENTIAL_PIPE_SINGLE_USE`と`SDK_OUTPUT_BOUNDED_DRAIN`。HTTP/AWS/databaseは非適用。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:56:31Z
- **Iteration:** 1
- **Scope decision:** none

worker隔離の方向性と有界終端は整合しているが、credential leaseのcross-process受渡しとbounded collectorの限界値・overflow契約が未定義で、安全な実装を一意に導けない。

### Findings

- BLOCKER | opaque credential leaseをchild workerへ渡す具体的な安全契約がない | security-design.mdはopaque credential leaseだけをworkerへ渡しsource pathを除外すると定めるが、business-logic-model.mdとlogical-components.mdにはchild processがleaseを利用するIPC・file descriptor・一時credential・broker APIのどれを使うか、権限、失効、cleanup、worker crash時の回収がない。process-local handleはそのままchildから利用できず、実装者がcredential bytesやsource pathをenv/optionsへ渡せば設計自身の隔離要件に違反する。 | cross-process credential channelを一つに固定し、workerへ公開する最小interface、権限、run/generation binding、失効時点、TERM/KILL/crash時の回収、argv/env/logへの非露出をclosed contractとnegative testで定義する。
- BLOCKER | bounded output collectorの上限とoverflow動作が未定義である | security-design.mdはoutput floodをnon-greenにしてmutant redを要求するが、最大raw bytes、最大event数、単一event上限、backpressure、超過時のstream停止・child終了・result code、digest計算時の保持量を定めていない。SDK workerが無制限eventを送れば判定前にparent memoryまたはIPC queueを枯渇させられ、実装・試験結果も実装者ごとに分岐する。 | byte/eventの具体的な上限と計測位置を定め、超過時はcollectorを閉じてworkerを有界終了し、execution failureとしてcleanupへ進む契約を追加する。digestは定数メモリで更新し、超過境界前後のdeterministic testsを定義する。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:58:07Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の2 BLOCKERは解消された。credentialはrun/generation-bound one-shot pipe、単一worker継承、close・zeroize・lease破棄まで閉じられ、collectorもbyte/event/queue上限、定数memory digest、超過時の有界停止とdiscard-drain、境界テストが具体化された。論理コンポーネントの所有権と機能設計にも整合している。

### Findings

- None
