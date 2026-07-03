# Component Dependency：260704-v2-parity-completion

## 依存関係

| 依存元 | 依存先 | 理由 |
|---|---|---|
| C-DEF | C-ENG | stage 定義はエンジンのスキーマ（frontmatter 解析）に従う。配置も `.claude/tools/` と `.claude/aidlc-common/` の兄弟関係が必須（エンジンは import.meta 相対でパス解決する） |
| C-SEN | C-ENG、C-DEF | sensor はエンジンのツールと hook で発火し、検査対象は stage 定義の宣言に従う |
| C-HOOK | C-ENG | hook はエンジンのツールを呼ぶ |
| C-BRIDGE | C-ENG、C-DEF | directive の質問要求と questions ファイル契約（真実源、`[Answer]:` タグ）を前提にする |
| C-SKILL | C-ENG、C-BRIDGE | skill はエンジンを呼ぶ薄いラッパーであり、質問文言は C-BRIDGE の規範に従う |
| C-RET | C-SKILL | 置換後でなければ削除できない（入口の空白を作らない） |
| C-VAL | C-DEF、C-DOC | 必須節定義は stage 定義から読み、旧形式除外は backward-compatibility.md の対象一覧に従う |
| C-PAR | C-SKILL、C-ENG、C-HOOK | 配置が確定した後でなければ突き合わせできない |
| C-DOC | C-RET、C-SKILL | 削除と改名の結果を契約文書へ反映する（backward-compatibility.md の先行記録だけは実装前に行う） |
| C-EX | C-SKILL、C-ENG、C-VAL | examples は新契約の skill 実行結果であり、validator pass が成立条件 |
