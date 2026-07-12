# 実現可能性評価 — メトリクス定点観測(260712-metrics-observation)

> 方式前提: market-research の推奨(既存計測経路を再利用する薄い Build+Codecov 温存のハイブリッド)。評価は本 worktree での実測(2026-07-12)に基づく。確定できない部分は確信度付きで明示する(feasibility:c1)。

## 計測経路別の実現可能性(すべて実測で裏取り)

| 計測候補(#921) | 経路 | 実測結果 | 判定 |
|---|---|---|---|
| CCN 分布・関数数 | `tests/complexity-gate.ts` の lizard 経路(#837 導入済み・CI 両ジョブに pip pin 済み) | `--check` 実行 0.35s(本 worktree)— 追加負荷は実質ゼロ | **高** |
| カバレッジ% | `coverage:ci` の lcov.info(CI アーティファクト保存済み・正規化は #856 の coverage-normalize) | batch7 で lcov 直読の実務経路を4 PR 連続実証済み | **高** |
| LOC・ファイル数 | `git ls-files`+静的走査(Bun 標準) | 対象 .ts 472 ファイル(core+scripts+tests、計測時点 2026-07-12 の実測 — HEAD 前進で増減する点に留意)— 走査は決定的 | **高** |
| テスト数・assertion 数 | `tests/run-tests.ts` の SUMMARY 出力(Test files / assertions は毎 CI 実行で出力済み) | batch7 build-and-test で 4413 assertions 等を実測取得済みの実績 | **高** |
| dist サイズ | `du`(生成物) | 12M(実測)— 取得は自明 | **高** |

## トリガーの実現可能性

- **main マージ時 CI(第一候補)**: CI が snapshot をコミットするには write 権限が要る。`ci.yml` は `contents: read`(実測 :24/:80)だが、**`release.yml` に `contents: write` で main へ push する前例が実在**(release-it のバンプコミット、:48)。同型の専用 workflow(または権限付き job)で実現可能。ループ防止(snapshot コミットが再度 CI/snapshot を誘発しない)は paths-ignore か `[skip ci]` の定石で対処 — 設計論点として requirements へ。確信度: 高。
- **cron**: GitHub Actions の schedule で実現可能(トランク不変でも環境変動を拾う用途)。確信度: 高。ただし必要性は要件判断。
- **手動**: Bun スクリプト1本で自明。確信度: 高。

## 保存形式の実現可能性

- 日付付き個別 JSON(`metrics/` 配下): 実装自明・並行 PR と構造的非競合(shared-ledger-insert-collision 回避)。リポジトリ肥大は1 snapshot 数KB 想定 × マージ頻度 — 年間でも MB オーダー(概算、確信度: 中 — スキーマ確定後に再見積り)。
- 追記型単一台帳: 実装自明だが競合実測クラス。採用するなら union→regen 定型が必要。

## 総合判定

**実現可能性: 高**。すべての計測候補が既存資産の再利用で成立し、新規依存ゼロ。主要な技術リスクは「CI からの main への書き戻し」1点に集約されるが、release.yml の前例で解消筋が実証済み。ブロッカーなし — ideation を通過して inception へ進める水準。
