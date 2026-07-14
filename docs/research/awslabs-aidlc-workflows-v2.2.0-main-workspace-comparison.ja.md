# Upstream AI-DLC `v2.2.0`と`main`のワークスペース比較

> 言語: [English](awslabs-aidlc-workflows-v2.2.0-main-workspace-comparison.md) | **日本語**

この文書は、`awslabs/aidlc-workflows`リポジトリの`v2.2.0`タグと、
2026-07-14時点で確認したデフォルトブランチ`main`のHEADを比較した調査結果である。
対象は、リポジトリ構成、プロジェクトへ配置するファイル、ワークフローが生成する
パスとファイル名に絞った。

## 結論: 2つのrefは前後関係ではなく、分岐した別系統である

`main`は`v2.2.0`の後続コミットではない。両者は
`b19c81928bdf1b8d13856f462fcf2ede1720b4cb`から分岐している。
`v2.2.0`側にだけ存在するコミットは34件、調査時点の`main`側にだけ存在する
コミットは9件だった。また、`main`ツリーのルールセットは`1.0.1`を名乗る一方、
比較対象のタグは`v2.2.0`である。

したがって、ワークスペースの差はディレクトリ名を置き換えるだけでは説明できない。
2つのrefは異なる実装を配布し、永続化の単位も異なる。

- `v2.2.0`は実行エンジンと、中立な`aidlc/`ワークスペースを配置する。
  チームをspace、ワークフローの実行をintentのレコードディレクトリで分離する。
- 調査時点の`main`はプロンプト／ルールファイルを配置し、プロジェクト直下の
  単一の`aidlc-docs/`へ成果物を書き込む。

`main`のREADMEにある「2.0 (Preview)」という表示は、`main`に`v2.2.0`の実装が
含まれることを意味しない。この表示は別の`v2`ブランチを明示的に案内している。
一方、`main`に含まれる`aidlc-rules/VERSION`は`1.0.1`のままである。

どちらの構成も扱う連携機能では、パスを解決する前に系統を判定しなければならない。
`main`を`v2.2.0`のアップグレード版とみなし、ルートだけを改名すると、intent、監査、
ステージの意味が失われる。

## 比較したref

