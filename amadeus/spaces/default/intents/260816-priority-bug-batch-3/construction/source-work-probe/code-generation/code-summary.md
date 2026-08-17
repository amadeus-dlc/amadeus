# Code Summary Draft — unit source-work-probe (Bolt 4 / FR-4 / #3156)

## 変更ファイル(git diff --stat HEAD~1 HEAD、bolt-pbb3-source-work-probe @ e49ee4a3309773ea5999b25ee4f3b51a9e2dfc82)

```
 amadeus/spaces/default/specs/tla/model-map.json |  4 +-
 packages/framework/core/tools/amadeus-state.ts  | 65 +++++++++++++++++++++++--
 tests/unit/t206-source-work-intent-span.test.ts | 36 ++++++++++++++
 3 files changed, 98 insertions(+), 7 deletions(-)
```

## 第4プローブの述語と帰属キーの根拠

`packages/framework/core/tools/amadeus-state.ts` に `resolveTrunkRef` と
`branchSourceWorkSinceTrunkFork` を追加し、`intentScopedSourceWork` の短絡連鎖へ
4番目のプローブとして接続。

- 既存3プローブ(recordBranchSourceWork / boltRefHasSourceWork / mergedPrSourceWork)
  はすべて `birth..HEAD` にスコープされており、#3156 の形状(コードコミット群が
  birth より前、bolt ブランチが HEAD の祖先で merge-base diff が空、squash 件名に
  issue 参照なし)では構造的に全て false になる。
- 新プローブは `[trunk fork point .. HEAD]`(`git merge-base HEAD <main|origin/main>`
  を境界に、`--first-parent --no-merges` で直コミットのみを走査)へレンジを拡張。
  - **sibling 誤帰属防止**: sibling のコードは常に MERGE コミット経由でしか
    このブランチへ到達しない(`mergeCodeBranch` ヘルパの構成)ため、
    `--no-merges` が構造的に除外する(probe (a) と同じ attribution 原則)。
  - **brownfield 非退行**: HEAD が trunk から分岐していない場合
    (`git merge-base HEAD main === HEAD`、例: 全コミットが main 上に直接ある)、
    レンジは空になり本プローブは no-op — 既存の「brownfield edge: src/ が
    birth より前」テストを壊さない。
  - **帰属の健全性チェック**: `birth` が `forkPoint..HEAD` の範囲内にある
    (`git merge-base --is-ancestor forkPoint birth`)ことを要求 — この intent
    自身の birth マーカーが同じ分岐履歴上に実在することを確認してから発火する。
  - `trunk` 解決は local `main` → `refs/remotes/origin/main` の順にフォールバックし、
    どちらも解決できない場合は安全側(プローブ無発火、既存挙動のまま)。

## Red → Green 実測

1. **Red(修正前)**: `git stash push -- packages/framework/core/tools/amadeus-state.ts`
   で実装差分のみ退避(テストは残す)→ `bun run build` → 
   `bun test tests/unit/t206-source-work-intent-span.test.ts`
   → 新設ポジティブテスト `recognises code committed before birth once this
   branch diverged from main (issue #3156)` が `Expected: true / Received: false`
   で失敗(#3156 と同一形状で false)。15 pass / **1 fail**。
2. **Green(修正後)**: `git stash pop` → `bun run build` →
   `bun test tests/unit/t206-source-work-intent-span.test.ts`
   → **16 pass / 0 fail**(既存14テスト+新設2テスト、byte-for-byte 非退行)。
3. `bun test tests/integration/t185-stage-artifact-guard.test.ts` → **20 pass / 0 fail**。

## 落ちる実証(1セット)

- 注入: `branchSourceWorkSinceTrunkFork` の戻り値式へ `return false && log !== null && ...`
  を挿入(常に false を返す欠陥)。
- 赤の実測: `bun run build` → `bun test tests/unit/...` → 新設ポジティブテストが
  再度 `Expected: true / Received: false` で失敗(15 pass / 1 fail)。
- revert: 注入行を Edit で削除し元の `return log !== null && log.split(...)` に復元。
  `grep -n "INJECTED DEFECT\|false && log" packages/framework/core/tools/amadeus-state.ts`
  → exit 1(該当なし、残渣ゼロを機械確認)。
- revert 後の再実行: `bun run build` → `bun test t206 + t185` → **36 pass / 0 fail**。

## 台帳 resync

- `bun plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts
  updateModelMap --impl-only` → `IMPL_ONLY_UPDATED`、
  `packages/framework/core/tools/amadeus-state.ts` の実装ハッシュを
  `0e262a286c10` → `d07d0da40fcf` へ更新。
- `tests/.coverage-patch-allowlist.json` に `intentScopedSourceWork` /
  `recordBranchSourceWork` / `mergedPrSourceWork` / `boltRefHasSourceWork` を
  参照するエントリは grep 0 件 — 意味的セレクタへの影響なし(re-anchor 不要)。
- 新規テスト**ファイル**は追加していない(既存 t206 への追記のみ)ため
  coverage-registry regen は非該当。`bun tests/gen-coverage-registry.ts --check`
  → `OK (fresh, guards green, ratchet held)` を実測済み。

## 検証(worktree 内)

- `bun run build` → 全ハーネス regenerated、exit 0。
- `bun run typecheck` → 出力なし、exit 0。
- `bun run lint` → 472 warnings / 21 infos(すべて他ファイルの既存複雑度警告、
  自分の変更ファイルに対する `biome check` は 20 warnings advisory のみ・**exit 0**、
  うち自分の新規コードの2件(`log !== null && ...` optional-chain 提案)は
  直前の既存コード(`mergedPrSourceWork` 内の同型パターン、未変更)と同一スタイル)。
- `bun tests/gen-coverage-registry.ts --check` → OK。
- coverage-patch-quick(advisory): (別途追記 — バックグラウンド実行中)

## コミット

- SHA: `e49ee4a3309773ea5999b25ee4f3b51a9e2dfc82`
- ブランチ: `bolt-pbb3-source-work-probe`(base origin/main 89053172e)
- メッセージ: `fix(#3156): accept post-birth record bundling by probing
  intent-attributed source work beyond the birth boundary`

## 逸脱

なし。既存3プローブは無変更(byte-for-byte)。互換シム・フォールバック分岐は
追加していない。スコープ外(AMADEUS_SKIP_ARTIFACT_GUARD バイパス変更、
docs-only 免除経路)には触れていない。
