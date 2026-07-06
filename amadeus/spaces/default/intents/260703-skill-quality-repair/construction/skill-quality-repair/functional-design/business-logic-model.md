# 業務ロジックモデル — unit: skill-quality-repair

## 入力と前提

- 上流入力は `inception/requirements-analysis/requirements.md`（R001〜R006、N001〜N004）である。
- scope refactor により units-generation と application-design はスキップ済みであり、unit-of-work、unit-of-work-story-map、components、component-methods、services は設計どおり不在である。本 unit は Intent 全体を 1 unit（skill-quality-repair）として扱う（functional-design-questions.md Q4=A）。
- 既存コード構造（`skills/amadeus*/`、`.agents/skills/amadeus*/`、`dev-scripts/promote-skill.ts`、`AmadeusValidator`）を事実上のアプリケーション設計として参照する。

## ワークフロー概要

本 unit は 5 個のワークフローで構成し、単一 Bolt / 1 PR で実施する。

| WF | 対応要求 | 概要 |
|---|---|---|
| WF1 監査 | R001 | 全 amadeus-* skill を 4 観点で判定し、監査記録を作る |
| WF2 補修 | R002、R003 | 非ステージ skill を修正し、promote で昇格する |
| WF3 Grilling 規約 | R004 | 生成規約とテンプレートを 1 箇所に定義し、生成側を結線する |
| WF4 入力契約 | R005 | Issue 入力 skill に短縮参照契約を追記し、検査を追加する |
| WF5 #341 後始末 | R006 | 言語 policy 判定から #341 の close 可否を記録する |

## WF1: 監査（R001）

1. 対象列挙: `skills/amadeus*/` 直下の全 skill を列挙し、ステージ skill（38 個の上流適応コピー）と非ステージ skill（公開入口、補助入口、その他）に分類する。
2. 観点判定: 各 skill に対して 4 観点（description/trigger 品質、構造分割、言語 policy 適合、コマンド・パスの実行可能性）を判定する。判定基準は business-rules.md の監査判定ルールに従う。
3. 記録: 判定結果を `construction/skill-quality-repair/audit-report.md` に skill × 観点の判定表として記録する（Q1=A）。
4. 通知: PR 作成後、#340 へ要約と監査記録へのリンクをコメントする。

## WF2: 補修（R002、R003）

1. WF1 の findings を分類する。分類語彙は `repairable` / `parity-limited` / `deferred` の 3 値に統一する（domain-entities.md のライフサイクルと同一）: (a) 非ステージ skill の問題 → `repairable`（修正対象）、(b) ステージ skill の問題かつ parity 契約内（改名・grilling 結線）→ `parity-limited`（parity 内修正）、(c) ステージ skill の問題かつ parity 逸脱 → `deferred`（後続 Issue 候補として記録）。
2. 修正対象を source（`skills/amadeus*/`）で修正する。
3. `bun run dev-scripts/promote-skill.ts <skill> --replace` で昇格する（N003）。
4. `npm run parity:check` でステージ skill のパリティ維持を確認する（N002）。

## WF3: Grilling Decision Trail 規約（R004）

1. `AmadeusValidator` の検査コードから、`grillings.md` の一覧に必要な列と、session ファイルの `概要`、`確定判断`、`質問記録` の必須項目を抽出する。
2. `skills/amadeus-grilling/references/` に、生成規約の記述とコピー用テンプレートの両方を定義する（Q3=A）。
3. Grilling Decision Trail を生成する skill（少なくとも intent-capture 系の生成経路）から、この規約への参照を結線する。ステージ skill 側の変更は grilling 結線の範囲に収める（parity 契約内）。
4. 検証: 規約に従って新規生成した Grilling Decision Trail が、目視追従なしに `AmadeusValidator` を pass することを確認する。

## WF4: GitHub Issue 短縮参照の入力契約（R005）

