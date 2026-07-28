# Feasibility Assessment — 260727-plugin-verb-skills

上流入力(consumes 全数): intent-statement.md

intent-statement.md のスコープ(#1597 提案1〜4 フル + #1598 同乗)に対する実現可能性を、リポジトリ実測(ref: worktree HEAD = origin/main f1d561904 同等の plugin 面)で評価する。

## 判定: GO

外部依存なし・全シームがリポジトリ内に実在し実測済み。新規機構の発明は不要で、3つの既習様式(utility handler / amadeus-mirror スキル / runner-gen)の拡張で構成できる。

## シーム実測(能力別)

### 1. `/amadeus plugin <verb>` ユーティリティハンドラ

- `packages/framework/core/tools/amadeus-utility.ts` の verb dispatch(case 分岐、:5946 以降に `help`/`status`/`doctor`/`intent`/`space`/`recompose` 等)に `plugin` case が**不在**であることを実測確認 — 追加面は既習の「Adding a Utility Handler」チェックリスト(`docs/reference/11-contributing.md`)がそのまま適用できる
- 委譲先 CLI `packages/framework/core/tools/amadeus-plugin.ts` に4 verb のハンドラが実在: `handleCompose`(:368)/`handleDrop`(:401)/`handleDoctor`(:457)/`handleStatus`(:472)。結果 kind は `composed|noop|dropped|doctor|status|usage-error|failure` の判別 union — ハンドラからの委譲は判別 union の機械マッピングで足りる
- core/tools 配置のため dist 7ハーネスへ構造的に投影される(`amadeus-plugin.ts` は既に全 dist に存在することを git ls-files で確認済み)

### 2. `amadeus-plugin` ユーザー起動スキル

- 前例 `amadeus-mirror` スキル(`.claude/skills/amadeus-mirror/SKILL.md`、単一ファイル・user-invocable・`<harness-dir>` 解決様式)が実在し、そのままテンプレートになる
- スキル面は Claude ハーネス固有の表層(dist/codex 等に skills ディレクトリは不在を実測)— 他ハーネスは (1) の utility handler が共通入口になる。amadeus-mirror と同一の構造であり非対称は新設しない

### 3. `install <path>` verb

- 現行 INSTALL.md フロー(#1569 是正済み)は「plugin ディレクトリをホストへコピー → compose」の2手作業。install verb はこの2手を `amadeus-plugin.ts` 内の1 verb に束ねるだけで、新しい trust 面を作らない(compose の承認ゲート経路は不変)
- ホストルートはハーネスディレクトリに統一済み(#1591 裁定 B、#1596 着地)— コピー先解決は既存の host root 解決を再利用できる

### 4. runner-gen の plugin 対応(#1598)

- `.claude/tools/amadeus-runner-gen.ts` は compiled `data/stage-graph.json` を単一正本として stage-runner スキルを生成し、`check` drift guard(t129)を持つ — **リポジトリ側**の生成器
- composed plugin stage はホスト側の recompile(#1592 の2段化で stage-graph.json 更新済み)でホストの graph に載る — 欠けているのは**ホスト側**での runner 生成配線。生成器の様式・雛形は runner-gen に実在するため、compose/recompile 時のホスト側生成(または runner-gen の対象拡張)のどちらでも実装可能。方式選定は application-design の ADR で行う(実装可能性はどちらの案でも成立)

## 確信度

- (1)(2)(3): 高 — 既習様式の直接適用、全シーム実測済み
- (4): 中 — 実装可能性は確定、方式(compose 時生成 vs runner-gen 拡張)とテスト面(drift guard の plugin stage への適用範囲)の設計判断が残る(raid-log R1)
