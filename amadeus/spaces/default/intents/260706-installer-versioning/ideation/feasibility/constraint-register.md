# Constraint Register — 260706-installer-versioning（Issue #543）

上流入力: [feasibility-assessment.md](feasibility-assessment.md)、[intent-statement.md](../intent-capture/intent-statement.md)

| ID | 制約 | 由来 |
|---|---|---|
| C-1 | 非対話 1 コマンドを維持する（対話プロンプトを追加しない） | #451 grilling 確定 4 |
| C-2 | 冪等性を維持する（同一配布物での再実行は同一結果） | #451 grilling 確定 5 |
| C-3 | オフラインで動作する（外部依存・ネットワークを追加しない） | #451 確定（build-vs-buy でも再確認） |
| C-4 | amadeus/（旧 aidlc/）配下は不可侵 | #451 契約 |
| C-5 | 配布契約の改定を含む判断は人間へ個別エスカレーション | ディスパッチ |
| C-6 | Construction（コード変更）は #573 merge 後に開始 | ディスパッチ順序制約 |
| C-7 | AMADEUS.md の照合は変換後の内容で行う | feasibility 実測 3 |
| C-8 | ハッシュ慣行は sha256（md5 の現役実装は repo に存在しない） | feasibility 実測 1 |
