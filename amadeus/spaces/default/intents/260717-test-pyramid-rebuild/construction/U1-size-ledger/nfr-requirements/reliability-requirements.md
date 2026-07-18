上流入力(consumes 全数): business-logic-model.md, business-rules.md, domain-entities.md, unit-of-work.md, requirements.md, decisions.md, technology-stack.md

本 NFR は既存技術スタック(codekb `technology-stack.md`: TypeScript/ESM・Bun ランタイム・Biome・bun test)を前提とし、新規ランタイム依存を追加しない(project.md Forbidden: Bun-only 前提維持)。

# 信頼性要件 — U1 サイズ分類台帳(SizeLedger)

本書は U1(台帳生成)の**信頼性非機能特性**を、将来条件チェックリスト(requirements-analysis:c4、requirements.md:45-50)の「クラッシュ耐性」項と、functional-design のエラーハンドリング設計(business-logic-model.md:42-49)から規定する。サービス稼働・可用性 SLO・監視は本ユニット Out(U1 はサービスでなく静的分類スイープであり利用者向け SLI を持たない)。本 intent は**設計・台帳 materialize まで**。

実測 ref: 検証 HEAD `6c0faab6adf89a461aa5b3467b3f29d595ae6d60`(`git rev-parse HEAD` 実測)。

## REL-1: クラッシュ耐性 — 部分失敗の局所化(将来条件 c4)

将来条件「台帳生成は決定的スイープ(部分失敗は該当ファイルのみ)」(requirements.md:48)に対する耐性を規定する。

- **部分失敗の局所化**: 個別ファイルのソース読取失敗は**該当行を欠落として記録**(note へ理由を残す)し、**スイープ全体を停止しない**(business-logic-model.md:46、component-methods.md:52)。1ファイルの I/O 例外が 442 件のスイープを巻き添えにしない設計(統合境界のエラーハンドリング、construction.md「Error Handling」)。
- **サイレント失敗の禁止 = 欠落の可視化**: 読取失敗は欠落行 + note として**可視化**し握りつぶさない(business-logic-model.md:48、construction.md「エラーは呼び出し元へ伝播させるかログに記録する」)。欠落が生じた場合、**台帳の行数が母数 442 を下回ることが検出可能な形**にする(business-logic-model.md:48)。これにより部分読取が「confident な誤台帳」を無音生成するフェイルオープン(検証劇場 Forbidden、org.md/team.md P2)を構造的に防ぐ。
- **回復可能性による分類**: ファイル読取失敗は「該当行欠落 + note で継続」= 回復可能エラーとして扱い(error-classification、construction.md)、スイープ全体を止める致命的エラー(フェイルファスト)とは区別する。母数不足の検出可能性がフェイルファスト側の安全網となる。

## REL-2: 決定性とアトミック性

台帳の再現性・原子性を規定する。

- **決定性(同一入力 → 同一出力)**: `buildLedgerRow` / `buildSizeLedger` は純関数で、同一入力に対し同一出力(file 昇順ソート、`test-size.ts:176` 同型、business-logic-model.md:47)。読取順・並列 tier 実行順に依存しない。台帳は observed ref(`observedRef`、domain-entities.md:49)を必須フィールドとして運び、どの HEAD で計測したかを型で強制する(ref 無しの台帳を表現不能にする、measurement-ref-in-artifacts)。これにより台帳の数値が再計測で再現可能(reproducible)であることを保証する。
- **アトミック性(全成功か明示欠落か)**: 台帳の完全性は「442 行全数材料化 = 完全」と「行数 < 442 = 欠落あり(検出可能)」の2状態に閉じ、部分書き込みが**成功を騙る**中間状態を持たない(AC-1a 全数材料化、unit-of-work.md:47)。集計マトリクスは全 `LedgerRow[]` から `buildSizeLedger` が一括構成する派生物(domain-entities.md:68-70)であり、行と集計の不整合を持たない(First-Class Collection で集計を型内に閉じる、domain-entities.md:56)。
- **決定的スイープであること(LLM でない)**: 分類は `classifyTestSize` の regex 純関数の全数直接適用であり LLM fan-out を用いない(business-logic-model.md:49、team.md deterministic-function-direct-sweep)。判定ブレを持ち込まず、同じ observed ref に対し何度実行しても同一の台帳を得る(信頼性の根拠 = 決定性)。

**適用外(反証可能根拠付き N/A、N/A≠PASS)**:
- **サービス可用性 SLO**: N/A。U1 は利用者向けの常駐サービス・SLI を持たない静的分類スイープであり、observability-setup:c3 の「runtime service/SLI 不存在時は timeout/単発 run 成功を service SLO へ昇格させない」に従い、可用性パーセンテージ・時間窓は該当機構なしとして設けない(発明しない)。
- **リトライ/フォールバック機構**: N/A。決定的純関数スイープであり、外部依存の一時障害を持たない(ネットワーク・DB・外部サービス呼び出しがない、security-requirements.md SEC-1)。読取失敗は欠落記録で足り、リトライ機構は要求根拠がないため追加しない(Forbidden P5)。

**実装スコープ境界(Out 明記)**: 生成スクリプトの実装・部分失敗注入テスト・CI 配線は本 intent Out(別 intent、business-logic-model.md:53)。本書は信頼性特性の設計・宣言までである。
