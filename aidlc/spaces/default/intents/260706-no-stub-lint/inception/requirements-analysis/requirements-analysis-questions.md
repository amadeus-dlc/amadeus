# Requirements Analysis Questions：260706-no-stub-lint

回答方法: 各質問の `[Answer]:` に選択肢の記号を記入する。

## Q1: 確定コメントの「eslint 設定の拡張（従）」の扱い

実測の結果、リポジトリに eslint は未導入である（`.eslintrc*` / `eslint.config.*` なし、devDependencies は `@types/bun` + `typescript` のみ、`lint:check` は独自の lints/ ハーネス）。linter sensor（amadeus-linter.md）は「eslint をラップする」と記述するが、ラップ対象が未導入のため実質 no-op と推定される。

A. 本 Intent は lints/ rule（主）のみ実装し、eslint 拡張は見送る。経緯を decision と PR 説明に記録し、linter sensor の no-op 問題は後続 Issue 候補として leader へ起案内容を送付する。
B. eslint を新規導入して拡張も実施する（依存方針の例外が必要）。
C. その他。

[Answer]: A（ピア協議 2026-07-06T01:13Z、engineer2・leader・engineer4 の 3 名一致で成立。leader は確定コメントの前提誤り = linter sensor の記述から eslint 導入済みと推定した = を自認。leader 条件 2 点（経緯の記録、後続 Issue 起案内容の送付）は実施済み。engineer2 補足: eslint 新規導入はオフライン検証前提（#451 FR-2.2、#441）も崩すため「従」の範囲を超える。engineer4 は独立実測で裏取り）

## Q2: 検出の判定単位（既存 62 件の文字列ヒットとの整合）

事前棚卸しの実測（初回は scan scope を誤り skills/ と昇格先を見落とした。reviewer 指摘を受け、既存 rule の defaultInclude = .agents/skills / amadeus-contracts / dev-scripts / lints / skills で再実測済み）: 素朴な部分文字列検出（legacy/shim/deprecated）は既存 TS コードに多数ヒットし main が fail する。宣言シンボル名レベルでは 9 件（validator 本体の 2 コピー 6 件 + evals 3 件）、as-alias re-export は 0 件、「後方互換」コメントは 14 件（validator 系の実運用互換ロジック説明 10 件 + evals 4 件）、not implemented throw / 空関数 TODO / 常時成功テストは 0 件。合計 23 件で、いずれも宣言済み互換対象の実装・検査コード。

A. 検出は「宣言シンボル名・export alias・コメント内の keyword『後方互換』」の構造的パターンに絞り、既存挙動を説明するだけの一般コメント（英語系の語を含む散文）は対象にしない。既存ヒット（再実測で 23 件 = 宣言シンボル 9 + 後方互換コメント 14。いずれも宣言済み互換対象を実装・検査する validator 本体と eval）は docs/backward-compatibility.md へ宣言して pass にする。
B. 素朴な部分文字列検出とし、既存 62 件を全部宣言する。
C. diff ベース検出（新規追加行だけを対象）にする。

[Answer]: A（自己判断。team.md 質問プロトコルの小さな構造判断。理由: B は許可リストが数十件で運用崩壊し、説明コメントの禁止は Issue の意図（新規の互換層・stub の混入防止）を超える。C は lints/ ハーネスの全木検査方式と合わず、main 上での基準 diff が定義できない。A は「宣言なき検出 = fail、宣言あり = pass」の 2 値判定を保ちながら main の pass を小さな宣言（23 件 = 実体はシンボル 3 種 + コメント 7 行が 2 コピー等で展開されたもの。O-3 のパターン宣言方式なら宣言数はさらに圧縮できる）で達成できる。コメントレベルの検出 keyword は「後方互換」1 語に限定し、legacy 等はシンボル・alias レベルのみとする境界を FR-1.2 に明文化した。検出パターンの具体は functional-design で確定し、gate の人間承認で最終確定）
