# Units Generation — Questions

> 上流入力（consumes 全数）: `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`

## Interaction Mode

約5件のUnit分解判断を、どの方法で回答しますか。

- A. Guide me — 質問を順番に対話形式で進める
- B. Grill me — 推奨案と根拠を添えて、一問ずつ深掘りする
- C. I'll edit the file — 質問ファイルを自分で編集する
- D. Chat — 自由に議論し、会話から決定事項を抽出する
- X. Other (please specify)

[Answer]: A — Guide me
[Answered At]: 2026-07-24T04:19:51Z
[Mode]: guided

## Q1. Unit境界戦略

今回の実装Unitを、どの境界で分けますか。

- A. 変更責務と安全契約で分ける。policy/config、state/provenance、GitHub execution、lifecycle integration、distribution/docsを独立Unitにする（推奨: 既存コンポーネント境界に沿い、並行作業時の編集衝突を抑えられる）
- B. ファイル単位で細かく分ける
- C. create、sync、closeの操作単位で分ける
- D. runtime実装とtests/docsの2大Unitだけに分ける
- E. 6ハーネスごとに分ける
- X. Other (please specify)

[Answer]: A — 変更責務と安全契約で分ける
[Answered At]: 2026-07-24T04:20:52Z
[Mode]: guided

## Q2. Unit粒度

Unitの粒度をどうしますか。

- A. 中粒度の5 Unit前後とし、各Unitを独立テスト可能かつ1つの明確な責務にする（推奨）
- B. 粗粒度の2〜3 Unitとし、Unit内の変更範囲を広く許容する
- C. 細粒度の8〜10 Unitとし、個々の変更を最小化する
- D. 単一Unitですべて実装する
- X. Other (please specify)

[Answer]: A — 中粒度の5 Unit前後
[Answered At]: 2026-07-24T04:21:39Z
[Mode]: guided

## Q3. 依存関係と並行性

依存関係をどのように表現しますか。

- A. cycle-freeな直接依存だけをDAGへ記録し、依存しないUnitは並行開発可能として明示する（推奨）
- B. すべてのUnitを直列依存にする
- C. 依存関係は記録せず、実装時に判断する
- D. 循環依存も現行ファイル構造に合わせて許可する
- X. Other (please specify)

[Answer]: A — cycle-freeな直接依存だけをDAGへ記録し、独立Unitを並行開発可能とする
[Answered At]: 2026-07-24T04:22:01Z
[Mode]: guided

## Q4. Unit間の連携契約

Unit間のintegration pointを何で固定しますか。

- A. C0の共有DTO、repository-bound Gateway、state transition、boundary outcomeを明示contractとし、永続形式とfailure unionを契約テストする（推奨）
- B. 実装関数の内部構造を共有し、必要に応じて相互importする
- C. CLIの標準出力だけを契約にする
- D. GitHub Issue本文をUnit間の共有状態にする
- X. Other (please specify)

[Answer]: A — C0共有DTO、repository-bound Gateway、state transition、boundary outcomeを明示contractとする
[Answered At]: 2026-07-24T04:22:31Z
[Mode]: guided

## Q5. 配置・配布モデル

各Unitの成果物をどの配置・配布モデルにしますか。

- A. 単一Amadeus frameworkへ組み込み、core正本から6ハーネスへ生成配布する。Unitは独立deployment serviceにしない（推奨）
- B. Unitごとに独立packageとして公開する
- C. harnessごとに別実装を持つ
- D. GitHub連携だけ外部serviceとして配備する
- X. Other (please specify)

[Answer]: A — 単一Amadeus frameworkへ組み込み、core正本から6ハーネスへ生成配布する
[Answered At]: 2026-07-24T04:23:16Z
[Mode]: guided

## E-OC1 分解計画の確認

5 Unit、cycle-freeな直接依存、`mirror-state-provenance`とGitHub Unitの並行可能性、要件ベースのStory Mapを成果物生成計画として確認する。

[Answer]: E-OC1 — Approve Plan
[Answered At]: 2026-07-24T04:23:46Z
[Mode]: guided

回答間の曖昧語、矛盾、未回答は0件である。Unit間の経済的な実装順序やcritical pathは本ステージでは決定せず、Delivery Planningへ委ねる。

Architecture Review iteration 1を受け、承認済みの「5 Unit」「責務境界」「独立Unitの並行性」を維持したまま、GitHub UnitをC5 Gatewayに限定し、C6 Executorをlifecycle Unitへ移した。これによりstate/provenance UnitとGateway UnitがC0 contractだけを共有して並行可能となり、C6からC3／C4への必須依存はconsumer側Unitへ正しく置かれる。
