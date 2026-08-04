# Pi Doctor Diagnostics — NFR Design Questions

## 回答方針

engine-resolved inputは `business-logic-model` のみで、条件付きの `security-requirements` / `tech-stack-decisions` は期待どおり非適用である。IssueやFunctional Designを再質問せず、read-only probe、trusted catalog、process/environment、trust privacy、redactionのsecurity/component境界だけを確定する。

## Questions and Answers

### Q1. doctorはuntrusted projectでもproject-local extension/skillをloadして診断するか

[Answer]: しない。direct core/setup CLI経路でfilesystem metadataをread-only観測し、Pi native trustを迂回してresourceをload/executeしない。extension内doctorは既にPiが渡したrun-local trust factだけを使い、trustを承認・保存しない。

### Q2. target install/package manifestを期待resourceの正本にするか

[Answer]: しない。実行doctor moduleにdigest束縛されたtrusted expected catalogだけを正本にする。target manifest/resourceは独立したuntrusted observationであり、catalog取得不能・version/digest mismatchでは全resource checkをblocked failureにする。

### Q3. Pi/Bun/driver probeへ通常のprocess environmentをそのまま渡すか

[Answer]: 渡さない。PATH等の明示allowlistからexact executableを解決し、neutral cwd、offline、closed stdin、credential除外env、2秒deadline、bounded stdout/stderrで起動する。driver probeへprompt、provider/model、workspace absolute pathを渡さない。

### Q4. doctorは壊れたtrust/settings/journal/resourceを修復するか

[Answer]: 修復しない。typed check resultとsafe remediationだけを返す。trust file、settings、resource、package、health latch、workflow state、audit、sessionを変更せず、status/doctor自身の失敗をsuccessへ丸めない。

## 曖昧性分析

- material ambiguityはない。
- Pi native trustはload authorizationでありsandboxではない。
- doctor resultの正本はstable check IDを持つstructured reportで、human label/locale/colorではない。
- performance/scalability/reliability専用artifactはエンジンがpruneしており、本Unitでは生成しない。
