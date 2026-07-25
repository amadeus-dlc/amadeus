# NFR Requirements Questions — mirror-github-gateway

## 判定

`business-logic-model.md`と`business-rules.md`はexact argv、response schema、failure classification、effect certainty、redaction、permit境界まで確定している。`requirements.md`は非阻害failureと安全性、`technology-stack.md`は既存`gh` process adapterの再利用を要求する。追加の製品判断は不要である。

## 確定済み回答

### Q1. Gateway内部でnetwork retryするか

[Answer]: しない。各Gateway callは1 process／1 remote operationとし、typed failureをC6へ返す。retry／reconciliationは現在mode、receipt、effect certaintyを参照できるLifecycle ownerが判断する。

### Q2. timeout後のmutation結果をどう扱うか

[Answer]: request送信前なら`not-started`、送信後なら`outcome-unknown`とし、未適用を推測しない。createはmarker候補、edit／closeはremote viewによる収束確認なしに再mutationしない。

## 曖昧性分析

- 「GitHubが遅い」のような曖昧表現を、process deadlineとeffect certaintyへ分解した。
- read-only検索のpagination failureを候補0件へ丸めない。
- GitHub可用性をAI-DLC workflow可用性へ連動させない。
