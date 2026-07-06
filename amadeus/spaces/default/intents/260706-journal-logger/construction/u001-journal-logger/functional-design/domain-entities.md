# Domain Entities — u001-journal-logger

## 上流入力

[requirements.md](../../../inception/requirements-analysis/requirements.md)、[unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)。

## 実体

| 実体 | 位置 | 役割 |
|---|---|---|
| 契約 doc | journal/README.md | 形式・規律・参照方向の正 |
| 日次エントリ | journal/<YYMMDD>.md | 時系列の生ログ（追記専用、昇格スタンプ欄） |
| 手順書 / チェックリスト | knowledge/journal-logger-*.md | logger の起動・運用・検証（人間 / leader が実行）。journal/README.md からリンク |
| checkJournal | AmadeusValidator.ts::checkSpaceLayers()（正準 = skills 側） | optional 扱いの最小 3 条件検査（存在時のみ） |
| journal 検査ケース | dev-scripts/evals/amadeus-validator/（既存 eval へ追加） | 実データ fixture + 変異 3 種で検出力を保証（RED 確認つき） |
| journal-logger（ロール） | agmsg メンバー（未 spawn） | 受信 → 整形追記 → ack。本 Intent では prompt と手順書のみ納品 |
