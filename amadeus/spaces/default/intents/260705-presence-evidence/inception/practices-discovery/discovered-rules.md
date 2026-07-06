# Discovered Rules：Presence Evidence（260705-presence-evidence）

上流入力: [team-practices.md](team-practices.md)

| ID | 規則 | 実装への含意 |
|---|---|---|
| DR-1 | presence 意味論の変更は #497 判断 8 に触れる契約級 | 採否は人間個別確認（確定済みの auto 例外） |
| DR-2 | エンジン変更は parity-map 例外宣言とセット | 候補 1 採用時の変更ファイル一覧に dev-scripts/data/parity-map.json を含める |
| DR-3 | eval fixture はエンジン実出力を正とする | 相関 eval の audit fixture は実 shard のコピーで構築 |
| DR-4 | audit は追記専用（記録済みイベントを書き換えない） | 相関検査は読み取りのみで実装（org.md 禁止事項と整合） |
