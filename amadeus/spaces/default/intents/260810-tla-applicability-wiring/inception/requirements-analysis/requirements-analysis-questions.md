# Requirements Analysis — 明確化質問（260810-tla-applicability-wiring）

> E-OC1 判定: 本ファイルの3問はいずれも仕様・受け入れ基準の確定に関わるユーザー裁定事項（既決ノルム・一次証拠から一意に導出できない価値判断を含む）であり、選挙不要判定の対象外。ユーザーへ直接諮る。
> 既決事項（再質問しない）: 対応方式 = 案A（Issue #2766 裁定コメント 2026-08-10、5項目）、スコープ = self-fix、BR-U2-05/ADR-6 との契約衝突の解消方式 = 設計段で明示裁定、FR-005 receipt の同一修正での閉包、stage 層 opt-in（`scopes: []`）の維持。

## Q1: 要件見出し文法の不一致（RE 主要所見 🔴 R1）への対応方向

RE 実測: `REQUIREMENTS_HEADING_RE`（`tla-evidence.ts:45` = `/^###\s+((?:FR|NFR|AC)-\d{3})\b/`）に一致する requirements.md は **134 intent 中 3 件のみ**。実コーパスの主流は `### FR-1` / `### FR-CROSS-1` 等の非3桁形（503 件）。対照の decisions 側（`ADR-\d+`）は 56 中 54 で健全。案A の供給経路が intent 要件を直接評価する場合、現行 regex では大半の intent で `unresolvable-id` fail-closed になる。

- A. **stable-id 抽出文法を実コーパスの文法へ拡張する**（`FR-1` / `FR-CROSS-1` / `NFR-1` / `AC-1` 等の実在形を受理。既存3桁形も引き続き受理） — 既存登録モデルへの影響なし（登録済み evidence は decisions/3桁形由来）
- B. 供給側（subjects 宣言の書き手）で id を3桁形へ正規化して digest する（抽出文法は不変）
- C. 統治対象を decisions（ADR）へ寄せ、requirements 面の統治は将来課題とする
- D. 統治対象文書には3桁形を要求し、非適合文書は宣言不可とする（現状固定）
- X. Other (please specify)

[Answer]: A — stable-id 抽出文法を実コーパスの文法へ拡張する（`FR-1` / `FR-CROSS-1` / `NFR-1` / `AC-1` 等の実在形を受理、既存3桁形も維持。登録済み evidence への影響なし）。ユーザー承認: 2026-08-10T01:00:12Z

## Q2: 受け入れ基準の射程（#2267 との交差）

`pluginManifestPath` は `<projectRoot>/plugins/<plugin>/plugin.json` を読むため、宣言駆動 advisory は `plugins/` を持つ本リポジトリ（自己開発）でのみ機能する。ユーザーワークスペースへの投影は #2267（OPEN・別 Issue）の解消に依存する。

- A. **本リポジトリ（自己開発）で機能することを受け入れ基準とし、配布面は #2267 依存として Out of scope に明示する**
- B. 配布面（ユーザーワークスペース）まで本 intent の受け入れ基準に含める（#2267 の修正を本 intent へ取り込む — スコープ拡大）
- X. Other (please specify)

[Answer]: A — 本リポジトリ（自己開発）で機能することを受け入れ基準とし、配布面（ユーザーワークスペース）は #2267 依存として Out of scope に明示する。ユーザー承認: 2026-08-10T01:00:12Z

## Q3: 段階導入 — governed subjects の初期集合

evidence store（`specs/tla-evidence`）は未作成であり、subjects を宣言した瞬間から該当 identity の applicability receipt が無ければ全 intent の RA/FD/B&T checkpoint が hold で停止する。初期宣言の集合をどう定めるか。

- A. **空集合から開始する** — 供給経路（書き手・判定・receipt 発行）を完成させ、実宣言の投入は「形式検証対象」と判定された最初の対象から段階導入する（着地直後の全 intent 停止を構造的に回避。落ちる実証はテスト fixture で担保）
- B. 既存2モデル（FormalElection / MirrorLifecycle）の対応 subjects を初期宣言し、receipt 整備まで hold を許容する（即時に統治が効くが、全 intent の checkpoint が receipt 整備完了まで停止する）
- X. Other (please specify)

[Answer]: A — 空集合から段階導入する。供給経路（書き手・判定・receipt 発行）を本 intent で完成させ、実宣言の投入は「形式検証対象」と判定された最初の対象から行う。落ちる実証（hold の実発火）はテスト fixture で担保する。ユーザー承認: 2026-08-10T01:00:12Z

## 裁定の記録

- 2026-08-10T01:00:12Z — Q1=A / Q2=A / Q3=A（3問とも推奨案）。ユーザーが AskUserQuestion（guided モード）で直接裁定・承認: 2026-08-10T01:00:12Z。E-OC1 判定どおり全問ユーザー裁定事項として処理し、選挙・自動裁定は使用していない。
