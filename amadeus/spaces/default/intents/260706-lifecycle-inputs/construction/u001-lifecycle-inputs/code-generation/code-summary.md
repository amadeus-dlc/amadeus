# Code Summary — u001-lifecycle-inputs（260706-lifecycle-inputs）

上流入力: [code-generation-plan.md](code-generation-plan.md)、[measurement-correction-log.md](measurement-correction-log.md)

## 変更一覧（docs/amadeus/lifecycle/ の 6 文書のみ = BR-7）

| ファイル | 変更 |
|---|---|
| overview.md | 「ステージ契約の I/O 記法」節を新設（B001）。GD009 残存 6 箇所を補正（互換方針 1、配置ツリー 2、説明段落 1、v2 差分表 2 行削除） |
| ideation.md | Inputs のモジュールファイル行 ×5 → `intent-statement.md`。Stage 1.1 の Outputs 行削除 + Purpose / Notes 散文補正。Phase Overview へ共通入力段落 |
| inception.md | モジュールファイル行 ×1 → `intent-statement.md`。`brownfield のみ` ×4 → `条件付き（brownfield）`。2.5 へ qualifier 付与。2.7 の intent-backlog 行削除（根拠なし）。Phase Overview へ共通入力段落 |
| construction.md | `brownfield のみ` ×1 → `条件付き（brownfield）`。3.3 へ qualifier 付与。3.5 の非標準値 `実行した場合` ×2 → `任意`。Phase Overview へ共通入力段落 |
| scopes.md | 冒頭へ縮退形 `## Inputs` 節（適用判断）。縮退時の入力代替表の GD009 残存 1 箇所補正 |
| state.md | 冒頭へ縮退形 `## Inputs` 節（適用判断）。「索引」段落の GD009 残存 1 箇所補正（§12a 反復 1 検出） |

## FR カバレッジ

| Requirement | 状態 |
|---|---|
| FR-1.1〜1.3（記法定義、エンジン対応、言語非依存） | 反映済み（B001。qualifier 代表書式はステージ名ベース = §12a functional-design 観察の反映） |
| FR-2.1〜2.4（22 ステージの記法統一・実測補正・最小補正境界） | 反映済み（B002。per-stage 判定表と維持判断を実測・補正記録に記録） |
| FR-3.1〜3.2（scopes / state の適用可否と記録） | 反映済み（B003。両文書とも縮退形で適用） |
| FR-4.1（validator + test:all） | build-and-test で実行・記録予定 |
| FR-4.2（実測裏付け） | 実測・補正記録に frontmatter 抜粋（22 ステージ全文）と補正根拠を保存済み |

## 発見事項

- GD009 残存の全数は、requirements の前提実測 15 箇所、B001 追加検出 2 箇所（overview.md の intents.md 索引言及）、§12a code-generation 反復 1 検出 1 箇所（state.md の intents.md / IndexGenerate 言及）の計 18 箇所であり、全数補正した。初回の「17 箇所全数補正」宣言は state.md の見落としを含む不正確な集計だったため訂正した（検出漏れの原因 = 横断 grep のキーワード不足。実測・補正記録の訂正節を参照）。
- CONTEXT.md（169〜170 行）に「目標プロファイルは Intent のモジュールファイルに置く」という GD009 矛盾が残る。BR-7（変更対象は lifecycle 6 文書のみ）によりスコープ外とし、Issue 起案として leader へ申し送る（§12a 反復 1 Finding 2）。
- frontmatter の `conditional_on` は brownfield 条件のみで使われており、B001 記法の 3 値 + qualifier 設計と整合した。
- エンジン定義に根拠のない入力記載は 1 件（2.7 の intent-backlog）だけだった。
