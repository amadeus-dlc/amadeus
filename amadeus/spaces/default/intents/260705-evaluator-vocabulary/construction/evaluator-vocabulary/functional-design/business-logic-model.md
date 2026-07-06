# 業務ロジックモデル — unit: evaluator-vocabulary

## 入力と前提

- 上流入力は requirements.md（R001〜R003、N001〜N003、AC-1〜AC-3）である。
- scope refactor により units-generation / application-design は不在（設計どおり）。単一 unit（evaluator-vocabulary）。

## ワークフロー

| WF | 対応要求 | 概要 |
|---|---|---|
| WF1 | R001 | team.md の 2 記述を sensors 語彙へ読み替え |
| WF2 | R002 | validator SKILL.md（source）2 箇所を英語で読み替え → amadeus-templates eval の期待文言を追随更新（RED→GREEN 証跡）→ promote で昇格先同期 |
| WF3 | R003、N001 | repo 全体 grep → 3 分類判定表（読み替え対象 / 別概念・現行契約 / 歴史的記録）を code-summary に記録。分類 1 の追加ヒットがあれば同方針で読み替え |
| WF4 | disposition | #439 の close 提案と、Skill Contract consumer role `evaluator` の改名要否を別議論として記録 |

## 読み替えの正（verbatim）

前提: sensors の `matches` glob は Construction 設計成果物系であり、PR 説明や team.md 自身は検査しない。旧 evaluator 候補のうち sensors がカバーしない項目（PR 説明の不足など）は、実際の検出主体である PR レビュー（人間とレビューボット）へ帰属させる。この帰属変更は #439 の候補 1 の字面（機械的な sensors 置換）からの意図的な精緻化であり、diary と disposition に記録する。

1. **team.md 判断基準行（30 行目）**
   - 旧: 「検査責務の境界は、validator = 成果物構造の検証、evaluator = 意味と接続性の評価として扱う。」
   - 新: 「検査責務の境界は、validator = 実行時の成果物構造の検証、sensors = gate 時の接続性・品質の決定論的検査（`SENSOR_FIRED` として記録）として扱う。」
2. **team.md 検出境界節（214 行目の段落）**
   - 旧: 「evaluator で検出する候補は、文書内容の説明不足や論理不整合に限定する。」
   - 新: 「PR レビュー（人間とレビューボット）で検出する候補は、文書内容の説明不足や論理不整合に限定する。」
   - 候補 3 点（PR 説明の不足、branch lifecycle の矛盾、後続確認先の欠落）は不変。
   - 段落末尾に次の一文を追加: 「gate 時の stage 成果物に対する接続性・品質の決定論的検査は、エンジンの sensors（`required-sections` / `upstream-coverage` / `linter` / `type-check`、`SENSOR_FIRED` として記録）が担う。」
3. **SKILL.md 207 行目（英語）**
   - 旧: "The evaluator's result is quality evaluation; keep it separate from the validator's judgment."
   - 新: "The engine sensors' result is deterministic quality checking fired at gates (recorded as `SENSOR_FIRED`); keep it separate from the validator's judgment."
4. **SKILL.md 208 行目（英語）**
   - 旧: "Even when the validator's or evaluator's result shows a learning reusable"
   - 新: "Even when the validator's or sensors' result shows a learning reusable"
5. **eval fixture（dev-scripts/evals/amadeus-templates/check.ts）**: 上記 3 の旧文言を期待する assert を、新文言の期待へ更新する。

## 処理順序

WF1 → WF2（SKILL 編集 → eval 実行で RED を確認し出力を記録 → fixture 更新 → eval GREEN を確認し記録 → promote → test:it:promote-skill）→ WF3 → WF4 → 検証（test:all、validator）。RED / GREEN の実行ログ抜粋を code-summary に残す。

## Review

**Verdict**: READY

**Iteration**: 2

**Findings**:

