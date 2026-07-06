# Memory: intent-capture

## Interpretations

- 「完全準拠」を、成果物、skill 一覧、実行アーキテクチャの 3 方向すべての一致（双方向パリティ）と解釈した。
- パリティ検査は、aidlc-* から amadeus-* への名前写像と、意図的除外リストを前提にした差分ゼロ判定と解釈した。
- Issue #393 の sensor 不採用判断は、同文書の再検討条件（hook 実行基盤の採用確定）が C 柱で成立するため、上書き対象と解釈した。

## Deviations

- Q4 で「コピー分は aidlc-*」を推奨として提示したが、人間の指示で「すべて amadeus-*」に確定した。推奨と逆の確定である。
- 質問数は Depth: Standard の目安（5〜8 問）に対し 7 問で収めたが、うち 2 問（Q3、Q4）は人間の自発的指示で回答が推奨の枠外へ拡張された。

## Tradeoffs

- amadeus-* への改名は、ブランドと既存名の一貫性を得る代わりに、本家追従時の diff とパリティ検査の写像維持コストを受け入れる。
- 完了済み 2 record の現状維持は、検査の一元性より、完了済み成果物を書き換えない方針を優先する。
- sensor と validator の併用は、検査の穴を塞ぐ代わりに、必須節定義の共有という結合点を管理する必要がある。

## Open questions

- 3.6 の v2 実ファイル名（`test-results.md` か `build-test-results.md` か）。R005 と `docs/ai-dlc/aidlc-v2-generated-files.md` が矛盾しており、上流の stage 定義で再確認が必要である。
- `dist/claude/` 変種の内部構造（エンジンのパス、`.codex/tools/` 相当の位置、hook 構成）の精査が未実施である。
- amadeus-grilling とエンジン directive の結線点の具体設計（questions ファイル生成とゲート提示のどこに割り込むか）。
- パリティ検査の基準 commit の固定方法（上流 v2 branch は動くため、追従の周期と手順）。
