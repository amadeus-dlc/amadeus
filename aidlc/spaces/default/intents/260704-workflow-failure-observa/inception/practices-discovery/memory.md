# Practices Discovery Memory

## Interpretations

- 2026-07-04T02:27:07Z — `aidlc-state.md` は `Project Type: Greenfield` を示しているため、brownfield reverse-engineering artifacts の scan は行わない。既存 memory、package scripts、CI、rules、git history を evidence として、Greenfield interview の推奨回答を作る。
- 2026-07-04T02:40:20Z — `practices-promote` の現行実装は、stage 文面の `.claude/rules/aidlc-team.md` と `.claude/rules/aidlc-project.md` ではなく、`aidlc/spaces/default/memory/team.md` と `project.md` を promotion target としている。
- 2026-07-04T03:10:32Z — Request Changes を受け、promotion target は `aidlc/spaces/<space>/memory/team.md` と `project.md` に統一する。

## Deviations

- 2026-07-04T02:27:07Z — stage の produce list には questions file がないが、stage-protocol は質問ファイルを source of truth とする。そのため `practices-discovery-questions.md` を追加成果物として作成する。
- 2026-07-04T02:27:07Z — `.claude/rules` は現時点で空であるため、既存の `aidlc/spaces/default/memory` と repo evidence を質問の初期案に使う。
- 2026-07-04T02:40:20Z — stage 文面と promotion 実装の target が一致しないため、`evidence.md` に Promotion Risk を明記し、承認後の promotion 前に user が判断できるようにする。
- 2026-07-04T03:10:32Z — 既存 memory が日本語見出しだけを持つ場合でも昇格できるように、promotion tool は必要な英語節を作ってから書き込む扱いへ変更する。

## Tradeoffs

- 2026-07-04T02:27:07Z — OpenTelemetry core 計装は practices に含めるが、collector と dashboard は Deployment practice では後続 scope として扱う。これにより deterministic test と CI gate を軽く保つ。
- 2026-07-04T02:27:07Z — `skills/` は配布物境界として扱い、Code Style practice に直接編集禁止を含める。実装時は source skill、昇格先 skill、host harness、Intent artifact の境界を維持する。
- 2026-07-04T03:10:32Z — parity baseline は更新しない。`engineFileExceptions` 追加は人間承認が必要なため、targeted eval と validator は通し、`npm run test:all` の parity failure は evidence に記録する。

## Open questions

- 2026-07-04T02:27:07Z — `.claude/rules/aidlc-team.md` と `.claude/rules/aidlc-project.md` を practices promotion で新規作成する扱いが現 tool 実装で成功するか確認する。
- 2026-07-04T02:40:20Z — `aidlc/spaces/default/memory/team.md` と `project.md` に promotion 実装が要求する英語見出しが存在しないため、Approve 後の `practices-promote` は失敗する可能性が高い。
- 2026-07-04T03:10:32Z — promotion target と見出し不整合は修正対象に含めた。再ゲート前に eval、typecheck、validator で確認する。
