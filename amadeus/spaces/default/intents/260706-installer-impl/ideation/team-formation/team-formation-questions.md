# Team Formation 質問票 — インストーラの実装

> ステージ: team-formation (Ideation) / 深度: Standard(文脈により質問数を圧縮)
> 上流入力: `../scope-definition/scope-document.md`、`../scope-definition/intent-backlog.md`、`../feasibility/feasibility-assessment.md`
> 前提: このリポジトリは AI-DLC でのドッグフーディング開発であり、実装は AI エージェント(Construction の Bolt)+ 人間のレビュー・承認で進む想定。

## Q1. 人間側の体制はどれに該当しますか?

- A. ソロメンテナ(あなた1人がレビュー・承認・マージのすべてを担う)
- B. 少人数チーム(2〜3人でレビューを分担)
- C. 複数チーム(役割分担された組織体制)
- X. Other (please specify)

[Answer]: A — ソロメンテナ(2026-07-07, Mode: guided)

## Q2. npm 公開の実行者(公開権限の保有者)は誰になりますか?

feasibility R1(組織スコープ確保)と直結します。

- A. あなた自身(メンテナが npm アカウント・組織スコープを保有/取得する)
- B. 別のメンバー・組織管理者(調整が必要)
- C. 未定 — 公開前タスクとして持ち越す
- X. Other (please specify)

[Answer]: A — あなた自身(メンテナが npm アカウント・組織スコープを保有/取得)(2026-07-07, Mode: guided)

## Q3. Construction の実行体制(Bolt の進め方)に希望はありますか?

- A. デフォルトに従う — walking skeleton は必ずゲート、以降は ladder プロンプトで選択(org.md の慣行)
- B. すべての Bolt をゲートしたい(全数レビュー)
- C. walking skeleton 後は自律実行を希望(レビューは build-and-test でまとめて)
- X. Other (please specify)

[Answer]: A — デフォルトに従う(walking skeleton はゲート、以降 ladder プロンプトで選択)(2026-07-07, Mode: guided)
