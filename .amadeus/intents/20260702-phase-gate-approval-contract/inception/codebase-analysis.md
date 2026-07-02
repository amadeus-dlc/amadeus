# 既存コード分析

## 対象コード

| 対象 | 種別 | 確認内容 |
|---|---|---|
| `skills/amadeus-construction-implementation-execution/SKILL.md` | source skill | 前提に「`taskGeneration.status` が `ready_for_approval` または `passed` でない場合は、実装せずに停止する」とあり、人間承認前でも実装へ進める迂回路を確認した。 |
| `skills/amadeus-construction-bolt-preparation/SKILL.md` | source skill | 手順 11 と 12 に `ready_for_approval` 到達と人間承認済みの `passed` 化はあるが、`ready_for_approval` 到達後に停止して承認を待つ行動が明記されていないことを確認した。 |
| `skills/amadeus-ideation/SKILL.md` | source skill | auto 判定表の scaffold-only 条件が「質問不要で進められる」であり、客観基準がないことを確認した。 |
| `skills/amadeus-inception/SKILL.md`、`skills/amadeus-construction/SKILL.md` | source skill | Decision Review 記述は outcome の分類と handoff 項目を持つが、`grill_required` にする決定論的トリガーがないことを確認した。 |
| `skills/amadeus-decision-review/SKILL.md` | source skill | 判断ノード DN001〜DN007 と outcome の契約を確認した。DN004（既存成果物と証拠だけで判断できるか）が決定論的トリガーの統合先候補である。 |
| `skills/amadeus-validator/validator/AmadeusValidator.ts` | source validator | `taskGeneration` の evidence path 検査（`taskGenerationEvidencePaths`）と `ready_for_approval` / `passed` の分岐は存在するが、`passed` に `kind: approval` を要求する検査がないことを確認した。source と昇格先の md5 は一致している。 |
| `dev-scripts/evals/amadeus-validator/check.ts` | 開発用 eval | `examples/03-inception-completed` を fixture に、一時ディレクトリで改変して pass と fail を確認する既存の eval 枠組みを確認した。`npm run test:it:amadeus-validator` から実行される。 |
| `.amadeus/intents/*/state.json`、`examples/*/.amadeus/intents/*/state.json` | Intent 状態の実データ | `taskGeneration.status: passed` は 34 件あり、すべて `evidence` に `{"kind": "approval", "path": ...}` を含むことを確認した。approval の path は `pr.md`、`notes.md`、`test-results.md`、`decisions/*.md` を指す。 |

## 既存能力

- 対象 skill の前提と手順は行単位の契約記述であり、迂回路は該当行の変更と追記で塞げる。
- `amadeus-decision-review` は判断ノードと outcome の表を持ち、決定論的トリガーを判断ノードの入力として統合できる。
- 3 つの phase skill（ideation、inception、construction）の Decision Review 記述は同じ構造を持ち、同じトリガー文を一貫して追加できる。
- validator は `taskGeneration` の evidence 配列を既に解釈しており（`taskGenerationEvidencePaths`）、`kind` による検査を追加できる。
- eval は fixture の state.json を一時ディレクトリで改変して fail を確認する形式が確立しており、承認 evidence 検査の RED ケースを同じ形式で追加できる。
- 前段成果物の未確定事項は「〜は Inception で判断する。」「〜は Construction で判断する。」という文言で書く慣行が既に成立しており、文言規約として契約化できる。

## 統合点

- `amadeus-construction-implementation-execution` の前提行（`ready_for_approval` または `passed`）を `passed` だけに変更できる。
- `amadeus-construction-bolt-preparation` の手順 11 と 12 の間に、停止して承認を待つ行動を肯定形で追加できる。
- 3 つの phase skill の Decision Review 節に、未確定事項の文言規約による `grill_required` トリガーを追加できる。
- `amadeus-ideation` の auto 判定表の scaffold-only 行の条件を、確定判断の記録の実在に置き換えられる。
- validator の `taskGeneration` 検査（`AmadeusValidator.ts` の 2080 行台と 2210 行台の分岐周辺）に、`passed` の場合の `kind: approval` 検査を追加できる。
- eval は `dev-scripts/evals/amadeus-validator/check.ts` に、approval evidence を除去した fixture が fail することの確認を追加できる。

