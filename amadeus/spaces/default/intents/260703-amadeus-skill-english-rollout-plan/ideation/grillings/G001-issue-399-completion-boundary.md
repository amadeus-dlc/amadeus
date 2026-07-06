# G001：Issue #399 の完了境界

## 概要

- 状態: completed
- 対象: Intent `260703-amadeus-skill-english-rollout-plan` の Intent Capture
- 反映先: [intent-capture-questions.md](intent-capture/intent-capture-questions.md)

Issue #399 を起点にした Amadeus skill 英語化実施計画の完了境界を確認した。

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD001 | この Intent は親タスクの実施計画管理に限定する。 | superseded | [intent-capture-questions.md](intent-capture/intent-capture-questions.md) の Q001 | GD004 |
| GD002 | 子 Issue の PR 作成や完了確認は、それぞれの後続作業で扱う。 | superseded | [intent-capture-questions.md](intent-capture/intent-capture-questions.md) の Q001 | GD004 |
| GD003 | 成功は、Issue #399、Intent 成果物、後続の計画成果物から、#395、#400、#401、#402 の順序、依存関係、完了境界、各 Issue の扱いを追跡できることで観測する。 | superseded | [intent-capture-questions.md](intent-capture/intent-capture-questions.md) の Q003 | GD005 |
| GD004 | この Intent は #395、#400、#401、#402 の完了まで含める。 | superseded | [intent-capture-questions.md](intent-capture/intent-capture-questions.md) の Q001 | GD009 |
| GD005 | 成功は、Issue #399、Intent 成果物、後続の計画成果物から、#395、#400、#401、#402 の順序、依存関係、完了境界、完了状態を追跡できることで観測する。 | superseded | [intent-capture-questions.md](intent-capture/intent-capture-questions.md) の Q003 | GD009 |
| GD006 | 子 Issue の完了まで含める理由は、作業が細切れになりすぎることを避けるためである。 | active | [intent-capture-questions.md](intent-capture/intent-capture-questions.md) の Q004 | なし |
| GD007 | 子 Issue の完了は、対応 PR の merge または明示的な Issue close で観測する。 | active | [intent-capture-questions.md](intent-capture/intent-capture-questions.md) の Q005 | なし |
| GD008 | #401 配下の #391、#392、#393、#394 は #401 の完了証拠として追跡し、個別の完了そのものはこの Intent の直接完了条件にしない。 | superseded | [intent-capture-questions.md](intent-capture/intent-capture-questions.md) の Q006 | GD010 |
| GD009 | Issue #399 は、#395、#400、#401、#402 の完了に加えて、RU002〜RU006 の段階的英語化完了まで含める。 | active | [intent-capture-questions.md](intent-capture/intent-capture-questions.md) の Q007 | なし |
| GD010 | #391、#392、#393、#394 は、#401 の計画証拠だけで代替せず、個別完了または対象外判断を Issue #399 の残タスクとして追跡する。 | active | [intent-capture-questions.md](intent-capture/intent-capture-questions.md) の Q007 | なし |

## 質問記録

### Q001

- 確認したいこと: Issue #399 の完了条件は、子 Issue の順序と依存関係を追跡できることに限定するか、それとも各子 Issue の PR 作成や完了まで含めるか。
- 確認が必要な理由: Intent の完了境界に直結する。子 Issue の完了まで含めると、親タスク管理と各子 Issue の実施が単一 Intent に混ざる。
- 推奨回答: この Intent は親タスクの実施計画管理に限定し、子 Issue の PR 作成や完了は各 Issue の後続作業で扱う。
- 推奨理由: Issue #399 の受け入れ条件は、子 Issue の依存関係が明確であることと、親 Issue から処理順を追えることである。各子 Issue の PR 作成や完了は、#395、#400、#401、#402 の個別作業として独立して完了判断できる。
- ユーザー回答: 前回答を撤回し、子 Issue の完了まで含める。細切れになることを避けるため。
- 確定判断: GD004

### Q003

- 確認したいこと: 成功はどう観測するか。
- 確認が必要な理由: Intent の成功条件を、実装や子 Issue 完了ではなく観測可能な状態として固定する必要がある。
- 推奨回答: Issue #399、Intent 成果物、後続の計画成果物から、#395、#400、#401、#402 の順序、依存関係、完了境界、各 Issue の扱いが追跡できることを成功条件にする。
- 推奨理由: Q001 で親タスクの実施計画管理に限定すると決めたため、成功条件も子 Issue の実施結果ではなく追跡可能性に合わせる必要がある。
- ユーザー回答: #395、#400、#401、#402 の完了まで追跡できることで観測する。
- 確定判断: GD005

### Q004

- 確認したいこと: なぜ今この作業を始めるのか。
- 確認が必要な理由: Intent の契機を固定し、親タスク管理だけで閉じない理由を後続が追跡できるようにする必要がある。
- 推奨回答: Amadeus skill 英語化を一括変更にせず、小さい土台 PR から段階的に進める前に、親 Issue #399 で順序と依存関係を固定する必要があるため。
- 推奨理由: Issue #399 は段階的な実施計画の親タスクであり、子 Issue の順序と依存関係を維持する役割を持つ。
- ユーザー回答: 子 Issue の完了まで含めないと作業が細切れになりすぎるため。
- 確定判断: GD006

### Q005

- 確認したいこと: 子 Issue の完了は何で観測するか。
- 確認が必要な理由: この Intent が子 Issue の完了まで含めるため、完了証拠を PR merge と Issue close のどちらで扱うかを固定する必要がある。
- 推奨回答: 各子 Issue が対応 PR の merge または明示的な close に到達し、Issue #399 と Intent 成果物からその完了状態を追跡できることを完了証拠にする。
- 推奨理由: 実装 PR を伴う Issue と、方針判断やスコープ外判断で close する Issue の両方を扱える。
- ユーザー回答: PR merge または Issue close で観測する。
- 確定判断: GD007

### Q006

- 確認したいこと: #401 配下の #391、#392、#393、#394 はこの Intent の完了条件に含めるか。
- 確認が必要な理由: #401 は #391〜#394 の扱いを整理する Issue であり、親 Intent の完了条件が #401 だけか、その配下 Issue まで直接含むかを固定する必要がある。
- 推奨回答: #401 の完了証拠として #391、#392、#393、#394 の扱いを追跡し、#401 が close または対応 PR merge に到達した時点で親側の完了条件を満たす。#391〜#394 個別の完了そのものをこの Intent の直接完了条件にはしない。
- 推奨理由: #401 の責務は #391〜#394 の対応順と PR 分割の確定であり、#391〜#394 の個別完了まで親 Intent の直接条件にすると完了境界が広がりすぎる。
- ユーザー回答: #401 の完了証拠として追跡する。#391〜#394 個別の完了そのものは直接完了条件にしない。
- 確定判断: GD008

### Q007

- 確認したいこと: #399 は直接子 Issue の完了だけで閉じるか、それとも `SKILL.md` 全面英語化まで含めるか。
- 確認が必要な理由: 直接子 Issue の完了だけで閉じると、Amadeus 系 `SKILL.md` が未英語化のまま親 Issue が完了扱いになる。
- 推奨回答: #399 は、#391〜#394 の差分対応と RU002〜RU006 の段階的英語化完了まで含める。
- 推奨理由: Issue #399 は「方針確定 → 小さい英語化 PR → 意味差分対応 → 残り skill の段階的英語化」を親タスクとして管理するため。
- ユーザー回答: `SKILL.md` がまだ英語化されていないため、全面的な英語化まで含める。
- 確定判断: GD009、GD010
