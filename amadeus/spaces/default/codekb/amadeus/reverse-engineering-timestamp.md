# リバースエンジニアリング鮮度ポインタ

> #707 以降、このファイルは **共有の鮮度ポインタ**(この repo の codekb 本文が最後にどのスキャンで書かれたか)であって、差分ベース点の真実源ではない。
> 各 intent の差分ベース点は `codekb/amadeus/re-scans/<intent-record>.md`(per-intent 記録)を読む。このファイルからベース点を導出してはならない(last-writer-wins で上書きされ、他 intent の base を壊すため)。

## 最新スキャン(この本文を書いた実行)

- Date: 2026-07-09
- Intent: `260709-pbt-small-band`(per-intent 記録: `re-scans/260709-pbt-small-band.md`)
- Scope: PBT × Small band 育成(#697 / #684 Phase B)
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-2`
- Stage: `reverse-engineering`(2.1)
- Observed commit: `9a2f5c7205795a255f258628710820def2ab3f8c`(`git rev-parse HEAD` 実測)
- 手法: prior codekb 本文(observed `162553b99`)をベースに焦点領域を実コード直読。`162553b99..HEAD` の差分は焦点領域(`packages/setup/**`・setup テスト・`test-size.ts`・`amadeus-audit.ts`)に触れず、prior 本文は有効。本文への差分反映は最小(`code-structure.md` / `component-inventory.md` に packages/setup ドメイン seam と #700 size 分類器の要点を追記)。

## 直前スキャン(参考・履歴)

- Date: 2026-07-09 / Intent: `260709-bug-zero-batch` / Observed: `a1c79dc12df38a8363524116eff9d877677a7224`
  - 対象バグ #674/#675/#676/#677/#678/#668。本文の #674〜#668 記述はこのスキャン由来で、本 intent の焦点(PBT ドメイン seam)とは別軸のため温存している。
