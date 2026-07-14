# Release & Migration Closure NFR Design Questions

## 判定

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`は、same-tree provenance、all-match closure、driver別transport/capture/resource receipt、platform/live matrix、coverage、完全なmigration Issue検索、immutable reportを確定している。追加の製品判断は不要である。

## 確定済み回答

### Q1. release candidateの入力範囲は何か

[Answer]: fixed versioned manifestが列挙するauthored/generated inputだけをpath順にcanonical化し、各fileを1回streaming hashする。総byte数`b`を処理量へ含め、receipt、report、provider summary、machine-local runtimeを除外してself-rehash loopとlocal secret取込を防ぐ。

### Q2. release closureは何domainで判定するか

[Answer]: registry、projection、docs、platform、native live、migration Issueの6 domainをall-matchし、さらにFR-01〜FR-26 coverageをcross-domain invariantとして全件要求する。red/missing/stale/extra/unknownを一件でも含めばblockedである。

### Q3. registry完全性はsource scanだけで判定するか

[Answer]: 判定しない。production composition rootをbuildし、Claude/Codex/Kiroの3 provider、4 driver、cardinality 2/1/1をpublic `forDriver`で各exactly 1回解決し、fake/no-op/unavailable/dynamic/unknownを拒否する。

### Q4. generated treeのwrite成功だけでgreenにするか

[Answer]: しない。authored sourceからgenerationを1回実行した直後、同一treeでpackage/self-install/setup/docsのread-only drift checkを1回以上通したreceiptだけを受理する。generated targetの直接編集はgreenにしない。

### Q5. platform/live matrixは何か

[Answer]: deterministic suiteはmacOSとGitHub Actions Linuxの両方、credentialed native liveはmacOSの4 driverすべてを必須にする。Linux fake/skipをliveへ昇格せず、Windowsは対象外で成功表明しない。

### Q6. provider evidenceをU-06で再解析するか

[Answer]: 再解析しない。U-03〜U-05が生成したcandidate-bound sealed allowlist summary/indexだけを検証し、Agent Teamsのinteractive PTY+fixed path+terminal retained evidence、Ultra Codeのexact headless stdio+event-bound capture、Codexのhook-only、Kiroのevent-bound captureをclosed variantとして扱う。Ultra Codeはversioned `invocationContractId`とcanonical argv digestで`claude -p --verbose --effort ultracode --output-format stream-json --include-hook-events`との一致もANDする。raw argv/prompt、PTY/JSONL/session/state、credential、生pathをinput portへ持たない。

### Q7. migration Issueをどうensureするか

[Answer]: fixed repository/markerをpagination終端まで検索し、authoritative total countが提供される場合は列挙件数と照合する。完全な結果集合がopen 0件のときだけsingle publisherが最大1件作成して同じ完全検索を再実行する。page/limit打切り、件数不一致、schema不明、open複数/closed-only/create競合ではreopen/delete/additional createを行わずblockedにする。

### Q8. closed reportを更新するか

[Answer]: 更新しない。同一candidateのcanonical receipts/findingsをimmutable sealする。release manifest内treeが変わればnew candidateとして全receiptを再評価し、旧closed reportを部分更新・再利用しない。

## 曖昧性分析

- Issueはclosure domainだが、0.2.0でのlegacy削除そのものは本Intentの実装scope外である。
- receipt/report/provider summaryだけの更新はinput tree digestを変えないが、authored/generated input変更は必ずnew candidateになる。
- all-match checkerは全findingを集約し、first errorで他domainを隠さない。
- native live不足をfake、skip、floor、legacy、自己申告で補完しない。
- Agent Teamsのready signalは終了制御だけで、process terminalとterminal後retained evidenceを欠くsuccessには使わない。
- Issue検索の1 API responseを全結果集合とみなさず、pagination完全性を独立に検証する。
