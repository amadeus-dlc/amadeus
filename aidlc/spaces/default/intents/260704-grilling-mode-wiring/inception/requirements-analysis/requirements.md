# Requirements — 260704-grilling-mode-wiring

対象 Issue: https://github.com/amadeus-dlc/amadeus/issues/442
scope: bugfix（Minimal depth）

## Intent 分析

AMADEUS.md は、上流 38 skill への適応点を「skill 名の改名」と「質問提示の `amadeus-grilling` プロトコルへの結線」に限定すると定めている。
しかし grilling 結線はステージ質問に対して構造的に一度も発火しない。
エンジンの `ask` directive はルーティング質問 3 箇所に限られ、ステージ質問の実経路（`stage-protocol.md` Step 2 の 3 択 mode 選択）には結線が届いていない。

この Intent の目的は、宣言済みの契約（grilling 結線）を実行時に読まれる場所へ配線し直し、ユーザーがステージ質問を一問ずつ推奨回答付きで受けられる選択肢を提供することである。
新機能の追加ではなく、「宣言されているが発火しない結線」の修正である。

本 Intent は ideation を SKIP する bugfix scope のため、intent-statement と scope-document は成果物として存在しない。
両者に相当する内容（背景、確定判断、受け入れ条件）は Issue #442 に記録済みであり、intent description は `audit/` の workflow 記録に残っている。
team-practices は `aidlc/spaces/default/memory/team.md`（Git Branching Policy、PR 粒度制約を含む）を参照する。

## 機能要求

| ID | 要求 | 出典 |
|---|---|---|
| R001-grill-me-mode-insertion | run-stage でステージ質問ファイル（`<stage>-questions.md`）を埋めるとき、mode 選択を「Guide me / Grill me / I'll edit the file / Chat」の 4 択（この順）で提示する。挿入位置は 2 番目、既定は Guide me 温存。 | Issue #442 確定判断 |
| R002-annex-rendering-rule | `skills/amadeus/references/question-rendering.md` に Grill me 選択時のレンダリング規則（一問ずつ、推奨回答と根拠付き、`[Answer]:` 書き戻し、`aidlc-log.ts decision/answer` 記録）を定義する。annex を正規フックポイントとする。 | Issue #442 確定判断 |
| R003-conductor-run-stage-wiring | `skills/amadeus/SKILL.md` の `run-stage` 行に、mode 選択を 4 択で提示する指示を追加する。 | Issue #442 実施内容 |
| R004-engine-bridge-mode-definition | `skills/amadeus-grilling/references/engine-bridge.md` に mode 挿入の定義を追記する。 | Issue #442 実施内容 |
| R005-stage-skill-wording-alignment | 結線ボイラープレートを持つ 29 ステージ skill の矛盾文言（「質問時は常に bridge に従え」）を「mode 選択に Grill me を 2 番目で提示し、選択時は bridge に従う」へ一括置換で揃える。 | Issue #442 確定判断 |
| R006-grilling-wiring-check | 結線を守る決定論的検査 `dev-scripts/check-grilling-wiring.ts` を新設し、`package.json` に専用エントリを追加して `test:ci:mock` 連鎖に組み込む。検査観点は「annex に Grill me mode 定義がある」「29 skill の結線文言が揃っている」「source と昇格先が一致している」。 | 本ステージ Q1 回答 |
| R007-promotion-sync | 変更 skill を `dev-scripts/promote-skill.ts --replace` で昇格し、source と昇格先を同期する。 | Issue #442 実施内容 |

## 非機能要求

| ID | 要求 |
|---|---|
| N001-existing-mode-unchanged | Guide me / I'll edit the file / Chat の既存挙動と表記を変更しない。 |
| N002-parity-preserved | `aidlc-common/` に差分を作らず、`npm run parity:check` が pass する（`engineFileExceptions` は空のまま）。 |
| N003-deterministic-check | R006 の検査は決定論的であり、LLM を呼ばない。 |
| N004-label-language | Grill me のラベルは「Grill me」、説明は既存 3 択の表記言語（英語）に合わせる。one question at a time, recommended answer attached（bridge 準拠）の趣旨を書く。 |

## 制約

