# CI Pipeline Memory

## Interpretations

- 2026-07-12T12:42:00Z — 質問は既存workflowと承認済み上流成果から回答可能なため確定回答を併記した; 新規provider/branch/registryの選択はない。

## Deviations

- 2026-07-12T12:42:00Z — 新しいworkflow/buildspecを生成せず既存 `.github/workflows/ci.yml` をCI正本として文書化した; code-generationで実装と検証が完了しているため。

## Tradeoffs

- 2026-07-12T12:42:00Z — snapshot jobをPR merge-blocking集約から外しつつ、main上の失敗は赤くする; PR feedbackを遅延させず観測データの誤りを黙認しないため。

## Open questions

- 2026-07-12T12:42:00Z — landing後のmain workflow、bot author、実queueは実GitHub Actionsで確認する。ループ非誘発はrepository `GITHUB_TOKEN`の公式仕様で確定し、token方式変更時のみ再評価する。
