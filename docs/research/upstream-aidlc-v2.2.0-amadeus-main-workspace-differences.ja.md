# 本家AI-DLC v2.2.0とAmadeus `main`のワークスペース差分

> 言語: [English](upstream-aidlc-v2.2.0-amadeus-main-workspace-differences.md) | **日本語**

この文書では、`awslabs/aidlc-workflows` v2.2.0と、Amadeusリポジトリの
`main` HEADについて、ワークスペースのパスとファイル名を比較する。生成される
ワークスペースを決めるソースコードとインストール先の違いも対象に含める。

## 比較対象

| リポジトリ | リビジョン | コミット | コミット日時 |
| --- | --- | --- | --- |
| [`awslabs/aidlc-workflows`](https://github.com/awslabs/aidlc-workflows) | [`v2.2.0`](https://github.com/awslabs/aidlc-workflows/tree/v2.2.0) | [`eae912e09c42627fe51a0f1c26e0d2fc2d7e3bd4`](https://github.com/awslabs/aidlc-workflows/commit/eae912e09c42627fe51a0f1c26e0d2fc2d7e3bd4) | 2026-07-04T14:33:32+10:00 |
| [`amadeus-dlc/amadeus`](https://github.com/amadeus-dlc/amadeus) | この文書で使用する`main` HEAD | [`279e027eb71d7aa0a681a44fa14a0d5ee78f0082`](https://github.com/amadeus-dlc/amadeus/commit/279e027eb71d7aa0a681a44fa14a0d5ee78f0082) | 2026-07-13T23:58:16Z |

比較対象は別々のリポジトリに属するため、両者を直接結ぶGitHubのcompare画面はない。
以下のリンクは、いずれも表に記載したリビジョンへ固定している。

## 結論

Amadeusは、v2のspace／intentによる永続化モデルを維持しつつ、製品の名前空間を
`aidlc`から`amadeus`へ変更している。現在の正規ワークスペースルートは次のとおり。

- 本家v2.2.0: `aidlc/`
- Amadeus `main`: `amadeus/`

この変更は、状態ファイル、マシン固有ファイル、エンジンの構成ファイル、コマンド、
配布物のパスまで及ぶ。一方、ライフサイクルの成果物がすべて改名されたわけではない。
ワークスペースルートからの相対位置で見ると、intentレコードの命名形式、フェーズ／
ステージのディレクトリ、多くの成果物ファイル名は維持されている。

一部のソースに残る`*-docs/`というパスは、旧フラットレイアウトから移行するための
互換参照である。この比較における正規ワークスペースルートではない。

## 正規ワークスペースの構成

本家の構成は
[spaces／intentsガイド](https://github.com/awslabs/aidlc-workflows/blob/v2.2.0/docs/guide/03-spaces-and-intents.md)、
Amadeusの構成は
[Amadeusの同ガイド](https://github.com/amadeus-dlc/amadeus/blob/279e027eb71d7aa0a681a44fa14a0d5ee78f0082/docs/guide/03-spaces-and-intents.md)
と[パス解決処理](https://github.com/amadeus-dlc/amadeus/blob/279e027eb71d7aa0a681a44fa14a0d5ee78f0082/packages/framework/core/tools/amadeus-lib.ts)
で確認できる。

```text
# awslabs/aidlc-workflows v2.2.0
<project>/
├── .claude/ | .kiro/ | .codex/
├── aidlc/
│   ├── active-space
│   ├── .aidlc-clone-id
│   └── spaces/<space>/
│       ├── memory/
│       ├── knowledge/
│       ├── codekb/<repo>/
│       └── intents/
│           ├── active-intent
│           ├── intents.json
│           └── <YYMMDD>-<label>/
│               ├── aidlc-state.md
│               ├── audit/<host>-<clone>.md
│               └── <phase>/<stage>/
└── <application code>
```

```text
# amadeus-dlc/amadeus main
<project>/
├── .claude/ | .kiro/ | .codex/
├── amadeus/
│   ├── active-space
│   ├── .amadeus-clone-id
│   └── spaces/<space>/
│       ├── memory/
│       ├── knowledge/
│       ├── codekb/<repo>/
│       │   └── re-scans/<intent-record>.md
│       └── intents/
│           ├── active-intent
│           ├── intents.json
│           └── <YYMMDD>-<label>/
│               ├── amadeus-state.md
│               ├── audit/<host>-<clone>.md
│               └── <phase>/<stage>/
└── <application code>
```

## ワークスペースのパスとファイル名の対応

以下の`<record>`は
`<workspace-root>/spaces/<space>/intents/<YYMMDD>-<label>`を表す。

| 観点 | 本家v2.2.0 | Amadeus `main` | 差分 |
| --- | --- | --- | --- |
| ワークスペースルート | `aidlc/` | `amadeus/` | 製品の名前空間を変更 |
| 移行済みマーカー | `aidlc/.migrated` | `amadeus/.migrated` | ルートを変更、ファイル名は維持 |
| 使用中spaceのカーソル | `aidlc/active-space` | `amadeus/active-space` | ルートを変更、ファイル名は維持 |
| spaceのルート | `aidlc/spaces/<space>/` | `amadeus/spaces/<space>/` | ルートを変更、モデルは維持 |
| 開発手法とルール | `aidlc/spaces/<space>/memory/` | `amadeus/spaces/<space>/memory/` | ルートを変更、レイヤー構成は維持 |
| チーム知識 | `aidlc/spaces/<space>/knowledge/` | `amadeus/spaces/<space>/knowledge/` | ルートを変更 |
| 全エージェント向けチーム知識 | `knowledge/aidlc-shared/` | `knowledge/amadeus-shared/` | 共有ディレクトリを改名 |
| エージェント別チーム知識 | `knowledge/aidlc-<role>-agent/` | `knowledge/amadeus-<role>-agent/` | エージェント名の接頭辞を変更 |
| コード知識 | `aidlc/spaces/<space>/codekb/<repo>/` | `amadeus/spaces/<space>/codekb/<repo>/` | ルートを変更 |
| Reverse Engineeringの履歴 | v2.2.0にはintent別の`re-scans/`パスなし | `codekb/<repo>/re-scans/<intent-record>.md` | Amadeusで追加 |
| intentの格納先 | `aidlc/spaces/<space>/intents/` | `amadeus/spaces/<space>/intents/` | ルートを変更 |
| 使用中intentのカーソル | `intents/active-intent` | `intents/active-intent` | 改名後のルートからの相対位置は同じ |
| intentレジストリ | `intents/intents.json` | `intents/intents.json` | 改名後のルートからの相対位置は同じ |
| intentレコード | `intents/<YYMMDD>-<label>/` | `intents/<YYMMDD>-<label>/` | 命名形式を維持 |
| ワークフロー状態 | `<record>/aidlc-state.md` | `<record>/amadeus-state.md` | ファイル名の接頭辞を変更 |
| 監査証跡 | `<record>/audit/<host>-<clone>.md` | `<record>/audit/<host>-<clone>.md` | 維持 |
| 復旧用情報 | `<record>/.aidlc-recovery.md` | `<record>/.amadeus-recovery.md` | ファイル名の接頭辞を変更 |
| ランタイムの投影 | `<record>/runtime-graph.json` | `<record>/runtime-graph.json` | 維持 |
| センサーの一時ファイル | `<record>/.aidlc-sensors/` | `<record>/.amadeus-sensors/` | ディレクトリ名の接頭辞を変更 |
| フックの死活監視 | `<record>/.aidlc-hooks-health/` | `<record>/.amadeus-hooks-health/` | ディレクトリ名の接頭辞を変更 |
| clone識別子 | `aidlc/.aidlc-clone-id` | `amadeus/.amadeus-clone-id` | ルートとファイル名の接頭辞を変更 |
| セッションの対応表 | `aidlc/.aidlc-sessions/` | `amadeus/.amadeus-sessions/` | ルートとディレクトリ名の接頭辞を変更 |
| Constructionのworktree | `.aidlc/worktrees/` | `.amadeus/worktrees/` | マシン固有ディレクトリの名前空間を変更 |

コミット対象とgitignore対象を分ける方針は変わっていない。状態、監査シャード、
成果物、開発手法、チーム知識はコミットする。利用者ごとのカーソル、ランタイムの投影、
復旧用ファイル、センサー出力、clone識別子、セッション対応表はgitignoreの対象になる。

## ライフサイクル成果物の相対パスはほぼ同じ

本家の[成果物リファレンス](https://github.com/awslabs/aidlc-workflows/blob/v2.2.0/docs/guide/14-artifacts-reference.md)と
[Amadeusの成果物リファレンス](https://github.com/amadeus-dlc/amadeus/blob/279e027eb71d7aa0a681a44fa14a0d5ee78f0082/docs/guide/14-artifacts-reference.md)
を比較すると、製品の名前空間を置き換えた後のライフサイクルツリーは同じである。
主な例を次に示す。

| 成果物 | 本家v2.2.0 | Amadeus `main` |
| --- | --- | --- |
| 要求 | `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/inception/requirements-analysis/requirements.md` | `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/inception/requirements-analysis/requirements.md` |
| Unit | `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/inception/units-generation/unit-of-work.md` | `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/inception/units-generation/unit-of-work.md` |
| コード生成計画 | `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/construction/<unit>/code-generation/code-generation-plan.md` | `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/construction/<unit>/code-generation/code-generation-plan.md` |
| 可観測性ダッシュボード | `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/operation/observability-setup/dashboards.md` | `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/operation/observability-setup/dashboards.md` |
| フェーズ検証 | `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/verification/phase-check-<phase>.md` | `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/verification/phase-check-<phase>.md` |
| ステージの日誌 | `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/<phase>/<stage>/memory.md` | `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/<phase>/<stage>/memory.md` |

したがって、連携機能ではワークスペースと製品名由来の接頭辞を置き換える必要があるが、
すべての成果物ファイル名が変わったと仮定してはならない。

## フレームワークのソースとインストール先

インストール後のワークスペースだけでなく、リポジトリ内のソース配置も変わっている。

| 領域 | 本家v2.2.0 | Amadeus `main` |
| --- | --- | --- |
| フレームワークの正規ソース | `core/` | `packages/framework/core/` |
| ハーネスの正規ソース | `harness/<harness>/` | `packages/framework/harness/<harness>/` |
| ルート直下の互換エイリアス | 該当なし | `core`と`harness`がpackage配下の正規ソースを指す |
| 共通エンジン | `core/aidlc-common/` | `packages/framework/core/amadeus-common/` |
| エージェント定義 | `core/agents/aidlc-<role>-agent.md` | `packages/framework/core/agents/amadeus-<role>-agent.md` |
| ツール、フック、センサー、スキル | `aidlc-*` | `amadeus-*` |
| 生成済みワークスペース | `dist/<harness>/aidlc/` | `dist/<harness>/amadeus/` |
| 主な呼び出し方 | `/aidlc`、Codexでは`$aidlc` | `/amadeus`、Codexでは`$amadeus` |
| インストール方法 | 選択した`dist/<harness>/`をコピー | `bunx`または`npx @amadeus-dlc/setup install`。`dist/`の手動コピーは代替手段として維持 |

Codexでは、ハーネスのディレクトリ名`.codex/`と`.agents/`は変わらず、同じ階層に
置くワークスペースが`aidlc/`から`amadeus/`へ変わる。Amadeusがpackage配下を
正規ソースとする判断は
[ワークスペース構成のDecision](https://github.com/amadeus-dlc/amadeus/blob/279e027eb71d7aa0a681a44fa14a0d5ee78f0082/docs/reference/18-workspace-layout.md)、
インストール契約はSHAを固定した
[AmadeusのREADME](https://github.com/amadeus-dlc/amadeus/blob/279e027eb71d7aa0a681a44fa14a0d5ee78f0082/README.md)
で確認できる。
本家v2.2.0の手動コピーによるインストール契約は、固定した
[本家のREADME](https://github.com/awslabs/aidlc-workflows/blob/v2.2.0/README.md)にある。

## 互換性への影響

以下は、固定したファイルから導いた結論であり、本家が提供する移行手順ではない。

1. 正規ルートは、本家v2.2.0では`aidlc/`、Amadeusでは`amadeus/`として解決する。
   旧フラットレイアウトの`*-docs/`を現在のルートとして扱わない。
2. 状態、復旧、一時ファイル、clone、セッション、エンジン構成、コマンドなど、
   製品名由来のファイルとディレクトリを一体として改名する。
3. Amadeus固有の拡張が別途明示されていない限り、space、intent、監査シャード、
   フェーズ、ステージ、ライフサイクル成果物の構成は維持する。
4. Reverse Engineeringの鮮度を扱う連携機能は、Amadeusの
   `codekb/<repo>/re-scans/<intent-record>.md`を考慮する。
5. Amadeusでは`packages/framework/core/`と`packages/framework/harness/`を
   正規ソースとして扱う。ルート直下の`core`と`harness`は互換用である。
