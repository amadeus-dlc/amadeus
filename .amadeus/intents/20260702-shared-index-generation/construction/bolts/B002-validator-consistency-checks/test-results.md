# テスト結果

## 検証結果

| 種別 | コマンドまたは確認 | 結果 | 証拠 |
|---|---|---|---|
| 検証（RED） | validator 未対応の状態で `npm run test:it:index-generate` の統合ケースが「Index 生成整合カテゴリ行が見つからない」で失敗することを確認 | pass（失敗を確認） | 実行結果（2026-07-02） |
| 検証（GREEN） | `npm run test:it:index-generate`（整合 workspace で fail 0、行改変で fail、行の過不足で fail、マーカー欠落で fail、見出し契約違反はクラッシュせず fail 報告、の 5 ケース） | pass | 実行結果（2026-07-02、exit 0） |
| 型検査 | `npm run typecheck` | pass | 実行結果（2026-07-02） |
| lint | `npm run lint:check` | pass | 実行結果（2026-07-02） |
| 昇格同期 | `bun run dev-scripts/promote-skill.ts amadeus-validator --replace` と `npm run test:it:promote-skill` | pass | 実行結果（2026-07-02） |
| 標準検証（中間状態） | `npm run test:all` は exit 1。fail するカテゴリが「Index 生成整合」だけであることを、実 workspace（22 件）、examples、eval fixture の個別実行で確認 | 意図どおりの中間 RED | 実行結果（2026-07-02）。GREEN 化は B004 の migration で行う |

## 安全性確認

| 観点 | 結果 | 根拠 |
|---|---|---|
| 入力 | 問題なし | 検査は workspace 内の Markdown と JSON の読み取りだけで成立する。見出し契約違反は例外を catch して fail として報告し、validator を異常終了させない。 |
| 権限 | 問題なし | アクセス制御や権限の変更を含まない。 |
| 秘密情報 | 問題なし | 秘密情報や個人情報を扱わない。 |
| 破壊的変更 | 問題なし | validator は読み取り専用であり、ファイルへの書き込みを行わない。既存の checkIntents と checkDiscoveries の列構造検査は変更していない。 |

## CI確認

| 入口 | 結果 | 根拠 |
|---|---|---|
| GitHub Actions（mock）、Cursor Bugbot | 未実行 | PR 未作成のため。PR 作成後に確認する。`test:e2e:ci:mock` は B004 完了後の最終検証で確認する。 |

## 受け入れ証拠

| 要求 | タスク | 証拠 | 要約 |
|---|---|---|---|
| R004 | B002/T002 | 統合ケース 5 件の GREEN | 行の過不足、内容不一致、マーカー欠落が fail になり、見出し契約違反が fail として報告されることを確認した。 |
| R005 | B002/T003 | promote 実行結果と `test:it:promote-skill` の pass | source と昇格先が同期された。 |
| R007 | B002/T001 | RED の記録と GREEN の pass | 失敗する検証を先行追加し、実装後に GREEN を確認した。 |

## 補足

- 検査カテゴリ名は「Index 生成整合」。カテゴリ規則は条件文字列の先勝ちマッチのため、既存の Discovery 規則より前（配列先頭）に配置した。
- 不一致の報告は最初に一致しない行の行番号と実際、期待の内容を示す形式にした。マーカー欠落は 1 行目の不一致として検出される。
- `dev-scripts/evals/amadeus-validator/`、`amadeus-validator-domain/`、`state-scaffold/` の fixture workspace も未 migration のため fail 化した。これらの fixture 更新は B004 の migration 範囲に追加する。
