# Security Test Instructions

Unit: u001-installer-versioning（feature scope）

## 適用

- SEC(#543)-2（path 注入）: eval の sec-1 系（`../evil.txt` の拒否 + target 外への書き込みなし、バックスラッシュ拒否）が自動検証する。
- SEC(#543)-1（機微情報不含）: manifest スキーマ関数（キー 4 個固定）+ diff レビュー。
- SEC(#543)-3（コマンド注入排除）: resolveSourceCommit の固定引数配列を実装レビューで確認済み（§12a B001 反復 1）。
- REL(#543)-2 の (ii)（退避失敗時の停止）は実装レビュー担保（nfr-requirements の正直な書き分けどおり）。
