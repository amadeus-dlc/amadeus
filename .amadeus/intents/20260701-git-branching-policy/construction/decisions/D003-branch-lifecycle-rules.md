# D003: branch lifecycle の運用ルール

## 状態

active

## 文脈

R002 は、Issue 起点の branch 作成、`origin/main` 追従、PR 作成前検証、merge 後処理の判断基準を求めている。

## 判断

Agent の作業 branch は `codex/` prefix を既定にする。

作業 branch は最新の `origin/main` を基点に作る。

1つの Issue でも phase または目的が異なる PR は、branch を分ける。

PR 作成前には対象 Intent の validator と `npm run test:all` を実行し、結果を記録する。

merge は人間へ委譲し、merge 後は最新の `origin/main` から次の branch を切る。

## 影響

古い branch を次作業へ流用しない。

複数 worktree がある場合でも、branch の所有と対象 Issue を混同しない。

## 根拠

- [R002](../../inception/requirements/R002-branch-lifecycle.md)
- [B002](../../inception/bolts/B002-branch-lifecycle-rules.md)
- [AGENTS.md](../../../../AGENTS.md)
