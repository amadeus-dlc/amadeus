# Introduction（イントロダクション）

## Amadeus DLC とは何か

**Amadeus DLC** は、AI 支援ソフトウェア開発のためのライフサイクル契約である。
AI-DLC v2（[awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows) の `v2` ブランチ）と意味論互換である。

作業は **Intent** を単位に組み立てる。
Intent は、独立して完了判断でき、観測可能な成功基準を持つアウトカムである。
Intent は Ideation、Inception、Construction を進む。Operation ステージを含む scope では、さらに Operation へ進む（どの scope がどのステージを実行するかは [scopes 契約](../amadeus/lifecycle/scopes.ja.md)が定義する）。
契約全体（stage の責務、入出力、その裏にある状態機械）は [Lifecycle Contract Overview](../amadeus/lifecycle/overview.ja.md) が定義する。

各 stage の完了と各 gate の判断は、Intent 自身の record 配下に audit イベントとして記録する。
各 stage gate と、Construction の各 Bolt gate は、作業が先へ進む前に人間の明示判断を待つ。
日々の stage 作業はエージェントが担うが、何を出荷するかは人間の制御下に残る。

## どう動くか

Amadeus は**エンジン駆動**である。
公開入口の唯一の skill である `amadeus` 自体は、次に何をするかを判断しない。
`amadeus` は、エンジンの `next` / `report` の forwarding loop（`.agents/amadeus/tools/amadeus-orchestrate.ts` に実装）を、1 手ずつ呼び出す。

エンジンが Intake、scope、stage 順序、gate の結果を解決する。
skill 層は、エンジンが返す directive を実行し、結果を報告してから次の directive を呼ぶ。
この解決を 1 か所に集約することで、scope の規則や gate の判定を実行のたびに文章として再導出せずに済む。

## ライフサイクルの形

ライフサイクルは 5 phase（Initialization、Ideation、Inception、Construction、Operation）から成る。
5 phase を合わせると、`.agents/amadeus/tools/data/stage-graph.json` にコンパイルされた 32 stage になる。

すべての Intent が 32 stage すべてを実行するわけではない。
10 個の **scope**（`.agents/amadeus/scopes/` 配下に 1 scope 1 ファイルで定義。例: `poc`、`feature`、`mvp`、`enterprise`）が、それぞれ 32 stage のうち独自の EXECUTE / SKIP 部分集合を宣言する。
scope により、小さな Intent は大きな Intent が必要とする儀式を省略できる。
scope ごとの正確な stage 集合は [scopes 契約](../amadeus/lifecycle/scopes.ja.md)が定義する。

## skill 一覧

Amadeus は 5 グループ、計 42 個の skill を持つ。

- 公開入口 1 個: `amadeus`。
- 補助入口 3 個: `amadeus-grilling`、`amadeus-domain-modeling`、`amadeus-validator`。
- stage runner 29 個: stage ごとに 1 個あり、それぞれ `/amadeus --stage <slug> --single` を packaging する。
- shortcut 6 個: scope entry skill 群、composer、Initialization 全体を実行する runner。
- read-only の utility skill 3 個: `amadeus-replay`、`amadeus-session-cost`、`amadeus-outcomes-pack`。

stage と runner の全対応は [Stage Catalog](../../core/skills/amadeus/references/stage-catalog.md) が保守する。
本ガイドはその内容を複製しない。

## AI-DLC v2 との関係

Amadeus は AI-DLC v2 の適応 fork であり、並行実装ではない。
エンジンは上流 TS エンジンのバイト無改変コピーであり、ステージ実行 skill は上流 skill の適応ファイルコピーである（基準 commit は `parity-map.json` に固定記録）。
適応は `amadeus-*` への改名と、質問提示の `amadeus-grilling` への結線に意図的に限定する。
fork であるため、構造と意味論（stage の責務、実行条件、gate の状態機械、Intake のプロトコル）は、再実装ではなく構成そのものによって上流と揃う。

Amadeus 固有なのは名前空間である。
skill 名、tool の path、CLI トークンは、`aidlc` の代わりに `amadeus` の prefix を使う（[#526](https://github.com/amadeus-dlc/amadeus/issues/526) の全面 rename）。

機械検査可能な対応表である `parity-map.json`（`dev-scripts/data/parity-map.json`）は、この改名を文章ではなくデータとして定義する。
対応表は、改名された要素 10 系統（engine directory、tool、hook、scope file、sensor file、CLI トークンなど）にわたり、計 120 件の対応を持つ。
`npm run parity:check` が、この対応表とコードベースの実態を突き合わせて検証する。

命名を超えた機能差分は、まだ棚卸しの途中である。
詳細は [Issue #524](https://github.com/amadeus-dlc/amadeus/issues/524) の pending 作業を参照する。

## 次に読むもの

次章の [Getting Started](01-getting-started.ja.md) は、自分の workspace へエンジンを導入し、導入結果を検証する内容を扱う。
各章の状態は、ガイドの[目次](index.ja.md)で確認できる。
