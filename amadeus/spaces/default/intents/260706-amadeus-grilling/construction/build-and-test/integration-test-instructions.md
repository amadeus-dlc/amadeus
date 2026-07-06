# Integration Test Instructions — Amadeus Grilling 統合

## 決定的検証(自動)

- デフォルトプロファイル: `bash tests/run-tests.sh`(smoke + unit + integration)— 既知ベースライン(t11/t38/t65/t66/t140/t174/t19/t130)以外の失敗がないこと
- リリース前: `bash tests/run-tests.sh --release`(e2e 込み)

## プロトコル遵守の統合確認(LLM 実行時挙動 — 手動/ドッグフーディング)

決定的テストの対象外(NFR-5 の代替について code-generation の diary 参照)。次回以降のワークフローで確認する:

1. ゲート付きステージのモード選択に「Grill me」が表示される(AC-1.1)
2. Grill me 選択→1問ずつ・推奨つき対話→ [Answer]: 書き戻し→1問ごと監査ログ(AC-2.x)
3. 「done」即時終了と合意サマリ確認(AC-3.2, AC-4.1)
4. `/amadeus-grilling <対象>` のワークフロー外実行で state/監査が不変(AC-5.2)
