# Pi Distribution / Installation — NFR Design Questions

## 回答方針

この Unit のengine-resolved `consumes` は空であり、条件付きの `security-requirements` / `tech-stack-decisions` も期待どおり非適用である。これらを再作成せず、承認済みscopeに含まれるsetup payload、Pi Package local/git view、generated parity、registry、native trustのsecurity designだけを行う。

## Questions and Answers

### Q1. setup payloadとPi Package viewのどちらをsecurity正本にするか

[Answer]: どちらもしない。authored Pi harness manifestとverifier-bound expected catalogを正本にし、両routeを同一candidateから別viewとして決定生成する。observed `dist/pi`、root package metadata、target install manifestから期待resource集合を逆算しない。

### Q2. `dist/pi/package.json`を生成して対象projectへコピーするか

[Answer]: しない。`dist/pi`はproject-root payload専用で、対象projectのroot `package.json`を上書きしない。Pi Package metadataはsource repository rootの既存private package metadataへclosed projectionし、setup payloadと同じgenerated resourceを参照する。

### Q3. Pi Packageのlocal/git installを安全なsandboxと説明してよいか

[Answer]: だめ。extensionはhost user権限でcodeを実行し、package dependency/install lifecycleもcode executionを伴い得る。Pi native project trustはload前のhuman boundaryだがsandboxではない。source review、immutable git pin、差分確認、update/uninstall、dependency/lifecycle profileを導入前に提示する。

### Q4. Git credentialやprovider tokenをpackage/install evidenceへ含めるか

[Answer]: 含めない。source identityはrepository URLのcredential-free canonical formとimmutable commit digestだけを持つ。credentialはPi/Git/package managerの通常環境へ委譲し、argv、manifest、catalog、doctor、audit、fixtureへcopy/hash/persistしない。

## 曖昧性分析

- material ambiguityはない。
- setup transaction algorithmは `setup-transaction-safety`、runtime load/presenceはPi extension側の所有であり、本Unitに複製しない。
- npm publish、remote registry、artifact signing serviceはscope外である。
- performance/scalability/reliability/logical-components artifactはエンジンがpruneしており、本Unitでは生成しない。