- `aidlc-common/`（`stage-protocol.md` を含む）は変更しない。parity の byte-match 対象である。
- `skills/amadeus*/SKILL.md` と TS スクリプトは英語必須（Skill Language Policy）。
- dev-script は TDD で進める。先に失敗する検証を書き、失敗を確認してから最小実装を入れる（`.agents/rules/dev-scripts.md`）。
- skill 昇格は `dev-scripts/promote-skill.ts --replace` を使い、手動同期しない。
- PR 粒度: 新規 wiring 検査は skill 変更なしでは fail するため、team.md の粒度制約の例外（不可分ケース）として skill 変更と同一 PR にする。例外理由を PR 説明に記録する。

## 前提

- annex（`question-rendering.md`）は `stage-protocol.md` 冒頭で質問レンダリングの正規参照先として名指しされており、annex 修正は主経路と単独ステージ経路の両方に効く（裏取り済み）。
- `parity:check` は skill を存在チェックのみで照合するため、skill 文言変更は parity と衝突しない（`dev-scripts/parity-check.ts` で裏取り済み）。
- 結線ボイラープレートを持つのは 38 skill 中 29 skill であり、3 行の文言は完全同一である（grep で確認済み）。対象は source の `skills/amadeus-*/SKILL.md` と昇格先の `.agents/skills/amadeus-*/SKILL.md` の両方であり、昇格先は R007 の promote 経由で同期する。

## スコープ外

- Grill me の既定昇格（Guide me より前に置く変更）。運用実績を見て別 Issue で判断する。
- エンジン（`aidlc-orchestrate.ts`）の `ask` directive をステージ質問へ拡張する変更。
- `claude-wiring:check`、`parity:check` の既存検査観点の変更。

## 未解決事項

- 29 skill へ一括置換する新文言の正確な文面は、code-generation ステージで確定する（趣旨は R005 のとおり）。
- R003（`run-stage` 行への指示追加）と R004（`engine-bridge.md` への mode 挿入定義）の正確な文面も同様に code-generation ステージで確定する。本ステージで確定しているのは趣旨と挿入位置である。

## Review

**Verdict: READY**

- Step 10 が求める 7 セクション（意図分析、機能要求、非機能要求、制約、前提、スコープ外、未解決事項）がすべて揃っており、見出しの粒度も既存フォーマットに合っている。
- 機能要求（R001〜R007）はすべて Issue #442 の確定判断・実施内容、または本ステージ Q1/Q2 の回答に出典が張られており、Q&A ファイルとの往復に矛盾やオーファンがない。特に Q1 → R006、Q2 → N004 の対応は明確である。
- R001（4択の順序と挿入位置、既定温存）、R006（検査観点と組み込み先）は検証可能な粒度で書かれており、QA が「4択の並びになっているか」「dev-script が該当観点を assert するか」を機械的に確認できる。
- スコープ外セクションで「Grill me の既定昇格」「エンジンの ask directive 拡張」「既存検査観点の変更」を明示的に除外しており、bugfix scope の最小深度を守っている。速度優先の機能追加や UI 改善など、issue に無い要求の混入は見当たらない。
- 制約セクションが `aidlc-common/` 非変更・parity 維持・PR 粒度例外の記録要求を明記しており、後続 Construction での逸脱を防ぐガードになっている。

以下は軽微な指摘であり、いずれも READY 判定を妨げるものではない。

- R005 は「29 skill への一括置換文言は code-generation で確定する」と未解決事項に明記されているが、同様に文言が未確定な R003（run-stage 行への指示追加）・R004（engine-bridge.md への定義追記）は未解決事項に含まれていない。対称性のため、この 2 件も文言確定を code-generation 側に委ねる旨を一行加えると、読み手が「R003/R004 はこのステージで文言まで確定済み」と誤読するリスクを減らせる。
- 前提セクションの「結線ボイラープレートを持つ 29 skill」が具体的にどのパス（`skills/amadeus-<stage>/SKILL.md` か、昇格先の `.agents/skills/amadeus-<stage>/SKILL.md` か）を指すかが本文中で明示されていない。R007 の昇格同期要求から推測はできるが、code-generation ステージでの解釈揺れを防ぐため、対象パスパターンを一言添えるとより堅牢になる。
