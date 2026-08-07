# Code Summary — Bolt 3: fix-2358-unit-done-declaration

上流入力(consumes 全数): `requirements`(`amadeus/spaces/default/intents/260807-failclosed-recovery-path/inception/requirements-analysis/requirements.md` — FR-3.1〜3.6 / AC-3a〜3g を実装と検証の合否面として消費)。

## 実装結果

- **ブランチ**: `bolt/fix-2358-unit-done-declaration`、head `a4bcfdd96d9daa00270639c3d27b676790931978`(§12a i1 是正コミットを含む3コミット)(**再接地後** base = `edfee5818` — rebase 競合ゼロ・`ls-files -u` 空・content は 10 files/+816−11 で byte 保存。コミット2件: `367eaeb07` engine fix / `88b10a375` FR-3.5 memory 追補)
- **コミット**: `367eaeb07` fix(engine): let a declared unit list settle the degrade per-unit gate / `88b10a375` docs(memory): record the declare-units-done recovery path against the degrade fail-closed ruling
- **変更**: `amadeus-lib.ts`(+137: 宣言定数/writer/reader/`--units` parser/decision 境界)/ `amadeus-orchestrate.ts`(+50/−11: multi-unit アーム、`emitDegradeCompletionGate`、refusal-reason 引数)/ `amadeus-state.ts`(+37: `declare-units-done` handler + dispatch + Valid リスト)/ t480 unit(154行)+ t480 integration(328行)/ t367 test 13→13a/13b 明示改訂 / mechanism-ratchet EXPECTED_NONE_TO_CLI / coverage-registry・ratchet 再生成(function 176→179)

## FR 対応と AC 実測

| AC | 実測 |
|---|---|
| AC-3a | t367 13b + t480 engine tests: 宣言あり → `run-stage` + gate 発行(green) |
| AC-3b | 宣言なし → 従来 refuse(green)。**落ちる実証2独立注入**: engine が宣言を見ない注入 → 6 fail / decision が無宣言でゲートする注入 → 3 fail(後者が AC-3b の非空虚性を担保)。復元済み(tree clean 検証) |
| AC-3c | t367 test 14 無改変で green(E-OBB2-CG1 非対称の保存) |
| AC-3d | `parseCheckboxes` 宣言前後 byte 同一(t480 integration で pin)/ state・mirror reader スイート 75 pass / migrator + validate-state 機械検証(宣言有無の両方で 0 errors) |
| AC-3e | (i) **最終 base `edfee5818` で再導出**: `unitCovered` 本体(awk 抽出 21行)= base と **diff exit 0 で byte 同一**、呼び出し4箇所も行シフト許容比較で diff 0、`unitCovered(` を触る code-diff 行 **0** (ii) t480「the decision sees the real listing: an extra directory makes the same declaration stale」— 同一宣言・ディスク実体のみ異なる2プロジェクトで gate/refuse が分岐 = ダミー実装では区別不能な形で実データ搬送を assert |
| AC-3f | project.md 追補(`cid:code-generation:c1-2358-declare-units-done`、grep = 1)を conductor 起草文の verbatim 適用(byte 比較 diff exit 0)で同一 PR に同乗(`88b10a375` — 1 file / +1 行のみ) |
| AC-3g | #2358 へ分離コメント投稿済み(2026-08-07、conductor) |

## TDD Red 実測(3サイクル)

1. `SyntaxError: Export named 'writeDegradeUnitDeclaration' not found` → lib 実装で 11 pass
2. t367 13a/13b: `Expected to contain: "declare-units-done"` / `Expected: "run-stage" Received: "error"` → engine アームで 17/17 pass
3. `SyntaxError: Export named 'handleDeclareUnitsDone' not found` → verb 実装で 14/14 pass

## §12a i1 BLOCKER の閉包(実測)

**BLOCKER 1 — AC-3f の grep 機械確認(conductor 実測、builder worktree の project.md 追補行 :288)**: `c1-degrade-batch-directive-capture` = 1 hit / `#2385` = 1 hit / `260730-e-obb2-cg1` = 1 hit / `260730-e-obb2-cgs13` = 1 hit — AC-3f の要求参照4種すべて追補行内に実在。

