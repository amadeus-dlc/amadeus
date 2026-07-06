# Requirements：旧 evaluator 語彙の sensors 読み替え

Intent: 260705-evaluator-vocabulary
対象 Issue: [#439](https://github.com/amadeus-dlc/amadeus/issues/439)
確定判断の記録: `requirements-analysis-questions.md`（Q1、Maintainer 包括委任に基づく自己回答）

## Intent 分析

#240 の後段評価機構はエンジンの sensors として実現済みだが、規範文書に旧語彙 `evaluator`（未実装の独立実体を指す）が残存し、現行基盤と食い違っている。本 Intent は残存箇所を sensors 語彙へ読み替え、検査責務の分担記述を現行実装に整合させる。

scope refactor は Ideation をスキップするため、intent-statement と scope-document は存在しない（設計どおりの不在）。Intent の目的は #439 と本書を正とする。

## 機能要求

### R001-team-md（#439 対象 1）

`aidlc/spaces/default/memory/team.md` の次の記述を sensors 語彙へ読み替える（Q1=A）。

1. 判断基準の「検査責務の境界は、validator = 成果物構造の検証、evaluator = 意味と接続性の評価として扱う。」
2. Git Branching Policy「検出境界」節の「evaluator で検出する候補は…」以下の分担記述。

読み替え後の分担: validator = 実行時の構造検出、sensors = gate 時の接続性・品質評価（`required-sections` / `upstream-coverage` / `linter` / `type-check`、`SENSOR_FIRED` として audit 記録）。人間判断に残す候補の記述は変えない。

### R002-validator-skill（#439 対象 2）

`skills/amadeus-validator/SKILL.md` の evaluator 記述 2 箇所を sensors 語彙へ読み替え、`bun run dev-scripts/promote-skill.ts amadeus-validator --replace` で昇格先を同期する（skill 変更の粒度制約に従い、source と昇格先の同期を同一 PR に含める）。SKILL.md は英語のため読み替えも英語で行う。

付随して、`dev-scripts/evals/amadeus-templates/check.ts` が旧文言（"The evaluator's result is quality evaluation..."）をハードコードで assert しているため、同 eval の期待文言を新しい sensors 文言へ追随更新する（SKILL 変更 → eval RED 確認 → fixture 更新で GREEN、という自然な RED→GREEN 証跡を code-summary に残す）。skill 文言と fixture は不可分のため同一 PR に含める（粒度制約の例外記録として PR 説明に明記する）。

### R003-residual-sweep

上記 2 対象以外に `evaluator` の残存がないかを repo 全体で検索し、次の 3 分類で判定表を作る（code-summary に記録）。

1. **読み替え対象**: #240 系の「未実装の独立評価機構」を指す規範文書の記述。
2. **対象外（別概念・現行契約）**: Skill Contract の consumer role `evaluator`（`skills/amadeus-validator|amadeus-grilling/references/skill-contract.md` の source / 昇格先と、contracts catalog の TS）。#240 の廃止機構とは別の生きた概念であり、本 Intent では触れない。改名の要否は別議論として disposition に記録する。
3. **対象外（歴史的記録）**: audit、過去 Intent record、Issue 引用。書き換えない。

## 非機能要求

| ID | 要求 | 検証方法 |
|---|---|---|
| N001-no-orphan-vocab | 規範文書に、実体のない evaluator を独立機構として指す記述が残らない。 | `grep -ri evaluator` の全ヒットが R003 の 3 分類（読み替え済み / 別概念・現行契約 / 歴史的記録）に判定されること（code-summary に判定表） |
| N002-standard-verification | `npm run test:all`（promote-skill 検証含む）が pass する。 | `npm run test:all` の実行（exit 0） |
| N003-artifact-validity | 本 Intent 成果物が構造検証を pass する。 | `AmadeusValidator . 260705-evaluator-vocabulary` |

## 制約

- 変更は文書と SKILL の語彙読み替え、および SKILL 文言をハードコードする eval fixture（amadeus-templates）の追随更新のみ。sensors 実装・validator 実装・イベントタキソノミー・Skill Contract（consumer role 定義と catalog TS）に触れない。
- 昇格先は promote 手順以外で同期しない。
- 歴史的記録（audit、完了済み Intent record）の遡及書き換えはしない。

## 前提

- 並行する #433（primary 担当）は hooks/audit 系で、本 Intent の対象（team.md の語彙 2 箇所、validator SKILL）と接触しない。team.md への追記が発生する場合は相互一報の取り決め済み。

## 対象外

- evaluator 語彙の CONTEXT.md への追加（実体がない語を確定語彙にしない）。
- sensors 基盤自体の機能変更。

## 受け入れ条件

- AC-1: team.md と validator SKILL（source / 昇格先）に、実体のない evaluator を独立機構として指す記述が残っていない（#439 受け入れ条件）。
- AC-2: 分担記述が現行 sensors 基盤（gate 時 fire、SENSOR_FIRED 記録）と整合している。
- AC-3: promote 経由の同期で `npm run test:all` が pass する。

## オープンな疑問

- なし（Q1 で確定済み）。

## Review
**Verdict**: READY
**Iteration**: 2
**Findings**:
- （解消済み）R002 の `test:all` 破壊リスク。`dev-scripts/evals/amadeus-templates/check.ts` の旧文言ハードコードを R002 の作業範囲に明示的に取り込み、SKILL 変更 → eval RED 確認 → fixture 更新で GREEN という RED→GREEN 証跡を code-summary に残す計画に改めた。制約にも「SKILL 文言をハードコードする eval fixture（amadeus-templates）の追随更新のみ」を追加し、AC-3・N002（`npm run test:all` pass）との矛盾を解消した。この eval fixture 更新は sensors/validator の実装やイベントタキソノミーそのものではなく、SKILL.md の文言を検証する dev-scripts 側の期待値更新であり、「制約：sensors 実装・validator 実装...に触れない」と衝突しない。粒度制約の例外（skill 変更 PR に fixture 更新を含める理由）も PR 説明への明記が指示されており、team.md の例外記録要件を満たす。
- （解消済み）Skill Contract consumer role `evaluator` の未判定問題。R003 が「読み替え対象／対象外（別概念・現行契約）／対象外（歴史的記録）」の3分類に再構成され、Skill Contract の consumer role（`skills/amadeus-validator|amadeus-grilling/references/skill-contract.md` の source/昇格先 計4ファイルと contracts catalog の TS）を「対象外（別概念・現行契約）」として明示的に切り分けた。制約にも「Skill Contract（consumer role 定義と catalog TS）に触れない」を追加し、N001 の検証方法も「R003 の3分類のいずれかに判定されること」に改められたため、(a) 実装（catalog TS）に踏み込む矛盾、(b) N001 を repo 全体で満たせない矛盾のいずれも解消されている。改名要否を disposition へ先送りする扱いも、本 Intent のスコープ（team.md 語彙 2箇所 + validator SKILL）と整合している。
- （非ブロッキング、軽微）非機能要求表の N002 行の検証方法が「同左」となっており、直上の N001 行（grep 判定表）と同一の検証方法を指しているように読める。N002 の要求内容は `npm run test:all` の pass であり、その検証方法は「該当コマンドを実行し結果を code-summary に記録する」であるべきで、grep 判定表とは別物のはずである。実施を妨げるものではないが、着手前に一行修正しておくと QA・実装者の誤読を防げる。