1. GitHub Issue を入力に取る公開 skill を特定する（`amadeus` の Intake 経路を起点に列挙する）。
2. 各対象 skill の入力契約に、`#nnn` ≡ Issue URL の等価規則、`owner/repo#nnn` の受理、repository 文脈が曖昧な場合の停止確認を追記する。
3. 決定論的検査（対象 skill に入力契約の記載が存在することを検査するスクリプト）を追加し、references に検証手順を記載する（Q2=A）。

## WF5: #341 の後始末（R006）

1. WF1 の言語 policy 観点の判定結果から、残日本語のある skill（現時点で 3 個）が policy 違反か、許容される日本語（ユーザー向け gate 文言・成果物例）かを判定する。
2. 判定結果を監査記録に記録する。
3. 残作業なしと判定した場合、判定根拠を添えて #341 の close を提案する。残作業があると判定した場合は、残件を監査記録に記録して #341 の継続（close しない）を提案するに留める。SKILL.md 全面英語化の実施作業そのものは requirements.md の対象外であり、本 Bolt では実施しない。個別の言語 policy 違反が R002 の非ステージ skill 補修に該当する場合だけ、その finding は WF1 の分類に従い `repairable` として WF2 で扱う（WF5 からの合流経路ではない）。

## 処理順序と依存

```
WF1（監査） --> WF2（補修） --> promote --> 検証（N001〜N004）
WF1 --> WF5（#341 判定）
WF3（Grilling 規約） --> 検証（validator pass）
WF4（入力契約） --> 検証（決定論的検査）
```

- WF2 と WF5 は WF1 の判定結果に依存する。
- WF3 と WF4 は WF1 と独立に進められるが、対象 skill が WF2 の修正対象と重なる場合は同一 skill への変更を 1 回の編集に統合する。
- 最終検証は `npm run test:all`（N001）でまとめて行う。

## Review
**Verdict**: READY
**Iteration**: 2
**Findings**:
- 解消済み：WF5 Step 3 と requirements.md 対象外節の矛盾。WF5 は「残作業がある場合は本 Bolt 内で補修する（WF2 に合流）」という記述を廃し、現在は「残作業があると判定した場合は、残件を監査記録に記録して #341 の継続（close しない）を提案するに留める。SKILL.md 全面英語化の実施作業そのものは requirements.md の対象外であり、本 Bolt では実施しない。」と明記している。R002 該当（非ステージ skill の言語 policy 違反）に限り WF1 の分類で `repairable` として WF2 に流れる経路のみが残り、WF5 からの一般的な合流経路は存在しない。「処理順序と依存」の依存図も WF5→WF2 の合流エッジを含んでおらず、記述と整合している。
- 解消済み：business-rules.md の「入力参照解決ルール（WF4）」から、R005 に根拠のない 4 点目（Issue/PR 曖昧時の確認ルール）が削除され、requirements.md R005 の 3 点（等価規則、owner/repo#nnn 受理、文脈曖昧時の停止）とちょうど一致する記載になった。
- 解消済み：AuditFinding の分類語彙が `repairable` / `parity-limited` / `deferred` の 3 値に統一された。business-logic-model.md WF2、domain-entities.md の一覧表とライフサイクル図、business-rules.md の parity 境界ルールがいずれも同一語彙を使っており（日本語の補足語「（修正対象）」等は英語 canonical 語への注釈として残るのみで、競合する分類軸ではない）、audit-report.md 生成時にどの語彙を正とするか迷う余地はない。
- 新規の矛盾は検出されなかった。Q1〜Q4（すべて A）の確定回答、requirements.md の R001〜R006・N001〜N004、および 4 成果物（business-logic-model.md、business-rules.md、domain-entities.md、frontend-components.md）の内容は整合しており、WF1〜WF5 の依存関係、上流不在（unit-of-work 等）の明示的な言及、frontend-components.md の CONDITIONAL 不適用判断もいずれも妥当である。
