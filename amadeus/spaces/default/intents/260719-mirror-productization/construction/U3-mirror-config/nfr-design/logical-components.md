# Logical Components — U3-mirror-config

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## モジュール境界

正本はtech-stack-decisions.mdで決定済みの`packages/framework/core/tools/amadeus-mirror-config.ts`とし、投影先にロジックを複製しない。

| 論理部品 | 責務 | 障害境界 |
|---|---|---|
| `MirrorConfigSchema` | 合法キー、値型、defaultの単一正本 | 不正なキー空間をモジュール内で遮断 |
| `parse` | JSON文字列を`parsed | invalid`へ変換し、null・配列・primitiveのルート拒否と全違反収集を行う | ファイルI/Oから独立した純関数境界 |
| `ConfigReader` port | 指定パスを1回読み、I/O結果を返す | Bun/OS差を薄いadapterへ隔離 |
| `readLayer` | I/O結果を`absent | parsed | invalid`へ分類 | ENOENT系とその他障害の誤同一視を防止 |
| `mergeLayers` | Global→Space→Intentの後勝ちマージとdefault補完 | invalid入力を受け取らない純関数境界 |
| `resolve` | 3面評価、invalid全件収集、原子的な結果返却 | 利用側へ部分成功を漏らさない公開境界 |

## 共有資源とblast radius

共有資源は3つのgit共有JSONファイルと単一の設定モジュールだけで、ネットワーク、データベース、AWS資源はない。1面のinvalidは意図的に解決全体を停止するが、ファイル変更や外部副作用は発生しない。障害影響は当該phase境界のauto-mirror判定に限定され、他のworkflow状態を変更しない。

## 実装・テスト分離

`parse`と`mergeLayers`はunitテスト、`resolve`と`ConfigReader` adapterは実FS integrationテストで検証する。`resolve`にはカーソル解決済みのspaceとintentDirを渡し、pointer読取は既存の呼出し側境界に残す。テスト用fakeはテスト側に置き、本番モジュールへfixture専用分岐を入れない。
