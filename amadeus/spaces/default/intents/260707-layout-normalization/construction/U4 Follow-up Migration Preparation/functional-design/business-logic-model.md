# Business Logic Model — U4 Follow-Up Migration Preparation

## Upstream Trace

この設計は `unit-of-work`, `unit-of-work-story-map`, `requirements`, `components`, `component-methods`, `services` を入力とする。U4 は full workspace normalization を将来再検討する場合の first safe slice を記録する。

## Workflow

1. U1 design record の alternatives rejected と future migration note を読む。
2. full normalization を将来行う場合の blocker を抽出する。
3. source root abstraction、test fixture abstraction、manifest contract seam を candidate follow-up として整理する。
4. `packages/setup` intent と衝突しない boundary を明記する。
5. follow-up を issue/backlog/future work section のどれかに記録する。

## Candidate Follow-Ups

- Source root abstraction: `scripts/package.ts` の `CORE_ROOT` / `HARNESS_ROOT` を logical resolver 経由にする。
- Fixture abstraction: tests の root `dist/*` assumptions を helper に集約する。
- Manifest seam: `scripts/manifest-types.ts` に package-local path へ移行可能な contract note を追加する。

## Output Contract

Follow-up はこの intent の implementation scope を拡大しない。将来の full normalization が必要になった場合の入口を残すだけである。
