# Code Generation Plan — fix-1226-goa-multiseg-ecode

上流入力(consumes 全数): requirements.md(FR-1〜FR-6 / NFR-1〜3。functional-design 等の per-unit 上流6点は bugfix degrade スコープにつき SKIP — 不在は engine の consumes_absent 宣言どおり)

> 測定 ref: origin/main = `a326f47bc`(bolt ブランチの base)。e3 #1248 ブランチとの非交差を実 diff で確認済み(norm-metrics 面 0件、非 record 変更 0件 — c6)。

## Bolt 構成

単一 Bolt(`bolt/fix-1226-goa-multiseg-ecode`、base = origin/main)。bugfix スコープにつき walking-skeleton セレモニーなし(stance=scope-dependent 分類済み)。

## 変更目録(planned)

1. **正本** `packages/framework/core/tools/amadeus-norm-metrics.ts`
   - `GOA_HEAD_RE`(:157)→ `/^GoA\[(E-[A-Z0-9]+(?:-[A-Z0-9]+)*)\]:\s*(.+)$/`(FR-1 — 受理拡大のみ)
   - `PM_CID_RE`(:161)の `round=` 側を同形拡張(FR-3、E-GMERA2=A)
   - スキーマコメント(:155-156)を「複節許容+スパースサブ問表記は対象外(別 Issue)」へ更新(FR-2(a)+FR-6 の統合1編集)
2. **テスト**
   - `tests/unit/t-norm-metrics.test.ts`: 複節 E-code の parseGoaLine 正テスト(team.md 実在9種の代表 `E-TPR-RE`/`E-SDE-CG4` 等)+複節 round の parsePmCidLine 正テストを新設(FR-4(b))。既存 :583-597 は不変維持(NFR-1)
   - `tests/unit/t238-election-record.test.ts:104-105`: 現行バグ挙動ピン留めを複節受理の正 assertion へ反転(FR-4(a)、E-GMERA3=C)。:102 の圧縮形受理テストは不変(GoaLineCode 単節維持)
3. **配布同期**: `bun scripts/package.ts` + `bun run promote:self`(dist 6+self-install 4 = 11コピー、NFR-2)
4. **Issue 起票2件**(conductor 実施、FR-2(b)(c)/FR-5 受け入れ基準)
   - スパース未達 Issue: 『head 拡張後もスパース行9行は bin 段 :692 で fail(pass=0/headFail=8→binFail 移行)』実測を転記(E-GMERA1 留保)
   - GoaLineCode 拡張 Issue: 『head 拡張着地後は圧縮 workaround の撤去が安全に可能』の前提+t238:102 の扱いを明記(E-GMERA3 留保)

## 検証(全て exit code 付き報告)

- 落ちる実証: 新テストを pre-fix 正本(`git checkout origin/main -- <正本>`)へ適用して赤を実測 → 修正適用で green(falling-proof-no-stash — stash 不使用、対象ファイル checkout 切替のみ。bolt ブランチ上で実施 = 承認待ち PR 汚染なし)
- 閉包: 起票時再現(`GoA[E-TPR-RE]: 1x3 …` → ok:false)の verbatim 再適用が ok:true へ反転すること(fix-review-replays-origin-repro)
- `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci`
- push 前ローカル lcov で diff 追加行未カバー 0(local-lcov-pre-push — parseGoaLine/parsePmCidLine は in-process import 済みで spawn 盲点なし)

## 実装体制

builder subagent(amadeus-developer-agent、worktree 隔離)1名 — 単一ファイル+テストの凝集変更につき fan-out なし(決定的関数の修正、並列化の利得なし)。conductor は成果物(plan/summary)・Issue 起票・検証裏取り・PR 発行を担当。PR レビューは実装者以外のメンバーへ依頼(independent-review-on-pr)。
