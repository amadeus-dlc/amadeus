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
- coverage-patch-quick(advisory): `bun plugins/coverage-patch-quick/tools/coverage-patch-quick-cli.ts`
  → exit 0(advisory は常に0)。ただし内部で「selected tests did not all pass」を報告
  (35ファイルの mapped-tests バッチ実行で一部失敗)。追加行22行は covered:0/
  uncovered:22 と出たが、これはテスト失敗によりカバレッジ計測自体が不完全なため
  (advisory の既知の限界節「the selected tests did not all pass」参照)。
  失敗内訳を切り分けたところ、**いずれも自分の変更と無関係な pre-existing 障害**
  と確認(ablation: `git checkout HEAD~1 -- packages/framework/core/tools/
  amadeus-state.ts` で修正前バイナリへ差し戻し、同一バッチ/同一テストを再実行して
  同一失敗が再現することを確認、その後 `git checkout HEAD --` で復元・再ビルド):
  - `tests/e2e/t416-nfr-kind-pruning.test.ts` — 単体実行でも修正前ベースラインで
    同一失敗(§12a reviewer verdict 未記録ガード、`gitHasSourceWork`/
    `workspace_requires` とは別系統のガード)。
  - `tests/integration/t462-session-takeover.integration.test.ts` — 単体実行では
    15/15 pass するが、他の複数ファイルと同一 `bun test` 呼び出しで束ねると
    失敗/timeout。修正前ベースラインで同一バッチを再実行しても同一の失敗/timeout
    (exit 124)を再現 — バッチ内 test-isolation/負荷起因の pre-existing 事象。
  - t206(自分の対象テスト)は同バッチ内でも該当なく green。
  - 単体実行の t206(16/16)・t185(20/20)は現行 HEAD で再確認済み(下記)。

## PR 状況(自分は push/PR作成をしていない — conductor 側が record bundling を実施)

作業中に conductor(main)が自分のコミット `e49ee4a33` の上へ record-bundling
コミット `7fa3cbb1f`(`chore(record): bundle intent 260816-priority-bug-batch-3
record for bolt 4 delivery` — `amadeus/spaces/...` のみ、63ファイル、
`packages/`/`tests/` は無変更を `git diff --name-only e49ee4a33 7fa3cbb1f` で確認)
を積み、push・PR #3174(`amadeus-dlc/amadeus#3174`)を作成済み。
`gh pr view 3174` → state=OPEN, mergeable=MERGEABLE、CI(Typecheck/Lint and
complexity/Coverage registry 等)は SUCCESS で進行中。現行 HEAD
(`7fa3cbb1faf65978b8f897cf1e31b8452b18e97a`)で t206/t185 を再実行し
36 pass/0 fail を再確認済み。

## コミット

- SHA: `e49ee4a3309773ea5999b25ee4f3b51a9e2dfc82`
- ブランチ: `bolt-pbb3-source-work-probe`(base origin/main 89053172e)
- メッセージ: `fix(#3156): accept post-birth record bundling by probing
  intent-attributed source work beyond the birth boundary`

## §12a BLOCKER 是正(2026-08-17 追記)

レビューで BLOCKER 1件(帰属キー欠落 — cherry-pick 等の非マージ経路で sibling
コミットが誤 true になりうる)を受け、`branchSourceWorkSinceTrunkFork` を
per-commit ループへ再構成し、各候補コミットに **identity 帰属**(宣言 issue
参照 `intentIssueRefs` または bolt ref 到達可能性 `intentBoltSlugs` →
`boltRefsForSlug`)を要求するよう是正した。構造ガード(fork-point 境界・
`--no-merges`・birth 祖先性)は防御の重畳として維持。

- Red 実測(是正前 = 構造ガードのみの版): cherry-pick sibling コミット
  (宣言 issue と異なる `#999` を参照、非マージで直接コミット、birth より前)
  に対し `Expected: false / Received: true` で過剰受理を再現(git stash による
  実装差し戻し→build→テストの2回で、テスト順序修正の前後とも再現を確認)。
- Green 実測(是正後): `git stash pop` → build →
  `bun test tests/unit/t206-... tests/integration/t185-...` → **37 pass/0 fail**。
- 新設テスト2件: (i) 正例を issue 参照付き(`Fixes #697`、`commitIntentBirth([],[697])`)
  へ更新 (ii) cherry-pick sibling(`Fixes #999`、birth より前の非マージ直コミット)
  が拒否されることを検証する負例を追加。

## FR-4 受け入れ条件との対応表(FOLLOW-UP 2 是正)

| 受け入れ条件 | 対応テスト |
|---|---|
| (a) #3156パターンで approve 成功 | `recognises code committed before birth once this branch diverged from main, when it references the declared issue (issue #3156)` |
| (b) sibling のみで拒否(両側) | `refuses when only a sibling intent's code was merged in after this branch diverged from main (issue #3156)`(merge経由)/ `refuses a cherry-picked sibling commit before birth that references a different issue (issue #3156 identity attribution)`(非merge経由) |
| (c) 新設プローブは落ちる実証を経る | 上記「§12a BLOCKER 是正」節のRed→Green、および初版実装時の「落ちる実証(1セット)」節(注入→赤→revert) |

## コミット(更新)

- 是正コミットは **conductor 側の cross-worktree record sync 操作
  (`397fcd4ed2373ec2647d6ca94aa9d672d9fcb1b8`、メッセージ
  `chore(record): sync intent record after question-budget corpus fix`)
  へバンドルされて push 済み**であることを確認(`git diff HEAD~1 HEAD --
  packages/framework/core/tools/amadeus-state.ts` で識別内容が意図どおりである
  ことを確認済み)。このコミットは他 unit の record ファイル
  (application-design-questions.md 等)も同梱しており、レビュアー指定の
  `fix(#3156): require intent attribution for the fork-range source-work probe`
  という専用メッセージにはなっていない — 自分は push 権限を持たないため、
  メッセージ訂正の要否は conductor の判断に委ねる。
- 現行 HEAD で `bun run build` → t206+t185 = 37 pass/0 fail を再確認済み。
- model-map ピンも同コミットに含まれ最新化済み(`d07d0da40fcf` → `d624d800a1f0`)。

## 逸脱

なし(是正は §12a が指示した計画既決要求への復元であり新規裁定不要)。既存3
プローブは無変更(byte-for-byte)。互換シム・フォールバック分岐は追加していない。
スコープ外(AMADEUS_SKIP_ARTIFACT_GUARD バイパス変更、docs-only 免除経路)には
触れていない。コミットメッセージの帰属(cross-worktree sync への同梱)は自分の
制御外である旨を上記に明記。
