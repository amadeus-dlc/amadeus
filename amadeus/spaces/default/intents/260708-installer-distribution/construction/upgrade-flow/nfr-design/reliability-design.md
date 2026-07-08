# Reliability Design — upgrade-flow

> ステージ: nfr-design (3.3) / Unit: upgrade-flow / 作成: 2026-07-08
> 出典: `../nfr-requirements/reliability-requirements.md`(REL-U01〜U04)・`tech-stack-decisions.md`(rename 原子性)、U2 nfr-design/reliability-design.md(fail-fast 継承)

## REL-U01(退避→コピー順序)の実装構造

- backup-then-copy はエントリ処理関数内の**直列2ステップ**: `await fs.rename(target, bkPath)` の resolve を待ってから `await fs.copyFile(payload, target)`。rename 失敗(SEC-U01 の存在チェック込み)は copy を実行せず ApplyFailure — 「退避未完了での上書き」がコード構造上不可能
- fault-injection テストは FsWrite ポートの fake(テスト側ヘルパー)で rename を失敗させる(本番コードにテスト分岐なし — DI ポートがテストシーム)

## REL-U02(境界6経路の無変更)の実装構造

- 6経路はすべて cli の runUpgrade 内で **applier 到達前に return**(business-logic-model の分岐構造そのまま)。fs スナップショット比較テストは tests/harness のフィクスチャ流儀で、対象ディレクトリの再帰 stat+md5 一覧を前後比較
- 検出(detect)→拒否(UpgradeRefusal)の経路に書き込みポートが登場しない(構造的保証 — U1/U2 の注入非対称の帰結)

## REL-U03(回復ループ)の実装構造

- 回復は新規機構ではなく既存部品の連鎖(partial 検出 → --force → partial-forced)。integration テストが一周を検証(fault-injection → 再実行 → 収束)
