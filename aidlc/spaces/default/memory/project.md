# プロジェクト

この文書は、プロジェクト固有の目的、能力、技術、構造の判断材料を扱う。
team.md の内容を上書きする。

## 目的

| 識別子 | 目的 | 期待価値 | 成功指標 | 状態 |
|---|---|---|---|---|
| OBJ001 | Amadeus 本体開発を Amadeus DLC の成果物で管理する。 | Intent 作成後から PR 準備までの手戻りを減らす。 | 自己開発用 Space と最初の Intent が追跡可能である。 | 採用 |

## コア能力

- Amadeus DLC の phase、成果物、gate、validator、traceability を skill と workspace 成果物として運用する。
- GitHub Issue と Intent 成果物を接続し、設計判断と PR 準備を追跡できるようにする。
- build workspace、host environment、target workspace、target artifacts を分け、自己開発で成果物の出自を記録する。

## 主要ユースケース

- Amadeus 本体の skill 変更を Intent として管理する。
- validator 変更を Intent として管理する。
- example snapshot 更新を、使った source skill の provenance とともに管理する。
- docs 更新を、対応 Issue と Intent の判断記録から追跡する。

## 価値仮説

- 自己開発用 Space があると、実装前の判断、検証方針、PR 準備の抜け漏れを減らせる。
- target workspace を明示すると、実行する側の skill と変更対象の成果物を混同しにくくなる。
- stage 判定を記録すると、次回作業でどの成果物を stage0 として扱えるかを人間が判断しやすくなる。

## アーキテクチャ

- Amadeus は、source skill、昇格先 skill、validator、example snapshot、開発用スクリプトで構成する。
- skill の source は `skills/amadeus-*` に置く。
- 昇格先成果物は `.agents/skills/amadeus-*` に置く。
- example snapshot は `examples/**/aidlc` に置く。

## 主要技術

| 領域 | 技術 | 根拠 | 状態 |
|---|---|---|---|
| 実行 | Bun と TypeScript | 開発用スクリプトと validator は Bun と TypeScript を前提にする。 | 採用 |
| 検証 | `npm run test:all` | repo 全体の標準検証入口である。 | 採用 |
| PR 管理 | GitHub Issue と Pull Request | Issue を Intent の入口、PR を変更のレビュー単位として扱う。 | 採用 |

## 開発標準

### 型安全性

- TypeScript で書くスクリプトと validator は `tsc --noEmit` を通す。

### 品質基準

- skill、validator、example、docs の成果物境界を分ける。
- 後方互換は、明示的な互換性維持対象がない限り残さない。

### テスト

- 標準検証は `npm run test:all` とする。
- validator や開発用スクリプトの変更は、先に失敗する eval または検証を追加する。

## 開発環境

### 必須ツール

- Node.js
- Bun
- npm
- GitHub CLI
- mise

### 代表コマンド

```sh
npm run test:all
bun run dev-scripts/promote-skill.ts <skill-name> --replace
npm run examples:generate:real
```

## 主要技術判断

- source skill と昇格先成果物の同期は `dev-scripts/promote-skill.ts` を使う。
- example snapshot の md5 provenance は、実 provider で再生成した場合だけ更新する。
- target workspace を明示する必要がある作業では、暗黙のカレントディレクトリだけに依存しない。

## 編成方針

- target workspace の `aidlc/spaces/default/` は、Amadeus 本体開発用の Space（memory、knowledge）と Intent record を扱う。
- `examples/**/aidlc` は、読者向け説明ではなく、skill の実行結果として成立する snapshot として扱う。
- `.agents/skills/amadeus-*` は、host environment で動作する skill と、target artifacts としての昇格先成果物の二重の役割を持つ。

## ディレクトリパターン

