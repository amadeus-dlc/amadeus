# Build and Test Summary — 260810-control-byte-gate

上流入力(consumes 全数): code-generation-plan.md(Step 1〜8 の実装構造 — 本書のテスト種別インベントリの導出元)、code-summary.md(受け入れ照合表と出荷断面 — 本書の readiness 判定の根拠)。

## 全体状況

| 面 | 状態 |
|---|---|
| ビルド | 成功(exit 0)。追跡ファイルの差分ゼロ |
| 静的検査 | typecheck / lint とも exit 0 |
| テスト | フルスイート **RESULT: PASS**(979 files / 13,196 assertions / 失敗 0) |
| ゲート自身 | exit 0、16,798 files 走査、668 ms |
| CI | PR #2880 で全17チェック緑。`CI Success` の run ログに `require_result "control-byte-gate" "success"` を実測 |

## テスト種別インベントリ

戦略は **Comprehensive**。生成した指示書と、生成しなかったものの根拠:

| 種別 | 生成 | 根拠 |
|---|---|---|
| unit | あり | 純関数層(検出集合の境界値 12 点、空バッファ、エスケープ表記の非検出) |
| integration | あり | 実 FS・実 git リポジトリでの走査エンジンと CLI、および FR-CBG-7 の CI 配線契約 |
| performance | あり(限定) | FR-CBG-14 が 30s の数値目標を持つため適用ありだが、目標は CI step の `timeout 30s` が本番経路で直接強制している。同じ閾値を別スイートで二重に測っても新しい情報が出ないため、実測記録と退行監視で構成し専用ベンチマークは作らない |
| security | あり(限定) | 攻撃面がほぼない(読取専用・ネットワーク/シークレット/書込なし)。SAST/DAST・認証・インジェクション試験は対象が存在しないため非適用。ただし security-design.md が名指しする脅威2件(allowlist 悪用・読取不能ファイルの無音 skip)は既存テストで固定済みであることを明記 |
| E2E | なし | 本 Unit はローカル CLI と CI ジョブ定義のみで、ユーザー可視の対話経路を持たない |

performance / security を「体裁のために作らない」判断は、目標なきベンチマークが検証劇場にあたる一方、無言の省略は黙示の欠落になるため、**適用の有無と根拠、将来この判定を覆すべき条件**を各指示書に明記する形で解決した。

## カバレッジ

Unit 固有の下限は置かず、リポジトリ共通の Project Coverage Gate(固定絶対下限 AND merge-base 相対許容低下幅)と Patch Coverage Gate で判定する。PR #2880 では Coverage Report(base / head / 集約)がすべて緑。

述語層と CLI は in-process seam(`main(args, repoRoot)` の引数化)を持つため、`bun --coverage` の spawn 盲点に落ちない。

## Readiness

- **build-ready**: はい。依存インストールとビルドの手順が確定し、exit 0 で再現する
- **test-ready**: はい。unit / integration とも実行手順が確定し、フルスイートが緑
- **deployment-ready**: 該当なし。本 Unit はデプロイ面を持たない(唯一のインフラ面が CI ジョブ定義であり、それは既に main へ着地済み)

## 既知の制約・残課題

- **入れ子 spawn 型テストは並行負荷に弱い**。hook・CLI を `spawnSync` で起動する7ファイルは、外側の並列実行と重い I/O が重なるとタイムアウト(`status=-1`)で赤くなる。実測は build-test-results.md の帰属節を参照。フルスイートを判定に使うときは、重いコマンドを並行実行しないこと。
- **§12a レビューの正式 verdict は NOT-READY のまま**(code-generation 段、iteration 2/2 で予算消尽)。ただし iteration 1 の BLOCKER 1(FR-CBG-7 未達)は CLOSED、iteration 2 の新規 BLOCKER は宣言 ref での再測定により不成立と確定し、`quality_repair` の観測経路で `READY` 閉包を得ている。この不一致は記録として残す。
