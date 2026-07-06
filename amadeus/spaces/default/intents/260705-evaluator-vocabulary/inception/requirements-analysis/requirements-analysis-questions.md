# Requirements Analysis 質問

Intent: 260705-evaluator-vocabulary（旧 evaluator 語彙の sensors 読み替え）
対象 Issue: [#439](https://github.com/amadeus-dlc/amadeus/issues/439)
回答方式: Maintainer の包括委任（2026-07-05）に基づく推奨案の自己回答。

---

## Q1. 語彙の扱い

- A. Issue の実施候補 1 を採用: evaluator 記述を現行 sensors（required-sections / upstream-coverage / linter / type-check）へ読み替え、validator = 実行時の構造検出、sensors = gate 時の接続性・品質評価で統一する（Issue 推奨）
- B. 実施候補 2: evaluator を sensors の総称ラベルとして再定義して残す
- X. Other

[Answer]: A（自己回答。根拠: Issue 自身が候補 1 を推奨。実体のない語を総称として残すと CONTEXT.md の canonical name 原則と衝突し、#240 close の経緯とも整合しない）