| パターン | 場所 | 役割 | 例 | 状態 |
|---|---|---|---|---|
| Space | `aidlc/spaces/default/` | 自己開発の共有前提（`memory/`、`knowledge/`）を置く。 | `aidlc/spaces/default/memory/team.md` | 採用 |
| Intent record | `aidlc/spaces/default/intents/<YYMMDD>-<label>/` | 個別変更の成果物を置く。 | `aidlc/spaces/default/intents/260629-self-dev-steering-layer/` | 採用 |
| Source skill | `skills/amadeus-*` | 作業中の skill source を置く。 | `skills/amadeus-validator/` | 採用 |
| Source skill assets | `skills/amadeus-*/assets` | source skill に属する素材を置く。 | `skills/amadeus-validator/assets/` | 採用 |
| 昇格先 skill | `.agents/skills/amadeus-*` | 実行側が読む skill を置く。 | `.agents/skills/amadeus-validator/` | 採用 |
| 昇格先 skill assets | `.agents/skills/amadeus-*/assets` | 昇格先成果物に属する素材を置く。 | `.agents/skills/amadeus-validator/assets/` | 採用 |
| Example snapshot | `examples/**/aidlc` | skill 生成結果の snapshot を置く。 | `examples/03-construction-design-ready/aidlc` | 採用 |
| 参照元 | `CONTEXT.md`、`AMADEUS.md`、`.agents/rules/**/*.md` | 判断、語彙、作業規則の基準を置く。 | `CONTEXT.md` | 採用 |

## 命名規約

| 対象 | 規約 | 例 | 状態 |
|---|---|---|---|
| Intent | `<YYMMDD>-<label>` | `260629-self-dev-steering-layer` | 採用 |
| Requirement | `Rnnn-<slug>` | `R001-provenance-recording` | 採用 |
| Unit | `Unnn-<slug>` | `U001-validator-contract` | 採用 |
| Bolt | `Bnnn-<slug>` | `B001-validator-check` | 採用 |

Intent の正準 ID は `intents/intents.json`（registry）の UUIDv7 である。
上記の `<YYMMDD>-<label>` は record ディレクトリ名（dirName）であり、人間が参照するときの表示名として使う。

## 依存関係の整理

- GitHub Issue を先に作り、Intent の根拠として記録する。
- PR 作成時は、対応 Issue と `aidlc/spaces/default/intents/...` をリンクする。
- stage2 は、次回作業の stage0 に自動昇格しない。

## コード構成原則

- skill、validator、example、docs の変更は成果物境界を分ける。
- host environment 側の参照元や assets を target artifacts として更新する場合は、対象 Intent に理由を記録する。
- source skill の assets と昇格先 skill の assets は、所有者と更新手段を分けて扱う。
- repo の開発用スクリプトを、skill の実行時参照として書かない。
- 既存の昇格手段を経由せずに `.agents/skills/amadeus-*` を同期しない。

## Corrections
- Cursor ハーネスでは AskUserQuestion の presence hook が発火しないため、質問 widget への実回答を確認した直後に限り hooks/amadeus-mint-presence.ts で HUMAN_TURN を手動 mint してから amadeus-log answer / 承認を記録する (learned 2026-07-04) <!-- cid:requirements-analysis:cursor-presence-mint -->
- amadeus-learnings.ts surface が phase: spaces / memory_entries_total: 0 を返す事象は 260704-engine-validator-alignme の requirements-analysis でも再現した（エントリ実在）。FR-4 修正時の再現ケースとして本ステージの memory.md を使える (learned 2026-07-04) <!-- cid:requirements-analysis:surface-zero-repro -->
- registry の repos 既定値は空配列 [] とする。resolveConstructionRepo は intentRepos が entry.repos ?? [] を返すため [] と行なしを同一に扱い、lone-repo 推論の挙動は変わらない (learned 2026-07-04) <!-- cid:code-generation:c1 -->
- amadeus-learnings surface の 0 件バグの根本原因は、runtime graph compile の memory_path の record prefix 欠落と、phase の先頭固定 index 解決（split("/")[1]）の複合。同種の path 解決は record path 構造（末尾からのセグメント）で行う (learned 2026-07-04) <!-- cid:code-generation:c2 -->
- エンジンツール（.agents/amadeus/tools/）を修正したら dev-scripts/data/parity-map.json の engineFileExceptions への宣言と skills/ 正準ソースへの同一反映が必要。上流が同修正を取り込んだら例外を解除する (learned 2026-07-04) <!-- cid:code-generation:c3 -->

## Testing Posture
- build-and-test は Minimal 戦略でも produces 全件を生成する（report が成果物不在を拒否するため）。不適用のテスト instruction は空ファイルにせず、適用判断と根拠を記す簡潔な文書にする (learned 2026-07-04) <!-- cid:build-and-test:c1 -->