- **解消済み: `required-sections` sensor の H2 構造条件。** `business-rules.md`（読み替えの保存則／変更禁止対象／言語と経路／検証規律の 4 H2）、`domain-entities.md`（エンティティ一覧／不変条件の 2 H2）、`frontend-components.md`（適用判断／判断根拠の 2 H2）を実測し、いずれも登録済み既定の「H2 ≥ 2」フロアを満たすことを確認した。`aidlc/spaces/default/memory/templates/` は存在せず（テンプレート上書きなし）、本 stage の `## Sensors` 節にも上書き宣言はないため、この汎用フロアがそのまま適用される前提も変わっていない。`SENSOR_FAILED` を招く欠陥は解消済み。
- **解消済み: 「読み替えの正」の verbatim 化と sensors 帰属の実体整合性。** 5 件の旧/新ペアを実ソースと逐語照合した。team.md 30 行目「検査責務の境界は、validator = 成果物構造の検証、evaluator = 意味と接続性の評価として扱う。」、および team.md 215 行目「evaluator で検出する候補は、文書内容の説明不足や論理不整合に限定する。」は grep で確認した現行文言と完全一致。SKILL.md 207 行目 "The evaluator's result is quality evaluation; keep it separate from the validator's judgment." と 208 行目 "Even when the validator's or evaluator's result shows a learning reusable" も source・昇格先両方の現行文言と完全一致する。帰属変更（sensors がカバーしない検出候補を PR レビューへ再帰属）も、`.agents/amadeus/sensors/amadeus-required-sections.md` と `amadeus-upstream-coverage.md` の実際の `matches: "**/{aidlc-docs,intents}/**"` を確認したうえで、team.md 自身の path（`aidlc/spaces/default/memory/team.md`）がこの glob に一致せず sensors の検査対象外であることと整合しており、真実性を確認した。前回指摘の「sensors の実際の検査範囲を超えた記述を作り込む恐れ」は解消している。
- **[非ブロッキング・軽微・新規] 検出境界節の引用行番号が実際の行と 1 行ずれている。** 本文書は「team.md 検出境界節（214 行目の段落）」と書くが、該当文「evaluator で検出する候補は、文書内容の説明不足や論理不整合に限定する。」は実際には 215 行目にある（214 行目は空行）。引用テキスト自体は verbatim で正しく、gate 判定にも影響しないため非ブロッキングだが、次回の軽微修正で「215 行目」に直すのが望ましい。
- **[非ブロッキング・軽微・再指摘] WF2 の RED/GREEN 手順順序が `check.ts` の実装と整合しない。** `check.ts` の `textContracts`（185〜207 行目付近、`skills/amadeus-validator/SKILL.md` の contract）は同一 `includes` needle を source と `promotedPath`（`.agents/skills/amadeus-validator/SKILL.md`）の両方に対して検査する。現行の処理順序「SKILL 編集 → eval RED 確認 → fixture 更新 → eval GREEN を確認し記録 → promote → test:it:promote-skill」だと、fixture 更新直後の時点では promoted 側がまだ旧文言のままのため、その eval 実行は実際には GREEN にならず fail し続ける（GREEN になるのは promote 実行後）。これは iteration 1 で指摘した論点の再発であり、今回の改版でも順序自体は修正されていない。実装者が手順どおりに進めると、この時点で想定外の fail に遭遇し得る。最終的な `test:all`／validator 実行でカバーされ実害は小さいため gate はブロックしないが、「eval GREEN を確認し記録」のステップを `promote` の直後に移すか、fixture 更新直後のステップを「(promoted 未反映のため、この時点では fail のままでよい)」という注記に変えることを推奨する。
- 上記を除けば、WF1〜WF4 は R001〜R003 の範囲を過不足なくカバーしており、business-rules.md に列挙された「触れない対象」（sensors 実装・validator 実装・イベントタキソノミー・Skill Contract consumer role・歴史的記録）にも抵触していない。
