# ビルド・テスト総括 — 260725-teamup-launch-hardening

上流入力（consumes 全数）: `construction/u1-watcher-actas-guard/code-generation/code-generation-plan.md`、`construction/u1-watcher-actas-guard/code-generation/code-summary.md`、`construction/u2-worktree-parallel/code-generation/code-generation-plan.md`、`construction/u2-worktree-parallel/code-generation/code-summary.md`

## 判定

**READY**。

当初これを「R-3（actas の配送検証）未実施」を条件とする条件付き READY としたが、それは誤りだった — RAID は R-3 を「実装時に実測確認」と規定しており、スコープ内の検証を実装段で先送りしていた。是正して実測し、条件を解消した。

## 何を検証したか

| 面 | 手段 | 結果 |
|---|---|---|
| 型・lint | `typecheck` / `lint` | exit 0 |
| 配布面の同期 | `dist:check` / `promote:self:check` | exit 0（11コピー一致） |
| 全テスト | `tests/run-tests.sh --ci` | `RESULT: PASS`、FAIL 0 |
| U1 の分岐 | `t294`（書き換え） | PASS |
| U2 の並列度・完了照合・ロールバック | `t295`（新規 273行） | PASS |
| 実起動 | 隔離インスタンスでの実 launch | 7人で exit 0 / sentinel 7/7 / アタッチ 11.80秒 |
| R-3: actas 下の配送 | 隔離インスタンスでの実送受信 | 双方向成立・宛先分離も正しい |
| NFR-3: resume 時のロック残存 | 残留ロックを作っての実 `-c` 起動 | exit 0 / sentinel 3/3 / 所有者が新 PID へ入れ替わり |

## テスト層の選択について

本 intent はユニット層へテストを追加していない。変更対象がシェル関数・tmux・実 FS 境界であり純関数層を持たないためで、`project.md` の `cid:build-and-test:wtfbt-c1` に従って integration seam を最小検証集合とした。**検証の省略ではなく層の選択である。**

## 前 intent の教訓が効いたか

前 intent の RE で確定した `cid:reverse-engineering:seam-writer-mode-precondition`（信号を待つ側を書く前に、書く側がどの起動モードで書くかを実測せよ）は、まさに #1391 が sentinel の生産側を移植せずに待機側だけ移植したことでこの不具合が生まれた、という教訓だった。

本 intent の U1 はその生産側と消費側の対応そのものを扱っており、`t294` は**モード差自体を検証する**構造になっている — スタブが sentinel を書いてしまう `t-team-up-watcher-arming` の構造（それが2日間 CI をグリーンに保った原因）とは別の面を押さえている。

## 明示的にフラグする既存の警告

`t-codex-hooks-migration.test.ts` の wall-clock drift（declared=medium / measured=large 36.45秒）。最終変更は `bf84cdfaf`（#1212）で本 intent の変更とは無関係。`RESULT: PASS` を妨げないためスコープ外とするが、無視ではなく引き継ぎとして記録する。

## 引き継ぐ未検証事項

| 項目 | 引き継ぎ先 |
|---|---|
| `t-codex-hooks-migration` の size 宣言ドリフト | 別作業（本 intent 範囲外。`bf84cdfaf` #1212 由来） |

R-6（Linux CI 上の並列度特性）は「未実測」として引き継ぐつもりだったが、**その未実測領域でまさに CI が落ちた** — 並列 `git worktree add` が Linux で競合した。是正して登録を直列化し、`t295` が登録の並列度がちょうど 1 であることを固定している。未実測のまま引き継ぐ項目ではなくなった。

R-3 と NFR-3 の resume 面は、当初「#1476 の実運用投入時へ」として引き継ぐつもりだったが、いずれもスコープ内の検証であり実装段で先送りしてよいものではなかった。是正して実測済み。
