# Code Generation Plan — U-5 audit-sink-investigation(#3032 / FR-5)

depth Minimal。調査ユニット(D-5)のため、コード生成は条件分岐後にのみ発生する。トレース: 全 step → FR-5(stories は SKIP のため FR 直接トレース)。

## Steps

- [x] Step 1: 当時断面の確定 — 着地2行(2026-08-07T11:20:09Z)当時のコミット(intent 260807-projectdir-worktree-fix の record と git 履歴から 4a3da7d62 近傍)を特定し、t214-seam テストと emit 経路の当時バイトを読む → FR-5
- [x] Step 2: repo 外 scratch に再現環境を構築 — scratch 配下に workspace A(「実 record」役)と workspace B(fixture 役)の2ツリーを作り、AMADEUS のツール実行を scratch の project-root override で駆動(実 record への書込リスクを構造的に排除) → FR-5
- [x] Step 3: 再現試行 — 同一 bun プロセス内で (a) workspace A を先に OTel bootstrap(ピン) (b) CLAUDE_PROJECT_DIR を workspace B へ向けて recordEngineError を呼ぶ — の順で駆動し、ERROR_LOGGED 行がどこへ書かれるか(A / B / どこにも書かれない)を実測。当時バイト(Step 1)と現行バイトの両断面で試行 → FR-5
- [x] Step 4: 機序判定の記録 — 実測ログ・判定(再現/非再現・機序)を record の investigation-log.md へ確定値のみで記録 → FR-5
- [ ] Step 5(条件: 機序確定時のみ): TDD で是正 — 失敗テスト先行(emit 宛先が呼出時 projectDir と不一致になる再現テスト)→ loud fail または no-op の最小是正 → green。core 変更のため bt-ledger-resync(model-map ピン・coverage 台帳)と bun run build を同一変更で実施。worktree bolt-audit-sink で実装し push-first で PR → FR-5
- [x] Step 6(条件: 非再現時のみ): クローズ準備 — 実測ログを添えた Issue #3032 のクローズ提案文面と既着地2行の revert 要否申し送りを record へ記録(クローズ実行は人間承認境界) → FR-5
- [x] Step 7: code-summary.md の作成(分岐結果・実測値・残課題) → FR-5

## 分岐の実績(実行後の追記)

計画は Step 5(機序確定)と Step 6(非再現)を排他の条件分岐として書いたが、実際の結果はそのどちらでもない第三の形になった: **機序は確定したが、原因は main へ着地しなかった WIP バイトであり現行バイトに是正対象が存在しない**。したがって Step 5 は前提不成立で**不適用**(未チェックのまま)、Step 6 の「実測ログを添えたクローズ準備」を適用経路とした。根拠と実測は `investigation-log.md` を正とする。

## テスト方針

- Test Strategy は Comprehensive(self-fix スコープ既定)だが、本ユニットは調査型 — テスト新設は Step 5 の是正分岐でのみ発生(回帰テスト1件以上、エラーパス含む)。非再現分岐ではコード・テスト変更 0 件(検証劇場の禁止 — 目標なき検査は作らない)
