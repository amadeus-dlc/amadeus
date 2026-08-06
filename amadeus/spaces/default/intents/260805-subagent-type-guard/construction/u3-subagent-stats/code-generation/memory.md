<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
2026-08-06T03:10:00Z — corpus sweep の対象を「測定時点の byte スナップショット」と解釈。FD は「実 audit corpus 全数へ実行」とあるが、当 intent の監査 shard は live で追記され続けており(本 Bolt の実行自体が追記する)、CLI と独立オラクルの読取時点がずれると完全一致 assert が flake する。同一 byte を双方が読むスナップショットは実 corpus 全数の時点固定であり、FR-4b(測定 ref で時点を固定する)の精神と整合すると判断。live corpus への直接実行は R-2 実演として code-summary に別途転記。
2026-08-06T03:10:00Z — domain-entities の「`.attributes.Event` の等値判定」は v2 スキーマの記述だが、実 corpus には v1(`event` + `fields`)が 5,853 行・v2 が 1,017 行混在する。fixtures の `parseAuditRecords` と同じ両スキーマ正規化を走査層に採用(等値比較の不変条件は正規化後に適用)。
2026-08-06T03:10:00Z — corpus sweep 数値の再確定: requirements 訂正時点の 974(unknown 69 + outside 261 / 許可集合内 644)から、測定時点 2026-08-06T03:08Z では 6,870 completed(persona 1,668 / builtin 766 / unknown-type 3,735 / outside 701)、STARTED 61 に移動。Unit 横断の共通契約どおり実測時刻の値を正とし、t461 は件数リテラルを持たず独立オラクルとの一致で固定する設計とした。

## Deviations
2026-08-06T03:10:00Z — `Model` 属性が空文字の行は unresolved 側に計上(domain-entities 文言「属性があれば」に対する防御的読み)。実 corpus および U2 書込規約の下では両解釈は一致するため実挙動の差はゼロ。
2026-08-06T03:10:00Z — 実装規模はコメント込み 〜370行(unit-of-work 見積 〜120行 + テストに対し増)。内訳はエラーモデル3分類・両スキーマ正規化・text renderer 5節・JSON serializer。ロジック本体は compose / scan / render の3関数に収斂しており、過剰な抽象化は入れていない。
2026-08-06T03:15:00Z — テスト番号を t453/t454 から t460/t461 へ renumber。コミット前の origin/main 確認で t453〜t459 が別経路で着地済みと判明(並行 worker の隣接番号取得は想定内 — 作業指示の renumber 規定に従い空き番号へ移動)。

## Tradeoffs
2026-08-06T03:10:00Z — `amadeus-lib.ts` 非依存の FD 拘束により `resolveProjectDir` / active-space cursor / `normalizeAgentType` 相当を local mirror として複写(計 ~20行)。lib import の方が DRY だが、FD が固定した依存方向(stats → observability の一方向)を優先。mirror 箇所はコードコメントで正本を明示。
2026-08-06T03:10:00Z — AC-3 テストは t461 内で独立オラクル(独自 shard walker + U1 classifyAgentType)を実装。CLI の scan/compose を一切経由しないため自己参照比較(検証劇場)を回避できる一方、 walker の重複実装 ~30行をテスト側に持つ。分類器(U1)の共有は AC-3 の趣旨(分類規則の両側実証)上むしろ必須と判断。
2026-08-06T03:10:00Z — byType は (型, verdict) のペアで grouping。記録時 verdict と再分類が時点差で食い違う行が混在しても byVerdict 総和 = completedTotal の不変条件を壊さず、ランキング行が verdict を一意に持つことを優先(同一型の行を単一 verdict に丸める代替案は情報を捨てる)。

## Open questions
2026-08-06T03:10:00Z — STARTED が 61 件観測された(kimi 経路で発火 — RE 時点の「Claude Code で0件」から変化)。併記は ADR-6 どおり機能しているが、STARTED 比率が増えた場合に lifetime ペアリング(`composeSubagentLifetimes`)を再評価するかは #2303/#2297 着地後の別 intent の判断事項。
2026-08-06T03:10:00Z — corpus sweep を CI のブロッキング集合に置くか。t461 はスナップショット方式で決定的だが、corpus 自体は repo 同梱の移動値であり、別環境では件数が変わる(件数非依存の assert 設計で吸収済み)。恒常ゲート化の要否は quality-agent 判断へ委ねる。
