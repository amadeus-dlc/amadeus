# Codex Native Driver NFR Design Questions

## 判定

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`は、Codex Ultraのruntime model解決、single-parent native delegation、hook/collaboration証拠、model-tool isolation、release proofを確定している。追加の製品判断は不要である。

## 確定済み回答

### Q1. Ultra対応modelを固定slugで指定するか

[Answer]: 固定しない。同一app-server connectionのeffective config/catalog/hook projectionをseedへ束縛し、model未pin handshakeのSessionStartからexact model IDを解決する。catalog rowのliteral `ultra`確認後、本runだけexact IDへpinしactual SessionStartで再確認する。

### Q2. Codex Ultraの実使用を何で証明するか

[Answer]: Ultra effortとcatalog/model handshake、batch parent 1件、Unit-role-child全単射、terminal collaboration item、SessionStart/SubagentStart/SubagentStop hook、process/capture terminalを同一ProbeBinding/threadへAND結合する。xhigh/max/説明文/flag/自己申告だけでは成立しない。

### Q3. Unitごとに`codex exec`を起動するか

[Answer]: 起動しない。batchごとに`codex exec --json` parentはexactly 1件で、Unit数と同数のdynamic role/native childをそのparent内で作る。Unit別processは既存floorとして別mode/auditに残す。

### Q4. model toolへprovider credentialを渡すか

[Answer]: 渡さない。provider parent/hookだけが既存authと固定5 correlation keyを持ち、model tool/subagent shellは`inherit="none"`からsafe PATH、scratch HOME、localeだけを構築する。evidence rootもsandbox writable root外に置く。

### Q5. hookは動的生成するか

[Answer]: 動的生成しない。trusted project layerのstatic SessionStart/SubagentStart/SubagentStop定義をversioned `hooks/list` profileでhash/trust/enabled確認し、5 correlation keyが完全一致したattempt recordだけを受け入れる。

### Q6. role configをUnitごとに生成するか

[Answer]: 生成しない。全dynamic roleはframework同梱のgeneric worker config 1件を共有し、Unit固有slug/path/tokenはargv metadataとstdin manifestにだけ置く。roleはparentのresolved model/Ultra effortを継承する。

### Q7. schemaがprofile化できない場合はどうするか

[Answer]: U-04をparkする。official collaboration item、hook trust、env isolationをcredentialed discoveryで確定できなければ、floor、SubagentStopだけ、複数parentで同名native successを偽装しない。

### Q8. infrastructureを追加するか

[Answer]: 追加しない。installed Codex CLIの短命app-server/exec、static hook、attempt-local evidenceを使い、SDK、Responses API、daemon、database、queue、cloud resourceを追加しない。

## 曖昧性分析

- current resolved model名はlive evidenceの値であり、source/test定数ではない。
- collaboration itemはprocess JSONL内の必須projectionで、hookとは独立sourceだが第三のI/O channelではない。
- C-08はnative lifecycle、C-11はworktree成果/protected spec/収束/mergeを判定し、どちらか片方では成功しない。
- macOS credentialed live proofとLinux fake suiteは別gateであり、auth不足やskipをpassにしない。
