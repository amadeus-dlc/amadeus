# Scope Definition Questions — 260706-installer-versioning（Issue #543）

上流入力: [scope-document.md](scope-document.md)

## 確認済み事項

設計論点 6 問は feasibility のピア協議（6 名全問 A の一致）で確定済み。scope 境界の追加論点は次の 2 件で、いずれも本ステージで確定した。

| 論点 | 確定 | 根拠 |
|---|---|---|
| #579（fable 混入）の合流可否 | 合流しない（バックログへ） | intent-backlog.md の判断欄（3-way 意味論による分離安全性の証明） |
| scope の変更要否（Intake 判定で変更可の条件） | feature を維持 | 実装 + eval + 文書の全部入りで bugfix / refactor に縮退する理由がない |

新規の質問はない。
