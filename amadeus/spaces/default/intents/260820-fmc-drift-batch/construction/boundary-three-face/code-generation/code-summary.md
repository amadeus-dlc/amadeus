# Code Summary — boundary-three-face(U2 / #2929)

上流入力: `code-generation-plan.md` / FD 3 成果物 / `nfr-design/security-design.md` / `unit-of-work.md` U2 / `requirements.md` FR-BND-1〜6。数値は builder 完了報告と CI ログからの転記(測定 ref = worktree commit `c516f2ae` + 是正 `cb6c88c09`、着地 = PR #3364、2026-08-20T22:30:28Z マージ)。

## 実装実測

- **規模**: 10 ファイル、+257 / −13(+ t146 是正 3 ファイル)。見積 実装 150〜220 / テスト 300〜400 に対し実装面は整合、テスト +191(新規 glob drift 68 + loader 境界 93 + validator 30)
- **3面の Red→Green(全て実測)**: validator 受理側 = 形状変更前 exit 1(2 fail、逐語 `entries[0].implPath is outside the canonical implementation boundary`)→ 29 pass。loader in-boundary = 修正前 exit 1(3 fail、逐語 `implementation entry is not a regular in-boundary file` — FD 予言どおりの休眠第二境界)→ 26 pass。glob drift = 更新前 exit 1(非被覆 = orchestrate/state の逐語リスト)→ 3 pass
- **SOURCE_DRIFT**: hash-differs を bytes 追記 / 誤 sha256 の両アームで実測。境界外 realPath は in-repo-out-of-boundary と repo 外の両アームで拒否維持
- **entries 8 行**: 4 plugin ファイル × 2 モデル、実 sha256 転記済み(builder 報告の表)。既存 13 entries 非接触(diff は挿入のみ)。per-model sorted unique 検証済み
- **検証**: build 0 / typecheck 0 / lint 0(エラー 0)/ registry --check 0 / source-only 0 / completeness sensor pass / 両 glob エンジン一致 probe / formal・tla 系 86 ファイル 1391 pass / 0 fail
- **既存赤の帰属**: e2e 9 fail は実 ablation(変更退避 → 再実行 → byte 復元)で既存帰属(tla2tools 不在 + センサー移設前パス参照)

## 逸脱・スコープ追加(申告済み)

- docs 2面 resync(t3028 が検出 — 第5の台帳クラス = docs prose literal。同一変更同梱は bt-ledger-resync 義務の適用)
- `tla-model-map.ts` barrel への re-export 追加(loader の既存 import 規約への追従 — 二重定義なし)
- t146 是正(anchored glob 形 — FD 未列挙の衛生クラス。意味論保存は本番 matcher で事前検証)

## 配送・クローズ

PR #3364(converged:true・CLEAN・unresolved 0)→ 常任承認条件でマージ → Issue #2929 クローズ(着地面実読: entries 8 行 + export 実在)。pr-convergence-report.md(kind: converged)同梱。
