# Code Summary — fix-1797-t259-interleave

上流入力(consumes 全数): requirements.md — FR-3a〜3c の充足状況を本書で対応付ける。

## 実装(PR #1822、branch bolt/fix-1797-t259-interleave)

変更は `tests/helpers/guard-corpus-benchmark-child.ts` + `tests/integration/t259-guard-corpus.test.ts` の2ファイル(+88/−31)。追加プロダクション行 0(core/allowlist 非接触を dist:check / promote:self:check で裏取り)。

- **FR-3a(交互計測)**: child を単一プロセスの交互計測(A,B,A,B…)へ変更し時間窓を共有。RSS は単一プロセス内比較が実測で成立しない(向き反転)ため per-process 計測を維持(child が自分自身を probe spawn、呼び出し側 spawn 1回)。
- **FR-3b(実測導出)**: 負荷スイープ実測(16並列 burst/steady、PR 本文に数表)から導出 — 現行設計は burst で max 2.5179 の欠陥再現、新設計はレンジ幅 0.748→0.087。**閾値 2.5 維持**の分岐を採用。
- **FR-3c**: 閾値引上げ・負荷検知可変化は不使用。

## テスト(FR-3 受け入れ基準との対応)

- 基準1: スイープ実測数表(無負荷/steady/burst × 現行/新設計)が PR 本文に記載され、方式・閾値がそこから導出。
- 基準2(落ちる実証): 時間比 = parse 注入で 3.9785 赤(注入面の試行錯誤も記録 — 走査注入では赤にならず parse 支配と確定)/ RSS 比 = retain 注入で赤(probe 短縮後も 4.14 で反証可能性維持)→ revert 後 緑。閾値 400,000→1,500,000 の修正(1コピーでも発火する誤設定の自己捕捉)込み。
- 基準3: t259-guard-corpus 2 pass、線形性検出力の保存を注入赤で実証。test-size 系ガード(42 pass)グリーン。

## 検証(個別直書き・exit code 実測)

typecheck 0 / lint 0 / t259 0(2 pass、11.7s — 初版 20.8s の CPU 消費リスクを probe 短縮で是正)/ t-test-size-drift+dynamic 0 / gen-coverage-registry 0 / dist:check 0 / promote:self:check 0。PR CI: 1回目の赤2件は t259 非依存と帰属(t258 = base 再現 flake → 別 Issue #1830 起票・dup 確認込み)、2回目 Tests green・最終 CLEAN・全 checks green・thread 0。

## 申し送り

- #1830(t258 lifecycle ベンチマークの PR 非依存 flake、bug/P2/S3)を副次起票 — 本 intent スコープ外。
