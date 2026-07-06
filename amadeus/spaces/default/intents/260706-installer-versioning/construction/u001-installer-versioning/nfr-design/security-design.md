# Security Design — u001-installer-versioning（260706-installer-versioning）

上流入力: [security-requirements.md](../nfr-requirements/security-requirements.md)、[business-logic-model.md](../functional-design/business-logic-model.md)

| 要求 | 設計 |
|---|---|
| SEC-1（機微情報不含） | manifest はキー 4 個固定のスキーマ関数で構築（自由フィールドなし）。退避物は導入先ファイルのコピーのみ |
| SEC-2（path traversal） | readManifest 直後に検証関数 `assertSafeRelPath(relPath)` を全キーへ適用: POSIX 区切りで分解し、`..` セグメント・先頭 `/`・ドライブレター・空セグメントを InstallError（fix: manifest が壊れている旨 + 再導入の案内）で拒否。検証済み path だけが scanObsolete / backup へ流れる。前提: 本ツールは POSIX 実行のみ。バックスラッシュとドライブレターは POSIX では実害がないが、manifest 混入時の保険として実装では拒否リストに含める（安全側の逸脱。eval にバックスラッシュ拒否ケースあり） |
| SEC-3（コマンド注入排除） | spawnSync は固定引数配列（["git","rev-parse","HEAD"]）+ cwd 指定のみ。文字列結合の shell 呼び出しをしない |

実コードへの規則コメントは `SEC(#543)-n` 形式。
