# Reliability Design — u001-engine-installer（260705-engine-installer）

上流入力: [reliability-requirements.md](../nfr-requirements/reliability-requirements.md)、[business-logic-model.md](../functional-design/business-logic-model.md)

## 設計

| 要求 | 設計 |
|---|---|
| REL-1（冪等収束） | 全置換 = rm + cp の再実行同値。symlink = unlink + symlink の再作成。マージ = matcher+command の重複排除 union（2 回目は no-op） |
| REL-2（非破壊中断） | 衝突検査（lstat、JSON.parse）を書き込みの前に行い、失敗時は当該対象へ一切書き込まない。ロールバックは作らない（FR-1.8） |
| REL-3（無言失敗の禁止） | 全工程を try で包み、失敗工程名 + 対象 path + 原因 + fix 案内を stderr に整形して exit 1。成功時のみ exit 0 |
| REL-4（偽陽性排除） | smoke は --project-dir 明示 + cwd=target の二重指定（FR-2.12 が回帰検証） |

## エラー分類（FR-1.1、FR-1.5、FR-1.6、interaction-spec の出力規約、business-logic-model O-2 に基づく）

| 分類 | 該当 | fix 案内 |
|---|---|---|
| 事前チェック失敗（工程開始前） | target 不在・非ディレクトリ・書き込み不可 | `--target` の指定修正（FR-1.1。再実行の案内は不要 = 同じ指定では同じ理由で失敗する） |
| 工程中の失敗 | I/O 失敗、symlink 位置の実体衝突（移動/削除が必要）、解析不能 settings.json（手動修復が必要） | 対象別の操作 + **原因解消後の再実行で収束する旨を必ず併記**（FR-1.1 の一律契約、interaction-spec） |
| スモーク fail（配置完了後） | doctor の検査 fail | 「installed but smoke check failed」+ doctor 出力 + doctor の手動再実行 / 出力の指示に従う案内。**部分配置の失敗とは表示を区別する**（business-logic-model O-2 の確定） |