**BLOCKER 2 — NFR-5 の allowlist 検査(現行台帳は行ピンでなく function-selector + fingerprint 形式 — 行 remap/span の等価検査は「全エントリ resolve + span 監査」)**:
- conductor 初回実測(head): `resolveAllowlistEntries` 全 590 エントリ → **failures 1**(`amadeus-state.ts#main` の fingerprint が 0 回解決)— **実害の stale を検出**
- 機序(builder 特定): dispatch 追加そのものではなく、entry #509 が pin する `Unknown subcommand … Valid:` **カタログ行の in-place 編集**(Valid リストへの verb 追記)が fingerprint(行テキストの SHA-256)を失効させた。他の main スコープ5エントリは行シフトのみで全件解決(selector は行シフト耐性・テキスト変更非耐性)
- 是正: #509 の fingerprint を `createSemanticSelector` の機械再計算で更新(function/anchorLines/targetLines/reason/expiry は不変 — reason は直読照合の結果、現行行でも逐語成立のため無変更が最小正解)。台帳 diff は `1 1`(1行のみ)
- 再実測: **590/590 resolve / failures 0**(orchestrate 63/63・state 58/58)
- span 監査(3ファイル全エントリ、base↔head): state 58 / orchestrate 63 / lib 3 エントリで **span 変化 0**。追加行を waiver する既存レンジは #509 の自行(in-place 編集行 1061)のみ = 真の straddle ではない(base で waiver 済みの同一文の1トークン追記)。**真に新規の行が waiver を得た件数 = 0**
- 構造所見(次の verb 追加者への申し送り): `cid:build-and-test:c2-chr-verb-sync` の Valid カタログ同期義務と本 fingerprint の pin は**結合**している — CLI verb を足すと必ず #509 型の fingerprint 失効が再発する

**C-1 対応関係(FOLLOW-UP)**: 再接地で取り込んだ `28bc42353` = PR #2387、`edfee5818` = PR #2389 — いずれも **Bolt 1(#2313)の着地コミット**であり、本 PR の発行は C-1「Bolt 1 着地後」を充足する(#2388 は並行 chore)。

## 再接地(base 前進)の検証

- 取込3コミット(#2387/#2388/#2389)の変更ファイル集合と自 10 files の交差 = **∅**(競合ゼロの機序)。ただし textual 無競合 ≠ 台帳整合のため意味面も実測: `gen-coverage-registry` 再実行で drift なし(status 空)/ mechanism-ratchet 2 pass / conflict marker 0(per-file 検査、`&&` 連鎖の grep -c を回避)
- tNNN 再確認(固定 base の ls-tree): 最大 t466(#2387 持込)、`t480` は 0 hit — 予約維持・改番不要
- 落ちる実証は**新 base で再実測**(持ち越しでない): 無宣言ゲート注入 → 3 fail / 復元 → tree clean・42 pass 再確認

## 検証(builder、全 exit 0 — 最終 base `edfee5818` 上)

typecheck 0 / lint 0 / 対象テスト群 0 / build 後 status --porcelain 0行 / complexity 0。追加(自発): source-only 0 / no-silent-drop gate `NO_SILENT_DROP_OK` / 回帰セット t116・t120・t186・t211・t33・t399・t48・t416(121 pass)/ state・mirror reader(75 pass)/ engine-boundary + lock(124 pass)全 0 fail。`run-tests.sh --ci` / coverage は PR CI 判定。

## 判断・付随事項(builder 申告)

- `--units` 明示リスト必須と完全一致(superset 不可)は FR-3.3(ii) の実データ検証を有意にするための設計(plan に記録)
- docs 追加なし: `amadeus-state` の verb を目録化する docs 面が存在せず(`declare-docs-only` 等も未記載)、#1711/#1769 の degrade 契約も docs に 0 hit — 片面追加は EN/JA 対の非対称を生むため見送り(必要なら別途指示)
- 記録事項2件: (a) `.ts` テストファイル内トップレベル `function declare(...)` は ambient 宣言として本体が無音消去される(helper 名を `declareDone` に変更、コメントで固定) (b) `amadeus-state.ts` の `error()` は process exit のため拒否アームは spawn で assert(検証ロジックは純関数 `parseDeclaredUnitsArg` に抽出し in-process 被覆)
