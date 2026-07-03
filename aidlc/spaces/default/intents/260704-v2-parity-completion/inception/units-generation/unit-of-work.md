# Unit of Work：260704-v2-parity-completion

境界戦略は機能単位（成果のまとまりでコンポーネントを束ねる）、粒度は粗め（8 Unit）である。

## 一覧

| ID | Unit | 責務 | 含むコンポーネント | 対応する要求 |
|---|---|---|---|---|
| U001 | エンジン基盤導入 | 本家 `.claude/` レイアウト（tools、aidlc-common、sensors、hooks）の適応コピーと、settings の aidlc-* 名前空間マージ、既存環境の回帰確認 | C-ENG、C-DEF、C-SEN、C-HOOK | R001、R005、R007 |
| U002 | grilling 結線層 | directive の質問要求を amadeus-grilling プロトコルへ接続するプロンプト層規範と、questions ファイル（`[Answer]:` タグ）への着地 | C-BRIDGE | R002 |
| U003 | skill 置換と追加 | 本家 38 skill の適応コピー（amadeus-* 改名、英語、結線規範の織り込み）と、source → 昇格モデルでの配布 | C-SKILL | R003、R006 |
| U004 | 独自 skill 整理 | 5 skill の削除、amadeus-steering の退役と 0.1 / 2.2 への畳み込み、参照除去 | C-RET | R004 |
| U005 | validator 新契約追従 | 検査規則の v2 成果物契約への差し替え、必須節定義の stage 定義参照化、旧形式 record の検査対象外化 | C-VAL | R006、R007 |
| U006 | パリティ検査機械化 | parity-check スクリプトと parity-map.json（名前写像、除外リスト）の TDD 実装、npm script 化 | C-PAR | R008 |
| U007 | 規範文書改定 | AMADEUS.md、rules、Skill Language Policy、sensor-learn-mapping、backward-compatibility.md の改定と参照整理 | C-DOC | R009、R005、R006 |
| U008 | examples 再生成と dogfooding | 4 snapshot の real provider 再生成、provenance 更新、本 Intent 自身のエンジン駆動完走の実証 | C-EX | R010、R011 |
