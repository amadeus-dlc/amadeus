# ビジネス概要

## 目的

Amadeus は AI-DLC ワークフロー を複数の AI harness に配布するための framework リポジトリ である。現在の価値は、共通の ワークフロー/core を一箇所で保ち、Claude、Codex、Kiro CLI、Kiro IDE などの harness ごとに異なる install surface へ同じ lifecycle を生成することにある。

この reverse engineering は GitHub issue #610 のために実施した。焦点は新機能実装ではなく、repository layout を `packages/<name>/{core,harness,dist,scripts}` のような package-owned 形式へ正規化すべきか、または root-level `core/` / `harness/` / `dist/` / `scripts/` を維持すべきかを判断するための現状把握である。

## 現在の業務境界

現在の repository は、次の三層で保守されている。

- `core/`: harness-neutral な AI-DLC runtime、templates、tools、stage 定義の source of truth。
- `harness/<name>/`: harness 固有の manifest、emitter、skill/prompt/system integration。
- `dist/<name>/`: user がコピー/インストール する commit 済み生成物。

この三層は README と contributing guide にも contributor mental model として記載されている。つまり layout は単なる ファイルシステム 配置ではなく、保守者が「どこを編集し、どこを生成物として扱うか」を判断する業務ルールでもある。

## Issue #610 の判断軸

Issue #610 で求められている判断は、`packages/setup` を取り込むことではない。`packages/setup` は別 intent で進む予定の sibling dependency であり、この intent では現 repository の framework 側 layout について次を判断する。

- 現状維持: root-level `core/` / `harness/` / `dist/` / `scripts/` を framework の明示的な境界として維持する。
- staged layout 継続: `packages/setup` のような新領域だけを package-owned にし、framework source は root-level に残す。
- full workspace normalization: framework 側も `packages/<name>/{core,harness,dist,scripts}` に寄せる。

## 成功条件

この stage の成果は、実装変更ではなく設計判断のための CodeKB 更新 である。成功条件は次の通り。

- path impact が `scripts/package.ts`, `scripts/promote-self.ts`, `dist/*`, `.claude/.codex/.agents`, tests, docs まで棚卸しされている。
- `packages/` が現 checkout に存在しないことを前提として記録している。
- 移行 する場合の release/drift guard 破壊リスクを次 stage で扱える粒度にしている。
- 移行 しない場合に root-level layout を正当化できる根拠を残している。
