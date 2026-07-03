# インテント：AI-DLC v2 への完全準拠

## 概要

Amadeus DLC の workspace 構造、状態、成果物を AI-DLC v2 の規定へ完全準拠させ、衝突は常に v2 を優先する。

## 依存

| 依存 | 理由 |
|---|---|
| なし | 再初期化後の最初の Intent であり、先行 Intent がないため。 |

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | 成果物契約と構造の準拠であり、利用者向け機能を追加しないため。 |
| scope | refactor | 振る舞い（ライフサイクルの意味論と全検証 green）を保存する構造変更のため。 |
| labels | aidlc-v2, contract | v2 準拠と契約変更の追跡用。 |

## 目的

Amadeus DLC が AI-DLC v2 の規定と構造・状態・成果物のレベルで差分を持つ状態を解消する。
v2 が規定する要素に Amadeus の独自色を持ち込まず、一次情報との突き合わせと将来の v2 追従を単純にする。

## 対象

Amadeus DLC を自己開発と配布先 workspace で運用する開発者。

## 成功条件

- v2 規定の構造・状態・成果物との差分がゼロである。具体的には次を満たす。
  - workspace が `aidlc/spaces/<space>/`（memory、knowledge、codekb、intents）構造である。
  - Initialization 0.1〜0.3 が Birth 時に実行され、record scaffold（phase ディレクトリ、`verification/`、`audit/`）と `aidlc-state.md` を作る。
  - Intent の状態は `aidlc-state.md` が持ち、`state.json` は退役している。
  - registry は `intents.json`（uuid v7 を正準 ID とする）である。
  - record ディレクトリ名が `<YYMMDD>-<label>` 形式である。
  - v2 規定の成果物が v2 の実ファイル名である（`unit-of-work.md` 系、`<stage>-questions.md`、`code-generation-plan.md`、`code-summary.md`、`build-and-test-summary.md`、`build-test-results.md`、`user-stories-assessment.md`、`practices-discovery-timestamp.md`、`decisions.md`（application-design）、`intent-statement.md`、各 stage の `memory.md`）。
- 全検証が green である（`npm run test:all`、validator、examples の再生成と検査）。

## 契機

examples snapshot の点検で `units.md` と v2 の `unit-of-work.md` の名前差に気づき、一次情報（awslabs/aidlc-workflows v2）との突き合わせで構造・状態・成果物の差分が体系的に存在することを確認した。
引き継ぎ用の記録は [Issue #387](https://github.com/amadeus-dlc/amadeus/issues/387) に置く。

## 範囲

含めるもの:

- `aidlc/spaces/<space>/` 構造への workspace 移行（steering layer の `memory/` への移行を含む）。
- Initialization phase（0.1〜0.3）の採用と Birth 手順の置き換え。
- `aidlc-state.md` への状態移行と `state.json` の退役（validator と `amadeus` 入口の改修を含む）。
- `intents.json` registry と `<YYMMDD>-<label>` record 命名の採用。
- `audit/`、`verification/`、stage ごとの `memory.md`、`intent-statement.md` の採用。
- v2 規定成果物の実ファイル名への改名と、lifecycle 文書、skill、template、validator、examples の整合。
- #369 の確定判断 3・4 の明示的な上書き記録。

含めないもの:

- Amadeus 独自色（grillings、traceability、phase decisions、モジュールファイル、`intents.md` 索引、日本語成果物規範）の再設計。完全準拠後の後続検討として分離する。
- Operation phase の stage 実行の採用（scaffold のディレクトリ作成のみ行う）。
- v2 の engine / tooling（`aidlc-utility.ts` など）の移植。実装は Amadeus の skill 群で行う。
