# Code Generation Plan — Bolt 2: fix-2330-advisory-store-recovery

上流入力(consumes 全数): `requirements`(注: stage frontmatter の `unit-of-work` consume は scope self-fix が units-generation を SKIP するため設計どおり不在 — `consumes_absent` の `expected: true`)(`amadeus/spaces/default/intents/260807-failclosed-recovery-path/inception/requirements-analysis/requirements.md` — FR-2 全項と AC-2a〜2e、NFR-1〜NFR-5、C-1〜C-5 を本計画の唯一の要件正本として使用)。

## 目的

#2330(advisory choice store の schema 1→2 回復経路不在)を、`parseStore` 無変更のまま回復 verb の追加で是正する(#2385 Q3 裁定 + 本ステージ Q2-A = 単一 store のみ + FR-2.3 実装時精密化 2026-08-07T05:33:58Z ユーザー承認 = receipts-only store の identity 検証)。

## 変更面(NFR-4: `packages/framework/core/tools/` = 正本 → `bun run build` 再生成・追跡ファイル不変を確認)

| ファイル | 変更 |
|---|---|
| `packages/framework/core/tools/amadeus-advisory-choice.ts` | 回復 verb `recover-schema-1` 追加(FR-2.1〜2.4)。`parseStore`(`:659-675`)無変更、salvage は別関数で `parsePending`(`:640-651`)再利用 |
| `docs/reference/12-state-machine.md` / `.ja.md`、`packages/framework/core/knowledge/amadeus-shared/audit-format.md` | schema 2 / provenance union の移行経路(FR-2.6) |
| 新規テスト(t470 — 並行 builder との採番衝突回避で事前予約) | AC-2a(pending N / pending 0 の両分岐)・AC-2b(identity 不一致 loud 拒否)・AC-2c(hold 解消の分岐別)・CLI spawn 契約 |
| `tests/.coverage-patch-allowlist.json` | dispatch 1行の append-only 1エントリ(seam 優先の残余) |
| `tests/integration/t-coverage-mechanism-ratchet.test.ts` | EXPECTED_NONE_TO_CLI 追記(CLI verb 追加の定型 — `cid:build-and-test:c2-chr-verb-sync`) |

## 実装ステップ(TDD — NFR-1。AC 述語は requirements から逐語で写す)

1. **Red→Green ×5**(C1: FR-2.1 salvage / C2: FR-2.4 出力契約 / C3: FR-2.3 pending identity 拒否 / C4: FR-2.5 CLI seam / C5: FR-2.3 精密化 = receipts-only identity 拒否)— 実績値へ整合(§12a i1 FOLLOW-UP)。
2. FR-2.2 逐語: 「verb は**単一 store のみ**を対象とする(`--project-dir` で明示指定した1 store。既定は cwd 解決の active intent)。clone 内探索・複数一括処理は実装しない」。
3. FR-2.3 逐語(実装時精密化を含む): 「破棄前に store の pending の intent identity と実行時 active intent の一致を検証し、不一致なら loud に拒否する。**pending 0 件・receipts のみの store では receipts の intent identity と実行時 active intent の一致を検証し、不一致なら loud に拒否する**」。
4. AC-2a 逐語: 「schema 1 store(pending N 件・receipts M 件)に対する verb 実行後、store は schema 2 で pending N 件が salvage され、receipts は 0 件、出力に dropped=M と再提示必要の明示がある。**pending 0 件・receipts のみの store も明示分岐とする**: verb は schema 2 の空 pending store を書き、出力は dropped=M・re-presentation 不要を明示する」。
5. 落ちる実証(AC-2b 逐語「変更ゼロで非0 exit(loud 拒否)— 落ちる実証を含む」): ガード無効化注入 → 赤実測 → 復元 → 残渣ゼロ。
6. 検証: typecheck / lint / t470+t458+関連スイート / `bun run build` 後 status --porcelain 空 / complexity / unchecked-cast / callsite / deletion / source-only / no-silent-drop gate。
7. PR 発行(**Bolt 1 の着地後** — C-1 順序)→ 収束ループ → 承認マージ → 着地後の閉包確認。

## AC(requirements FR-2 の AC-2a〜2e — 逐語参照)

AC-2a(両分岐 fixture 機械検証)/ AC-2b(落ちる実証込み)/ AC-2c(hold 解消・分岐別)/ AC-2d(t458 無改変 green + allowlist 併用)/ AC-2e(docs 2面 grep 実在)。

## 逸脱規律

FR-2 から逸脱する必要に気づいたら実装前に停止して conductor へ報告(既存様式への準拠と判断する場合も停止対象)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T06:26:41Z
- **Iteration:** 1
- **Scope decision:** none

AC 逐語保存・FR-2.3 精密化・落ちる実証の対照設計は良好。NFR-5 の3点セットのうち reason 直読照合と span 膨張検査の証跡欠落が BLOCKER。FOLLOW-UP 4件・NIT 1件。

### Findings

- BLOCKER | NFR-5 の allowlist 3点セットのうち evidence が remap 相当の再解決のみ — reason 直読照合(逐語)と span 膨張検査の実測を code-summary へ追記する
- FOLLOW-UP | plan の TDD サイクル数 ×4 と summary の5サイクルの不一致 — plan を実績値へ整合
- FOLLOW-UP | characterization 9テストが新しい未検証分岐を含まないか conductor 側で直接確認
- FOLLOW-UP | 隔離2回ビルド再現性の evidence 不在 — CI 委譲であることを summary に明記(単発 build+status を代替と読める記載を避ける)
- FOLLOW-UP | FR-2.6 の docs 面数(2面名指し vs 3面実施)— 対訳同時更新は既存 Mandated の機械的執行であり停止不要という位置付けを明記
- NIT | unit-of-work consume の不在が設計どおりである旨を plan/summary 側にも一行明記

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T06:49:57Z
- **Iteration:** 2
- **Scope decision:** none

i1 の BLOCKER(NFR-5 3点セット)と FOLLOW-UP 4件・NIT 1件はすべて機械実測込みで閉包。是正起因の二次欠陥なし。FOLLOW-UP 1件(FR-2.3 承認タイムスタンプの plan/requirements 不一致 — 機械照合クラス、conductor 是正可)。

### Findings

- FOLLOW-UP | FR-2.3 精密化の承認タイムスタンプが plan(05:33:58Z)と requirements(05:55:00Z)で不一致 — 実測値へ統一する(機械検証可能クラス、conductor 是正可)
