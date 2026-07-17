# Interaction Spec — eoc1-gate-check

## 上流入力(consumes 全数)

`../requirements-analysis/requirements.md`、`../user-stories/stories.md`、mockups.md、`../../ideation/rough-mockups/wireframes.md`、`../../ideation/rough-mockups/user-flow.md`。

## 是正インタラクション(M-1/M-2 拒否後)

1. conductor はエラー文言の指示どおり questions 冒頭へ E-OC1 証跡(裁定 E-code or 承認 ts)を記載、または [Answer] 記入を裁定待ち文言へ差し戻す
2. 再 gate-start → M-3 通過
3. 検査は状態を変更しないため、拒否→是正→再実行のループに副作用なし(冪等)
