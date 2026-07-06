# Requirements Analysis Questions：260706-adr-vocab

上流入力: Issue #525 / #527 / #560、ディスパッチ定型文（reverse-engineering 宛 decision）、本ステージの直接実測（docs/adr、CONTEXT.md、glossary.md、参照元 grep）。コードベース全体像は codekb（[architecture.md](../../../../codekb/amadeus/architecture.md)、[code-structure.md](../../../../codekb/amadeus/code-structure.md)、[business-overview.md](../../../../codekb/amadeus/business-overview.md)）を参照した。

## Q1: 語彙の正準をどこに置くか（#527 の中心論点。gate で人間確定）

- 選択肢:
  - (a) CONTEXT.md を正とし、glossary.md は workspace 側の抜粋にする。
  - (b) glossary.md を正とし、CONTEXT.md は廃止または薄い入口にする。
  - (c) 対象で分割（エンジン・開発語彙 = CONTEXT.md、ライフサイクル成果物語彙 = glossary.md）し相互参照する。
- 推奨: **(a) の改良版**（CONTEXT.md = 唯一の定義元、glossary.md = workspace 運用語彙の抜粋 + 参照。同期は CONTEXT.md → glossary の一方向）。
- 根拠（実測に基づく）:
  1. 規範の現在地: `.agents/rules/context.md` が「CONTEXT.md は定義元」を MUST で定めており、Cursor / Claude 両ハーネスの rules 読み込みが CONTEXT.md を前提にしている。(b) は規範・参照の全面書き換えで、392 行の規範体系（Avoid 語、初出形式、関係節）の移行コストに見合う便益がない。
  2. 実態の重複が小さい: glossary.md の実体は stage0/1/2 と build/host/target の運用語彙 12 語だけで、CONTEXT.md のドメイン語彙体系とほぼ重ならない。(c) の「対象分割」は分割線の定義自体が新たな曖昧さを生む（dogfooding で「エンジン開発語彙」と「ライフサイクル成果物語彙」は連続している。例: Intent、gate、audit はどちらでもある）。
  3. skill 制約との整合: `amadeus-domain-modeling` は「repo の CONTEXT.md 更新には使わない」と明記済み。(a) 改良版なら skill の反映先（glossary = 抜粋）と人間承認付きの正準更新（CONTEXT.md、gate まで）が責務分離のまま両立する。
  4. 配布との整合: CONTEXT.md は repo root（開発 repo 固有）、glossary は workspace 資産（`amadeus/spaces/<space>/knowledge/`）。利用者 workspace には glossary 側だけが現れるため、「開発 repo の正準 + workspace 抜粋」は配布境界とも一致する。
- 推奨 (a) 自身のトレードオフ（判断の対称性のため併記）:
  1. CONTEXT.md → glossary の同期は手動運用であり、自動検査を作らない以上、抜粋の乖離は将来も再発しうる（実際、今回の旧名残存はこの手動運用の乖離が現実化した実例である）。受容理由: glossary の実体は 12 語と小さく、乖離の実害は限定的で、Right-Sizing 上も docs 系 Intent に自動同期機構を作り込む便益がない。
  2. CONTEXT.md は開発 repo 固有のため、配布先 workspace の利用者からは正準が見えない（glossary 抜粋だけが届く）。受容理由: 配布先で必要なのは運用語彙であり、開発ドメイン語彙の全体は開発 repo でだけ必要という現行の利用実態と一致する。
- 判断者: 人間（leader 内容精査 → Maintainer。ディスパッチ条件）。本ステージでは推奨として記載し、gate 承認で確定する。

## Q2: ADR 有効判断 2 点の移設先（自己判断で設計段へ送る）

- 判断: 移設先は docs/amadeus/ 配下の実在文書とし、設計段で実在文書の見出し・粒度を実測して確定する（FR-1.1）。requirements 段では固定しない。
- 理由: 実在しない文書を前提に要求を固定すると、#534 の前例（実装手段の記載を鵜呑みにした誤り）を繰り返す。移設は「判断の要旨 + 経緯参照（git 履歴）」で足り、全文複製は要しない。

## Q3: 棚卸しの走査範囲（自己判断）

- 判断: 走査源は steering（team.md、project.md の Corrections）、merge 済み Intent record の decision、CONTEXT.md / glossary.md の既存内容とする。2026-07-04 以降の全 merge PR の個別走査は行わない（steering と Corrections に確定判断が集約される運用のため）。
- 理由: `.agents/rules/context.md` の追加基準（プロジェクト固有概念のみ）で選別する以上、集約先を走査すれば十分で、PR 全走査は費用対効果が合わない。選別結果は設計段で一覧化し gate で確定する。
