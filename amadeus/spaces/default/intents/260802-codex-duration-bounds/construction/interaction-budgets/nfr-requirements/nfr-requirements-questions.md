# NFR Requirements — 質問票（0問様式、unit: interaction-budgets）

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## 質問不要判定

- 判定: 質問0問。[Issue #1999](https://github.com/amadeus-dlc/amadeus/issues/1999) が「追加質問は最大1ラウンド」「8–12+を上限へ」「reviewer既定2回」を根拠付きで要求している。
- 数値裁定: primaryはDepth別にMinimal 2/4、Standard 5/8、Comprehensive 8/12（default/hard cap）。follow-upは1ラウンド、default=hard cap 1。reviewはdefault=hard cap 2。
- 実行裁定: Construction Autonomy Modeは`autonomous`。未解決の事業・規制判断はない。

## 曖昧性分析

- capは質問ファイルの行数ではなく、新しいsemantic interactionの表示／dispatch数を数える。
- material ambiguityは回答により成果物、外部契約、data safetyが実質的に変わる不可逆判断だけとし、複数件は1つのfollow-up batchへ集約する。
- cap到達は承認を自動成立させず、未解決事項を既存approval boundaryへ渡す。
