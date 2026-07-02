# 既存コード分析

## 対象コード

| 対象 | 種別 | 確認内容 |
|---|---|---|
| `.agents/skills/amadeus-validator/validator/generated/task-generation-contract.ts` | 契約生成物 | `gateResultByStatus` が Task Generation の status と gate 結果の決定論的な対応を定義している。`ready_for_approval` は `waiting_approval` へ写像される。承認待ち判定はこの契約を定義元にできる。 |
| `.agents/skills/amadeus-validator/validator/AmadeusValidator.ts` | validator 実装 | phase gate の語彙は `gateValues = {not_ready, waiting_approval, passed, failed}`、状態語彙は `statusValues`（`waiting_approval` を含む）、Discovery gate は `{not_ready, passed}` で確定している。`state.json` の構造検査が既にあり、スキャンが前提にする構造の崩れは validator が fail にする。 |
| `.agents/skills/amadeus-validator/scripts/StateScaffold.ts`、`IndexGenerate.ts` | 同梱スクリプト先例 | CLI 契約は `bun run <script>.ts <workspace> ...`。source `skills/amadeus-validator/scripts/` と昇格先 `.agents/skills/amadeus-validator/scripts/` の 2 箇所が promote で同期される方式が確立している。実行入口の配置先（G001 確定判断）はこの構成に追加できる。 |
| `.agents/skills/amadeus-construction/scripts/list-unfinalized-intents.ts` | 横断スキャン先例 | `.amadeus/intents/*/state.json` を走査し、JSON 解釈不能や `state.json` 欠落を読み飛ばし、`.amadeus/intents` がない workspace を対象外として exit 0 で通知する規約が確立している。1 行 1 件の stdout 出力と exit code 契約の先例でもある。 |
| `examples/04-construction-design-ready/.amadeus/intents/20260629-minimum-purchase-flow/state.json` | 検証データ | B001 の `taskGeneration.status` が `ready_for_approval`（construction gate は `not_ready`）であり、承認待ち 1 件を含む実データとして検証に使える。 |
| `.amadeus/intents/*/state.json`（22 件） | 実データ | 現行 workspace の phase gate は `not_ready` と `passed` だけが出現し、`waiting_approval` の実例はない。承認待ちの実出現箇所は Task Generation の `ready_for_approval` である。 |
| `skills/amadeus-validator/evals/` | 検証構成 | evals.json と README があり、スクリプトの決定論的検証を追加する既存の入口がある。 |

## 既存能力

- 承認待ち判定に必要な語彙（phase gate、Task Generation status、gate 結果の写像）は、契約生成物と validator 実装に定義済みであり、スキャン側で新しい語彙を発明する必要がない。
- `list-unfinalized-intents.ts` に、workspace 引数、`state.json` 走査、壊れたファイルの読み飛ばし、対象外 workspace の扱い、exit code 契約の先例がそろっている。
- StateScaffold と IndexGenerate に、validator 同梱スクリプトの配置、promote 同期、配布先ユーザー環境での実行の先例がある。

## 統合点

- 一覧スクリプトは `skills/amadeus-validator/scripts/` に新設し、promote で `.agents/skills/amadeus-validator/scripts/` へ反映できる（G001 確定判断）。
- 承認待ち判定は `task-generation-contract.ts` の `gateResultByStatus` を import して使える（`list-unfinalized-intents.ts` が既に contract を import する先例はないが、StateScaffold.ts が import している）。
- eval は `skills/amadeus-validator/evals/` の既存構成に追加でき、昇格先へ混入しない。
- `examples/04-construction-design-ready` は承認待ち 1 件、`examples/02`、`examples/03` は承認待ち 0 件の検証データとして使える。

## ギャップ

- 複数 Intent の `state.json` から承認待ちだけを抽出して一覧する実行可能な手段が存在しない。
- 待ち理由を `state.json` のフィールド（phase ブロック、gate 値、`taskGeneration.status`、Bolt ID）からどの文言に写像するかの規約が未定義である。
- Markdown 表と 0 件時表示の出力契約（列、見出し、0 件文言）が未定義である。
- 現行 workspace の実データに phase gate の `waiting_approval` 出現例がなく、phase gate の承認待ちをどの状態で検出するか（gate 値だけか、`status: waiting_approval` も含めるか）の判定規約が未確定である。

## リスク

- ゲート語彙の契約が変わると判定規則が古くなる。契約生成物（`task-generation-contract.ts`）を定義元として参照し、値の複製を避ける必要がある。
- スキャン対象を広げすぎると（Discovery の gate、`intents.md` の依存など）、Issue #350 の対象「複数 Intent の `state.json`」を超える。対象外を要求で明確にする必要がある。
- skill 変更 PR になるため、レビュー支援契約（挙動差分要約、skill-forge 確認、粒度制約）と promote 同期の適用対象になる。

## Inception への入力

- 要求は、承認待ちの横断スキャンと一覧出力、0 件時の表示、配布先ユーザー環境での実行、判定条件の契約準拠、検証の先行追加に分けられる。
- Unit は、承認待ちキュー一覧の契約を核とした単一の価値境界にまとめる構成が候補になる（スキャン、判定、出力は不可分）。
- Bolt は、(1) 一覧スクリプトの RED から GREEN（判定規約と出力契約を含む）、(2) skill 手順と README への組み込みと promote 同期、に分けられる見込みである。
- Construction では dev-scripts ルールに従い、失敗する検証を先に追加してから実装する。

## 証拠

| 種別 | 参照 | 内容 |
|---|---|---|
| file | `.agents/skills/amadeus-validator/validator/generated/task-generation-contract.ts` | `gateResultByStatus` の `ready_for_approval: waiting_approval` 写像の確認。 |
| file | `.agents/skills/amadeus-validator/validator/AmadeusValidator.ts` | `gateValues`（54 行付近）、`statusValues`、`discoveryGateValues` の語彙確認。 |
| file | `.agents/skills/amadeus-construction/scripts/list-unfinalized-intents.ts` | 横断スキャンの走査、読み飛ばし、exit code 契約の確認。 |
| file | `.agents/skills/amadeus-validator/scripts/StateScaffold.ts` | 同梱スクリプトの CLI 契約と contract import の先例確認。 |
| command | `jq '.construction' examples/04-construction-design-ready/.amadeus/intents/20260629-minimum-purchase-flow/state.json` | B001 が `ready_for_approval`（承認待ち 1 件）であることの確認。 |
| command | `grep -rn "waiting_approval" .amadeus/intents/*/state.json` | 現行 workspace の phase gate に `waiting_approval` の実例がないことの確認。 |

## 鮮度

| 項目 | 値 |
|---|---|
| analyzedCommit | b4846473 |
| analyzedAt | 2026-07-02T20:16+09:00 |
| freshness | current |

## 未確認事項

- phase gate の承認待ち検出条件（gate 値 `waiting_approval` だけか、phase の `status: waiting_approval` も含めるか）は要件定義と Construction Functional Design で確定する。
- 待ち理由の文言への写像規約は Construction Functional Design で確定する。
- スクリプト名と CLI 契約の詳細（workspace 引数、exit code）は Construction Functional Design で確定する。
- examples の skill-provenance 更新の要否（skill 変更に伴う再生成）は Construction で確認する。
