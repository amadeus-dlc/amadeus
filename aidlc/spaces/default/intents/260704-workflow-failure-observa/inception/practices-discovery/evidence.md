# Practices Discovery Evidence

## Sources Scanned

- `aidlc-state.md`
- `aidlc/spaces/default/memory/org.md`
- `aidlc/spaces/default/memory/team.md`
- `aidlc/spaces/default/memory/project.md`
- `package.json`
- `.github/workflows/ci.yaml`
- `tsconfig.json`
- `.agents/rules/**/*.md`
- `.claude/rules`
- git history at `0dca321b`

## Findings

### aidlc-pipeline-deploy-agent

`Project Type: Greenfield` のため、Brownfield reverse-engineering artifacts は scan していない。
既存 memory は、GitHub Issue と Intent の接続、最新 `origin/main` 起点の branch 作成、PR 前 validator、`npm run test:all`、人間による merge を標準としている。
`.github/workflows/ci.yaml` は `pull_request` と `main` push で `npm run test:all` を実行する。

### aidlc-quality-agent

`package.json` の `test:all` は `test:ci:mock` を入口にし、typecheck、lint check、contract check、parity check、Claude wiring check、integration/eval、engine e2e、diff check を束ねている。
`tsconfig.json` は `strict: true` と `noEmit: true` を使う。
project memory は、validator や開発用スクリプト変更では先に失敗する eval または検証を追加すると定めている。

### aidlc-developer-agent

対象は `.agents/aidlc/tools` の TypeScript 実装である。
今回の practices は、stdout JSON 契約、OpenTelemetry no-op default 非送信、source skill と昇格先 skill の境界、`skills/` 配布境界、parity lock を守る前提である。
後方互換は、明示的な互換性維持対象がない限り残さない。

### aidlc-devsecops-agent

PR 監視では CI failure を review comment より先に解消する。
`.coderabbit.yml` と `.coderabbit.yaml` は、人間の明示的な許可なしに変更しない。
OpenTelemetry collector、dashboard、外部送信は今回の core 計装の deploy gate ではなく、後続 scope とする。

## Asked

- Way of Working は、GitHub Issue と Intent artifacts の接続、phase gate の validator と検証結果記録、validator の構造検証境界として確定した。
- Walking Skeleton は、#431、#432、OpenTelemetry no-op default 計装を束ねた最小縦断 slice として確定した。
- Testing Posture は、先に失敗する eval または deterministic test を追加し、PR 前に `npm run test:all`、validator、parity、stdout JSON 契約、OpenTelemetry no-op default 非送信を確認する方針で確定した。
- Deployment は、GitHub Actions の `pull_request` と `main` push を gate にし、collector と dashboard を後続 scope とする方針で確定した。
- Code Style は、TypeScript strict typecheck、stdout JSON 契約、`skills/` 配布境界、`.coderabbit.yml` 非変更、source skill と昇格先 skill の境界、parity lock を守る方針で確定した。

## Promotion Fix

Request Changes により、promotion target の説明と実装を `aidlc/spaces/<space>/memory/team.md` と `aidlc/spaces/<space>/memory/project.md` に揃えた。
`practices-promote` は、既存 memory に `## Way of Working`、`## Mandated`、`## Forbidden` などの英語見出しが存在しない場合、対象節を作ってから昇格する。
これにより、既存 self-dev Space の日本語見出しだけを持つ `team.md` と `project.md` でも、承認後の promotion が `PRACTICES_AFFIRMED` まで進める。

## Revision Verification

- `npm run test:it:aidlc-state`: pass。
- `npm run typecheck`: pass。
- `git diff --check`: pass。
- `bun .agents/skills/amadeus-validator/validator/AmadeusValidator.ts /Users/j5ik2o/.codex/worktrees/7871/amadeus 260704-workflow-failure-observa`: pass。
- `npm run test:all`: parity check で fail。

`npm run test:all` の fail は、`aidlc-common/stages/inception/practices-discovery.md`、`knowledge/aidlc-shared/audit-format.md`、`tools/aidlc-lib.ts`、`tools/aidlc-state.ts`、`tools/data/stage-graph.json` が parity baseline と異なるためである。
`engineFileExceptions` は人間承認なしに増やさない制約があるため、今回の revision では追加していない。