| ref | コミット | コミット日時 | バージョンの根拠 |
| --- | --- | --- | --- |
| [`v2.2.0`](https://github.com/awslabs/aidlc-workflows/tree/v2.2.0) | [`eae912e09c42627fe51a0f1c26e0d2fc2d7e3bd4`](https://github.com/awslabs/aidlc-workflows/commit/eae912e09c42627fe51a0f1c26e0d2fc2d7e3bd4) | 2026-07-04T14:33:32+10:00 | 注釈付き`v2.2.0`タグ |
| 調査時点の`main` HEAD | [`d34bb7adfb4c58aa59bbb46494957f6169121b2b`](https://github.com/awslabs/aidlc-workflows/commit/d34bb7adfb4c58aa59bbb46494957f6169121b2b) | 2026-07-07T11:57:00-04:00 | `aidlc-rules/VERSION`の内容が`1.0.1` |

ツリー間の正確な差分は、SHAを固定した
[GitHubの比較画面](https://github.com/awslabs/aidlc-workflows/compare/eae912e09c42627fe51a0f1c26e0d2fc2d7e3bd4...d34bb7adfb4c58aa59bbb46494957f6169121b2b)
で確認できる。主な根拠資料は、
[`v2.2.0`の成果物リファレンス](https://github.com/awslabs/aidlc-workflows/blob/v2.2.0/docs/guide/14-artifacts-reference.md)、
[`v2.2.0`のspaces／intentsガイド](https://github.com/awslabs/aidlc-workflows/blob/v2.2.0/docs/guide/03-spaces-and-intents.md)、
および[SHAを固定した`main`の生成ドキュメントリファレンス](https://github.com/awslabs/aidlc-workflows/blob/d34bb7adfb4c58aa59bbb46494957f6169121b2b/docs/GENERATED_DOCS_REFERENCE.md)
である。

## ワークスペースのルートと永続化モデルが異なる

| 観点 | `v2.2.0` | 調査時点の`main` HEAD |
| --- | --- | --- |
| 生成物のルート | `aidlc/` | `aidlc-docs/` |
| 実行の分離単位 | intentごとに1つのレコード | プロジェクト単位の成果物ツリー1つ |
| レコードのパス | `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/` | `aidlc-docs/` |
| チームの分離 | `aidlc/spaces/<space>/` | 対応する仕組みの記載なし |
| intentレジストリ | `intents/intents.json` | 対応する仕組みの記載なし |
| 現在位置のカーソル | `aidlc/active-space`と`intents/active-intent` | 対応する仕組みの記載なし |
| 状態 | `<record>/aidlc-state.md` | `aidlc-docs/aidlc-state.md` |
| 監査 | `<record>/audit/<host>-<clone>.md`のシャード | `aidlc-docs/audit.md` |
| チームの開発手法 | `aidlc/spaces/<space>/memory/` | ハーネスのルールファイルとルール詳細ディレクトリ |
| チーム知識 | `aidlc/spaces/<space>/knowledge/` | 対応する仕組みの記載なし |
| コード知識 | `aidlc/spaces/<space>/codekb/<repo>/` | `aidlc-docs/inception/`配下のReverse Engineering成果物 |
| ランタイムの投影 | `<record>/runtime-graph.json` | 対応する仕組みの記載なし |
| ステージの日誌 | 実行した各ステージに`memory.md`を併置 | 対応する仕組みの記載なし |
| フェーズ名 | Initialization、Ideation、Inception、Construction、Operation | Inception、Construction、Operations |
| アプリケーションコード | レコード外のワークスペース／コードリポジトリ直下 | `aidlc-docs/`外のワークスペース直下 |

概略のツリーは次のようになる。

```text
# v2.2.0
<workspace>/
├── .claude/ | .kiro/ | .codex/       # 選択したハーネスの実行エンジン
├── aidlc/
│   ├── active-space
│   └── spaces/<space>/
│       ├── memory/
│       ├── knowledge/
│       ├── codekb/<repo>/
│       └── intents/
│           ├── active-intent
│           ├── intents.json
│           └── <YYMMDD>-<label>/      # intentごとのレコード
│               ├── aidlc-state.md
│               ├── audit/
│               └── <phase>/<stage>/
└── <application code>
```

```text
# 調査時点のmain HEAD
<workspace>/
├── <harness rule file>
├── .aidlc-rule-details/               # KiroとAmazon Qではパスが異なる
├── aidlc-docs/
│   ├── aidlc-state.md
│   ├── audit.md
│   ├── inception/
│   ├── construction/
│   └── operations/
└── <application code>
```

## リポジトリ内とインストール先のパスも異なる

リポジトリ内のソースツリーには、単純な改名関係がない。

| 領域 | `v2.2.0` | 調査時点の`main` HEAD |
| --- | --- | --- |
| 手書きの実装 | `core/` | `aidlc-rules/` |
| ハーネスアダプター | `harness/<harness>/` | 各ハーネス固有の指示ファイル置き場へルールをコピー |
| 生成済み配布物 | `dist/<harness>/` | `dist/`ツリーなし |
| ランタイム実装 | Bunで動くTypeScriptのツールとフック | コーディングエージェントが解釈するMarkdownルール |
| 利用者向け資料 | `docs/guide/`、`docs/harness-engineering/`、`docs/reference/` | `docs/GENERATED_DOCS_REFERENCE.md`とルール詳細ファイル |

両方のrefが対応するハーネスについて、プロジェクトへの配置先は次のように変わる。
根拠となるインストール手順は、[`v2.2.0`のREADME](https://github.com/awslabs/aidlc-workflows/blob/v2.2.0/README.md)
と[SHAを固定した`main`のREADME](https://github.com/awslabs/aidlc-workflows/blob/d34bb7adfb4c58aa59bbb46494957f6169121b2b/README.md)
にある。

| ハーネス | `v2.2.0`で配置するファイル | 調査時点の`main`で配置するファイル |
| --- | --- | --- |
| Kiro | `.kiro/`、`AGENTS.md`、同階層の`aidlc/` | `.kiro/steering/aws-aidlc-rules/`と`.kiro/aws-aidlc-rule-details/` |
| Claude Code | `.claude/`と同階層の`aidlc/` | `CLAUDE.md`または`.claude/CLAUDE.md`と`.aidlc-rule-details/` |
| Codex | `.codex/`、`.agents/`、`AGENTS.md`、同階層の`aidlc/` | `AGENTS.md`と`.aidlc-rule-details/` |

調査時点の`main`は、このほかにAmazon Q、Cursor、Cline、GitHub Copilot向けの
ルール配置も説明している。これらに直接対応する`v2.2.0`の配布物はない。

## 成果物のパスとファイル名の対応

以下の`<record>`は、`v2.2.0`における
`aidlc/spaces/<space>/intents/<YYMMDD>-<label>`を表す。

| 成果物または観点 | `v2.2.0` | 調査時点の`main` HEAD | 変更の種類 |
| --- | --- | --- | --- |
| ワークフロー状態 | `<record>/aidlc-state.md` | `aidlc-docs/aidlc-state.md` | ファイル名は同じだが、ルートと個数が異なる |
| 監査証跡 | `<record>/audit/<host>-<clone>.md` | `aidlc-docs/audit.md` | clone別シャードのディレクトリから単一ファイルへ変更 |
| 要求 | `<record>/inception/requirements-analysis/requirements.md` | `aidlc-docs/inception/requirements/requirements.md` | ステージディレクトリを改名 |
| 要求の質問 | `<record>/inception/requirements-analysis/requirements-analysis-questions.md` | `aidlc-docs/inception/requirements/requirement-verification-questions.md` | ディレクトリとファイル名を改名 |
| ユーザーストーリー | `<record>/inception/user-stories/{stories,personas}.md` | `aidlc-docs/inception/user-stories/{stories,personas}.md` | ルートを変更、ファイル名は維持 |
| アプリケーション設計 | `<record>/inception/application-design/` | `aidlc-docs/inception/application-design/` | ルートを変更、ファイル集合は異なる |
| Unit | `<record>/inception/units-generation/{unit-of-work,unit-of-work-dependency,unit-of-work-story-map}.md` | 同じ3ファイルを`aidlc-docs/inception/application-design/`へ配置 | UnitsディレクトリをApplication Designへ統合 |
| Constructionの計画 | `<record>/construction/<unit>/code-generation/code-generation-plan.md`のように各ステージへ併置 | `aidlc-docs/construction/plans/`へ集約し、通常はファイル名に`{unit-name}-`を付与 | ディレクトリと命名規則を変更 |
| コード生成の要約 | `<record>/construction/<unit>/code-generation/code-summary.md` | `aidlc-docs/construction/<unit>/code/*.md` | ステージディレクトリを改名し、ファイル名はモデル依存に変更 |
| 機能設計 | `<record>/construction/<unit>/functional-design/` | `aidlc-docs/construction/<unit>/functional-design/` | ルートを変更、一部のファイル名は共通 |
| ビルドとテスト | `<record>/construction/build-and-test/` | `aidlc-docs/construction/build-and-test/` | ルートを変更、記載されたファイル集合は異なる |
| Operation成果物 | `<record>/operation/<stage>/...` | `aidlc-docs/operations/`はプレースホルダーとして記載 | 単数形から複数形へ変更、1対1の成果物契約なし |
| フェーズ検証 | `<record>/verification/phase-check-<phase>.md` | 対応する仕組みの記載なし | `v2.2.0`のみ |
| ステージごとの質問 | `{stage-name}-questions.md`をステージへ併置 | 固有名の計画ファイル／質問ファイルへ記録 | 規約を変更 |
| ステージごとのメモリ | `memory.md`をステージへ併置 | 対応する仕組みの記載なし | `v2.2.0`のみ |

同じファイル名でも、格納モデルが変わったため意味が異なる場合がある。特に
`aidlc-state.md`は、`v2.2.0`ではintentごと、調査時点の`main`では
プロジェクト全体で1つであり、単純な移動として扱えない。

### Reverse Engineeringは`v2.2.0`内でも記載が一致していない

`v2.2.0`の成果物リファレンスは、Reverse Engineeringのファイルを
`<record>/inception/reverse-engineering/`配下に描いている。一方、実行される
ステージ定義と下流の利用側は、9つのファイルを
`aidlc/spaces/<space>/codekb/<repo>/`で解決する。運用時のパス解決では、生成側と
利用側のパスを規定する[ステージ定義](https://github.com/awslabs/aidlc-workflows/blob/v2.2.0/core/aidlc-common/stages/inception/reverse-engineering.md)
を優先するのが妥当である。

調査時点の`main`は、9つのファイルを`aidlc-docs/inception/reverse-engineering/`へ
書き込む点で一貫している。根拠は
[Reverse Engineeringルール](https://github.com/awslabs/aidlc-workflows/blob/d34bb7adfb4c58aa59bbb46494957f6169121b2b/aidlc-rules/aws-aidlc-rule-details/inception/reverse-engineering.md)
にある。

## 互換性への影響

以下は比較結果から導いた連携上の推奨事項であり、upstreamが提供する移行手順ではない。

1. 成果物を読む前に、`aidlc/spaces/`と`aidlc-docs/`のどちらが存在するかを判定する。
2. `v2.2.0`のintentディレクトリは、独立したレコードとして保持する。単一の
   `aidlc-docs/`へ平坦化すると、ファイル名が衝突し、intentの識別情報も失われる。
3. `v2.2.0`では`audit/*.md`の全シャードを読み、調査時点の`main`では
   `audit.md`だけを読む。
4. 自動処理のglobを、`requirements-analysis/`と`requirements/`、
   `operation/`と`operations/`、ステージ併置と計画ファイル集約の違いに合わせる。
5. 明示的な優先順位を決めずに、2つのルールセットを同じプロジェクトへ導入しない。
   完全な実行エンジンの指示とプロンプト中心のルールが同時に起動すると、互換性のない
   ワークスペースを生成するおそれがある。

比較したい対象が「`v2.2.0`と`v2`ブランチの最新コミット」であれば、別の比較が必要になる。
ここで調べたデフォルトブランチ`main`は、`v2.2.0`の後続ではない。
