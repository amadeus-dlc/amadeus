# Scope Document — 260706-installer-versioning（Issue #543）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[feasibility-assessment.md](../feasibility/feasibility-assessment.md)、[constraint-register.md](../feasibility/constraint-register.md)

## スコープ内

1. **manifest の新設**: 導入先に版（配布元 commit + 導入時刻）とファイルハッシュ表（sha256、コピー対象全ファイル、配布時に書き込んだ内容の値）を記録する単一 JSON。
2. **版の確認コマンド**: 導入先で「どの版が入っているか」を 1 コマンドで確認できる入口（インストーラの subcommand または flag）。
3. **3-way 判定と退避型更新**: 記録ハッシュ / 新配布物 / 導入先現状の比較。改変検出時は集中退避 dir（`.amadeus-install-backup/<導入時刻>/` 相対 path 保存）へ退避してから上書きし、summary で告知。削除は再作成。bootstrap（記録なし）は不一致なら保守的退避。
4. **eval の拡張**: 上記の受け入れ条件（改変検出・退避・冪等・bootstrap）を dev-scripts/evals/installer/check.ts に追加。
5. **README（英日）の更新戦略の文書化**。

## スコープ外

| 項目 | 扱い |
|---|---|
| 配布契約そのものの改定 | 不要と判断（収束意味論は維持、退避は追加の保全機構）。必要になれば人間へ個別エスカレーション |
| overlay 適用済み agent の配布混入（fable 問題） | Issue #579 へ分離（合流しない。判断は intent-backlog を参照） |
| #533 guide の Updating 節への追随 | 実装確定時に engineer5 へ一報し、担当を調整（1〜2 行の追随） |
| 退避物の世代管理・自動清掃 | 作らない（時刻 dir で世代は自然に保全。清掃は利用者の手動運用） |
| 対話プロンプト・GUI | 作らない（C-1 非対話 1 コマンド） |

## 順序制約

Construction（コード変更）は #573 の merge 後に開始する（scripts/amadeus-install.ts と installer eval の接触面）。
