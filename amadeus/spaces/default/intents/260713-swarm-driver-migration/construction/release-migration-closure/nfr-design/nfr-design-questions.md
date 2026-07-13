# Release & Migration Closure NFR Design Questions

## 判定

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`は、same-tree provenance、all-match closure、platform/live matrix、coverage、migration Issue、immutable reportを確定している。追加の製品判断は不要である。

## 確定済み回答

### Q1. release candidateの入力範囲は何か

[Answer]: fixed versioned manifestが列挙するauthored/generated inputだけをcanonical hashする。receipt、report、provider summary、machine-local runtimeを除外し、self-rehash loopとlocal secret取込を防ぐ。

### Q2. release closureは何domainで判定するか

[Answer]: registry、projection、docs、platform、native live、migration Issueの6 domainをall-matchし、さらにFR-01〜FR-26 coverageをcross-domain invariantとして全件要求する。red/missing/stale/extra/unknownを一件でも含めばblockedである。

### Q3. registry完全性はsource scanだけで判定するか

[Answer]: 判定しない。production composition rootをbuildし、Claude/Codex/Kiroの3 provider、4 driver、cardinality 2/1/1をpublic `forDriver`で各exactly 1回解決し、fake/no-op/unavailable/dynamic/unknownを拒否する。

### Q4. generated treeのwrite成功だけでgreenにするか

[Answer]: しない。authored sourceからgenerationを1回実行した直後、同一treeでpackage/self-install/setup/docsのread-only drift checkを1回以上通したreceiptだけを受理する。generated targetの直接編集はgreenにしない。

### Q5. platform/live matrixは何か

[Answer]: deterministic suiteはmacOSとGitHub Actions Linuxの両方、credentialed native liveはmacOSの4 driverすべてを必須にする。Linux fake/skipをliveへ昇格せず、Windowsは対象外で成功表明しない。

### Q6. provider evidenceをU-06で再解析するか

[Answer]: 再解析しない。U-03〜U-05が生成したcandidate-bound sealed allowlist summary/indexだけを検証し、raw stream/session/state、prompt、credential、生pathをinput portへ持たない。

### Q7. migration Issueをどうensureするか

[Answer]: fixed repository/markerをsingle publisherで検索し、open 0件時だけ最大1件作成して再検索する。open 1件ならmutation 0、open複数/closed-only/create競合ならreopen/delete/additional createを行わずblockedにする。

### Q8. closed reportを更新するか

[Answer]: 更新しない。同一candidateのcanonical receipts/findingsをimmutable sealする。release manifest内treeが変わればnew candidateとして全receiptを再評価し、旧closed reportを部分更新・再利用しない。

## 曖昧性分析

- Issueはclosure domainだが、0.2.0でのlegacy削除そのものは本Intentの実装scope外である。
- receipt/report/provider summaryだけの更新はinput tree digestを変えないが、authored/generated input変更は必ずnew candidateになる。
- all-match checkerは全findingを集約し、first errorで他domainを隠さない。
- native live不足をfake、skip、floor、legacy、自己申告で補完しない。
