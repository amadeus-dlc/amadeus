# Pi Conformance Evidence — Functional Design Questions

## 回答方針

Issue #2130 と承認済みの `requirements`、`unit-of-work`、`unit-of-work-story-map`、`components`、`component-methods`、`services` にある決定は再質問しない。以下は正式適合証拠を実装可能な契約にするための確認であり、上流成果物から一意に確定する。

## Questions and Answers

### Q1. 自動 live journey の transport は何を使うか

[Answer]: `pi --mode rpc --no-session` を使う。driver は Pi 0.83.0 以上の公開 newline-delimited RPC だけを使い、private SDK moduleへ依存しない。RPC 入力は常に non-human として扱い、HUMAN_TURN=0 / GATE_APPROVED=0 を検証する。

### Q2. 実際の human gate はどう検証するか

[Answer]: macOS と Linux の各 Pi TUI で人間が interactive input を行う dogfood run を別に実施する。自動 driver は回答を注入しない。TUI run の canonical HUMAN_TURN、GATE_APPROVED、continuation、session/audit chainと、人間がTUIから確定したチェックリスト receiptを結び付ける。

### Q3. 日常 CI の skip と正式 green をどう分離するか

[Answer]: 結果型を分ける。`SkippedLiveRun` は CI 集約では許容できるが、`VerifiedLiveRun` や `VerifiedTuiDogfoodRun` へ変換できない。正式 green は deterministic suite、macOS/Linux の TUI dogfood、対応環境で最低1件の skip なし live RPC green、全 M1〜M10 / FR / NFR coverageが揃った場合だけ生成する。

### Q4. 各 Unit のテスト結果を自己申告で信頼するか

[Answer]: 信頼しない。各 Unit は正準 test inventory と実行可能 selector を公開し、conformance runner が同じ検証 commit の source から実テストを起動して structured receipt を取得する。inventory の `passed: true` のような未消費 status は置かない。

### Q5. 正式 evidence pack の改変をどう検出するか

[Answer]: source commit、clean-worktree receipt、Pi/OS/Bun/provider identifier、candidate/catalog/test-source digest、実 command receipt、canonical audit subchain digest、assertion resultをcontent-addressed run bundleへ保存する。ただし digest だけでは偽のbundleを最初から作れるため、formal runは信頼済みverifierが事前発行したsingle-use challengeへ全identityを束縛し、trusted recorderのrun signatureに加えてCI artifact attestationまたは許可済みoperator signatureを要求する。assembler と verifier を分離し、verifier はraw receipt、challenge、署名/attestationから全digest、起源、challenge消費、coverageを再計算する。evidence pack自身のstatusや文書記述を合否の根拠にしない。

### Q6. 署名鍵や attestation infrastructure をAmadeusが配布するか

[Answer]: 配布しない。repositoryにはpublic trust policy（許可されたSSH公開鍵fingerprintまたはCI OIDC issuer/workflow identity）だけを置く。private signing key、provider credential、CI tokenはoperatorまたはCI platformが保持する。信頼済みattestationを用意できないlocal runはdevelopment evidenceにはできるがformal-eligibleではない。

## 曖昧性分析

- material ambiguity はない。
- FR-VAL-001 の macOS/Linux TUI dogfood と FR-VAL-002 の「対応環境で最低1件の live green」を別要件として同時に満たす。
- provider credential は利用者環境から注入するが、receipt / audit / evidenceへ保存しない。
