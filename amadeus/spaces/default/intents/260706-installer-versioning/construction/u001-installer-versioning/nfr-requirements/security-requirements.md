# Security Requirements — u001-installer-versioning（260706-installer-versioning）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[business-rules.md](../functional-design/business-rules.md)

## 要求

| ID | 要求 | 根拠 |
|---|---|---|
| SEC-1 | manifest・退避物・出力に機微情報（credential 等）を含めない。記録するのは path・hash・commit・時刻のみ | Construction ガードレール |
| SEC-2 | 退避先の path 合成（relPath 結合）で target の外へ書き出さない（相対 path は管理対象 root 由来のみを使い、`..` を含む path を合成しない） | 統合境界の入力検証 |
| SEC-3 | sourceCommit 取得の spawnSync は固定引数（["git","rev-parse","HEAD"]）で、外部入力をコマンドへ混ぜない | コマンド注入の構造的排除 |

## 検証

SEC-1 = diff レビュー + manifest スキーマ（キー 4 個固定）。SEC-2 = 供給源のうち旧 manifest は導入先（利用者が編集し得る場所）にあるため信頼しない: readManifest 由来の relPath は使用前に検証し、`..` セグメント・絶対 path を InstallError で拒否する（functional-design B002 手順 2 へ反映済み）。DistEnumerator 由来は配布元走査の実 path のみで閉域。eval の退避 path 検証で観測。SEC-3 = 実装レビュー。前例 260705 の SEC-2 はリスク受容で処理したが、本 Intent は recorded の path が rm / 退避へ流れるため検証を採る。
