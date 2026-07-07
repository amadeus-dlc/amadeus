# Feasibility 質問票 — インストーラの実装

> ステージ: feasibility (Ideation) / 深度: Standard
> 上流入力: `../intent-capture/intent-statement.md`、`../market-research/competitive-analysis.md`、`../market-research/build-vs-buy.md`
> 事実確認済み: リポジトリは `github.com/amadeus-dlc/amadeus`(package.json 内の awslabs URL は旧記載)。`.github/workflows/` は存在せず、npm 公開の自動化基盤は現状ない。

## Q1. npm パッケージ名とスコープはどうしますか?

`bunx` ワンライナー(market-research で確定)には npm 上のパッケージ名確保が前提です。

- A. `amadeus-dlc`(組織名と同名の無スコープパッケージ)
- B. `@amadeus-dlc/installer` または `@amadeus-dlc/cli`(組織スコープ付き)
- C. `cc-amadeus` など既存カテゴリ(cc-sdd 等)に寄せた命名
- D. 未定 — feasibility では「取得可能な候補を挙げ、公開権限を確認する」タスクとして持ち越す
- X. Other (please specify)

[Answer]: X — `@amadeus-dlc/setup` に決定(議論の結果。CLI=汎用コマンドラインツールの慣例名という説明を経て、導入意図が明確な setup を選択。bin コマンド名はパッケージ名と独立に設定可能)(2026-07-07, Mode: guided)

## Q2. インストーラ CLI のランタイム前提はどうしますか?

フレームワーク本体は bun 必須です。ただし npm 公開 CLI を `npx`(Node)で実行するには TypeScript のビルド(JS化)が必要で、`bunx` なら TS を直接実行できます。

- A. bun 必須で統一 — `bunx` のみ公式サポート(フレームワークが bun 前提なので導入時点で bun があるはず)
- B. Node でも動くようビルドして公開 — `npx` と `bunx` の両対応(導入障壁を最小化)
- C. Node 単体で完結(bun 不要)— ただしフレームワーク実行には結局 bun が要るため非推奨
- X. Other (please specify)

[Answer]: B — npx/bunx 両対応(ビルドして公開)(2026-07-07, Mode: guided)

## Q3. npm への公開フローはどう整備しますか?(現状 CI ワークフローなし)

- A. 手動 publish(メンテナがローカルから `npm publish`)で開始し、自動化は後回し
- B. GitHub Actions のリリースワークフローを同時に整備(タグ push で publish)
- C. 既存のバージョンタグ運用に統合し、リリース準備サイクルの一部として publish 手順を team.md に明文化
- X. Other (please specify)

[Answer]: C — 既存のバージョンタグ運用に統合し、publish 手順を明文化(2026-07-07, Mode: guided)

## Q4. インストーラが配布物(dist/ の中身)を取得する経路は?

- A. npm パッケージに全ハーネスの dist/ を同梱(オフライン完結、パッケージサイズ増)
- B. GitHub からタグ指定で取得(パッケージは軽いが、実行時にネットワーク必須)
- C. A を基本に、`--from-repo` 等で B もオプション対応
- X. Other (please specify)

[Answer]: B — GitHub からタグ指定で取得(2026-07-07, Mode: guided)

## Q5. タイムライン・優先度の制約はありますか?

- A. 特になし — 品質優先で通常のリリースサイクルに乗せる
- B. 次のマイナーカット(例 v0.7.0)に間に合わせたい
- C. 特定の外部イベント/発表に合わせたい(具体的に)
- X. Other (please specify)

[Answer]: A — 特になし、品質優先で通常のリリースサイクルに乗せる(2026-07-07, Mode: guided)

## Q6. コンプライアンス上の要求はありますか?(該当するものをすべて選択)

- A. ライセンス表記の継承(MIT-0 をパッケージに正しく含める)のみで十分
- B. テレメトリ/計測を一切入れない(プライバシー配慮)
- C. サプライチェーン対策 — npm provenance(署名付き公開)を有効化
- D. 特になし
- X. Other (please specify)

[Answer]: A(訂正付き)— ライセンス表記の継承のみで十分。ただしライセンスは MIT-0 ではなく MIT(LICENSE-MIT + LICENSE-APACHE のデュアル)。package.json の "license": "MIT-0" は既存の不整合として Issue 記録(2026-07-07, Mode: guided)
