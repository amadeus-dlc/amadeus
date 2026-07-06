# Services：260704-v2-parity-completion

## 一覧

| サービス | 責務 | 含むコンポーネント |
|---|---|---|
| ライフサイクル実行サービス | Intent の Birth、ステージ解決、directive 発行、状態遷移、audit 記録、gate 進行 | C-ENG、C-DEF、C-BRIDGE、C-SKILL |
| 検査サービス | stage 完了時の即時検査（sensor）と、workspace 横断の構造検査（validator）、パリティ検査 | C-SEN、C-VAL、C-PAR |
| 配布サービス | skill の source → 昇格 → symlink の配布と、hook / settings の配線 | C-SKILL、C-HOOK、C-RET |
| 契約文書サービス | 規範と契約の定義元（改定を含む） | C-DOC、C-DEF |
| 実証サービス | examples の再生成と、本 Intent 自身の dogfooding | C-EX（+ C-ENG） |
