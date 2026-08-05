# Code Summary — U6 import-closure-guard(バッチ 1)

上流入力(consumes 全数): U6 nfr-design 成果物(READY 確定)、code-generation-plan.md、ADR-4。

## 実装結果(実測)

- ブランチ: `bolt-import-closure-guard`(base = main 257117d68)、PR [#2240](https://github.com/amadeus-dlc/amadeus/pull/2240)
- コミット(TDD スライス 3 件): 18c8ebcc0(pure guard seams)→ 3bc6f8645(manifest 修復 2 module)→ 403a62679(projection 組込 fail-closed)
- 変更: 8 files、+783 / -1
- 新設: `scripts/import-closure-guard.ts`(pure module)、テスト t440/t441(unit 全分岐)、t442(projection integration)、t443(symlink 脱出 integration)
- 修復: `plugins/formal-model-check/plugin.json` へ `tla-model-receipt.ts` / `tla-module-deps.ts` 登録(FR-011 の実害解消 — composed runtime missing import)

## 検証(実測 exit code)

- worktree solo: `bash tests/run-tests.sh --ci` = RESULT: PASS(conductor solo 再実行で確定)、`bun run build` = 0(再現性 / source-only green)
- referee: `amadeus-swarm check import-closure-guard` converged=true / tampered=false
- U1 との統合ツリー: typecheck 0 / lint 0 / full CI RESULT: PASS
- 落ちる実証: 修復前状態の red fixture(2 module 欠落の全数列挙)→ 修復後 green、任意 module 除去 → 赤 → 復元(t442 が fixture で固定)

## 申し送り

- `MODULE_REFERENCE_RE` の ReDoS 線形性実測(cid:code-generation:regex-linearity-untrusted-input)は適用外と整理する: 入力は repo 内ソースファイル(信頼境界内)であり「信頼境界外・不定長入力」の発動条件を満たさない。構造的にも入れ子量化子なしの単一 alternation で線形(§12a 独立レビューが敵対入力挙動を実測済み — コメント/文字列内 import の過大近似は fail-closed 方向)。
- レビュー NIT(unreadable path の visited.delete による再読・コメント内 import の偽赤ポテンシャル)は正しさに影響しないため未対応 — 将来顕在化した時点で Issue 化する。

## 逸脱

なし(builder 報告および conductor の diff 検分で確認)。