## ギャップ

- `passed` を人間承認済みに限定する行動が implementation-execution から読めない。`ready_for_approval` のまま実装へ進める。
- bolt-preparation に `ready_for_approval` 到達後の停止と承認待ちの行動記述がない。
- Decision Review に `grill_required` を強制する決定論的トリガーがなく、「既存成果物から分かることは質問しない」が抜け道になっている。
- scaffold-only の許可条件「質問不要で進められる」に客観基準がない。
- validator に `passed` と approval evidence の対応検査がない。承認なしの `passed` が構造検証を通過する。

## リスク

- implementation-execution の前提を `passed` だけに変えると、`ready_for_approval` で停止する行動が bolt-preparation 側に明記されていない場合、cycle が前へ進まない。両 skill の変更を同時に扱う必要がある。
- 文言規約（「<現在 phase> で判断する」）は既存慣行と一致するが、規約として明文化しないと書き手が別の言い回しを使い、トリガーが空振りする。
- validator 検査の追加は、既存の examples と `.amadeus/intents/**` の pass を壊さないことを確認済みだが（34 件すべて approval あり）、eval の fixture 改変ケースを先に RED で確認する必要がある。
- skill 契約の変更は source と昇格先の両方に反映が必要で、promote 手順を経ないと昇格先が古いまま残る。

## Inception への入力

- 要求は、実装ゲートの前提強化（implementation-execution + bolt-preparation）、grilling 起動の決定論的トリガー（3 phase skill + decision review）、scaffold-only 許可条件の限定（ideation）、validator の approval evidence 検査（validator + eval）に分ける。
- Unit は、skill 側のゲート契約（BC001 自己開発運用の skill 契約変更）と validator 側の evidence 検査（validator と eval の実装変更）の 2 つの価値境界に分けられる見込みである。
- Bolt は、skill 契約の変更と promote 同期、validator 検査と eval の実装に分けられる。validator の検査対象（approval evidence の構造）は skill 契約で確定する形式を前提にするため、skill 契約側が先行する。
- Construction では、skill 変更 PR としてレビュー支援契約（挙動差分要約、skill-forge 確認、粒度制約）が適用される。validator 変更は dev-scripts ルールに従い eval 先行（RED → GREEN）で実装する。

## 証拠

| 種別 | 参照 | 内容 |
|---|---|---|
| file | `skills/amadeus-construction-implementation-execution/SKILL.md` | 迂回路 1（`ready_for_approval` でも実装可）の現状確認。 |
| file | `skills/amadeus-construction-bolt-preparation/SKILL.md` | 迂回路 2（停止行動の欠落）の現状確認。 |
| file | `skills/amadeus-ideation/SKILL.md` | 迂回路 3（scaffold-only の主観条件）の現状確認。 |
| file | `skills/amadeus-decision-review/SKILL.md` | 判断ノードと outcome 契約の確認。 |
| file | `skills/amadeus-validator/validator/AmadeusValidator.ts` | `taskGeneration` evidence 検査の現状と検査追加位置の確認。 |
| file | `dev-scripts/evals/amadeus-validator/check.ts` | eval の fixture 改変形式と実行入口の確認。 |
| command | `python3 による state.json 集計` | `passed` 34 件すべてに `kind: approval` があることの確認。 |

## 鮮度

| 項目 | 値 |
|---|---|
| analyzedCommit | `9db16842e120e4c286e0f4827825d30dab240bcb` |
| analyzedAt | `2026-07-02T03:21:06Z` |
| freshness | current |

## 未確認事項

- approval evidence の `path` が指す成果物の種類（`pr.md`、`notes.md` など）を検査で限定するかは、Unit Design Brief と Construction で確定する。
- decision review のトリガーを `amadeus-decision-review` の判断ノード表に統合するか、各 phase skill の Decision Review 節だけに書くかは、Unit Design Brief で確定する。
