# Practices Discovery Questions

## Context

この質問は、`aidlc-state.md` の `Project Type: Greenfield` を前提にする。
Brownfield の reverse-engineering artifacts は、この scope では skip されている。

既存 evidence は、`aidlc/spaces/default/memory/org.md`、`team.md`、`project.md`、`package.json`、`.github/workflows/ci.yaml`、`tsconfig.json`、`.agents/rules/**/*.md`、直近 git history である。
`.claude/rules` は現時点で空である。

## Questions

### Q1. Way of Working はどう定義しますか。

A. Issue と Intent の接続は不要にする。
B. 実装だけを先に進め、Intent artifacts は後で埋める。
C. phase と PR の単位は毎回その場で決める。
D. validator pass だけで内容承認とみなす。
E. GitHub Issue と Intent artifacts を接続し、phase gate ごとに validator と検証結果を記録する。validator pass は構造検証であり、内容承認や merge 承認ではない。
X. Other (please specify)

[Answer]: E

### Q2. Walking Skeleton はどう扱いますか。

A. 常に省略する。
B. Construction の最後にまとめて確認する。
C. OpenTelemetry collector と dashboard まで入れてから skeleton とする。
D. Unit 分割後に user が都度判断するまで stance を空欄にする。
E. 最初の Bolt は、#431 engine error audit、#432 hook drop doctor、OpenTelemetry no-op default 計装を束ねた最小縦断 slice にする。以降の Bolt は gated で進める。
X. Other (please specify)

[Answer]: E

### Q3. Testing Posture はどう定義しますか。

A. 実装後に手動確認だけ行う。
B. `npm run test:all` は PR 後に任意で実行する。
C. unit test だけに限定し、validator と parity は実行しない。
D. OpenTelemetry 計装は test 対象外にする。
E. 先に失敗する eval または deterministic test を追加し、`npm run test:all`、validator、parity、stdout JSON 契約、OpenTelemetry no-op default 非送信を PR 前に確認する。
X. Other (please specify)

[Answer]: E

### Q4. Deployment と CI gate はどう扱いますか。

A. CI は使わない。
B. CI は warn only とし、失敗しても PR を進める。
C. push だけで CI を動かし、pull_request は対象外にする。
D. collector と dashboard の deploy を今回の必須 gate にする。
E. GitHub Actions の `pull_request` と `main` push で `npm run test:all` を実行し、CI failure は review comment より先に解消する。collector と dashboard の deploy は後続 scope とする。
X. Other (please specify)

[Answer]: E

### Q5. Code Style と境界はどう定義しますか。

A. `skills/` を直接編集してよい。
B. `.coderabbit.yml` を必要に応じて変更してよい。
C. stdout JSON 契約よりも debug log を優先する。
D. 後方互換は常に残す。
E. TypeScript は strict typecheck を通し、stdout JSON 契約を壊さず、`skills/` 配布境界、`.coderabbit.yml` 非変更、source skill と昇格先 skill の境界、parity lock を守る。後方互換は明示対象がない限り残さない。
X. Other (please specify)

[Answer]: E
