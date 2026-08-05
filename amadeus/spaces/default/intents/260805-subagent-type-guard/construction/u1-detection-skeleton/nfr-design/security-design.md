# U1 detection-skeleton — Security Design

**上流入力(consumes 全数)**: `business-logic-model`(U1 の処理フロー・エラーモデル — 本書の全節の設計対象)。条件解決で除外された consumes: `performance-requirements` / `security-requirements` / `scalability-requirements` / `reliability-requirements` / `tech-stack-decisions` の5点は、本 intent のスコープ(`self-feature`)が nfr-requirements ステージを SKIP しているため成果物が存在しない(engine directive の `consumes_absent` が `expected: true` で列挙 — 設計上の不在であり欠落ではない)。セキュリティ要件は requirements.md の NFR(CON-1 の transcript 非接触・検証劇場 Forbidden)と phase ルールから導出する。

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## 入力検証と出力サニタイズ

- **stderr advisory への値埋め込み**(business-logic-model の F ノード): 集合外の `agentType` 値は外部由来(ハーネス payload)の任意文字列 — `subagentPurposeLine`(`packages/framework/core/tools/amadeus-lib.ts:4109-4114`、逐語 `firstLine.replace(CONTROL_CHARS, "").trim()` — 実装時に現物を再読して行番号を再解決)と同水準の**制御文字除去**(同ファイルの `CONTROL_CHARS` 定数を再利用)を通してから advisory 文へ埋め込む(BR-U1-2 既定)。ANSI エスケープ・改行の混入によるターミナル汚染・ログ行偽装を防ぐ
- **audit 属性値**: `Type Verdict` は4値 union の閉語彙(TypeVerdict)のみを書く — payload 由来の生値を属性値にしない(値空間の閉鎖が注入面を消す)
- **`.claude/agents/` 読取**(C-1): frontmatter parse は既存の許可集合解決と同じ防御水準 — parse 不能ファイルは skip + warnings(コード実行や eval を伴わない宣言的読取のみ)

## 権限とデータ境界

- **読取のみの追加**: U1 が新設する経路は `.claude/agents/*.md` の読取と stderr 出力のみ。書込面は既存 audit emit(不変)に optional 属性を1つ足すだけ — 新しい書込先・ネットワーク送出・環境変数を導入しない(`guard-activator` — 起動者不在の設定を作らない)
- **CON-1(transcript 非接触)**: 照合は payload の `agent_type` フィールドのみを読む — prompt / transcript / last_assistant_message の本文には触れない(business-logic-model の A→B 経路が唯一の入力点)
- **秘匿情報**: persona frontmatter の `name:` 以外のフィールドは読まない(U1 範囲)— 資格情報・トークンを扱う経路なし

## 監査整合性(fail-open の安全設計)

- **監査の可用性 > 検査の完全性**: 照合層のどの throw も emit を止めない(BR-U1-3)— 検査機能の欠陥が監査記録の喪失に昇格しない構造。これは「fail-open が安全側」である例外的ドメイン(advisory 検査が主、audit append-only が従の関係を逆転させない)
- **検証劇場の禁止**(org.md Forbidden): verdict は実行時の照合結果からのみ導出 — ハードコード・自己参照比較を持たない。C-2 は純関数で同一入力に同一 verdict(監査の決定性)
- **無音失敗の禁止**: catch 経路は必ず stderr 警告を出す(business-logic-model のエラーモデル表 — 無音失敗にしない)

## コンプライアンス統制

- 追加属性は registry の **optional** 列のみ(BR-U1-5)— 既存 audit 行の schema 互換を壊さない(append-only 監査の読み手保護)
- 本 Unit にネットワーク境界・暗号化対象・認証フローは存在しない(ローカル FS 読取 + プロセス内分類のみ)— 該当統制は N/A(反証可能な根拠: business-logic-model のモジュール構成に I/O は node:fs のみ)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T22:46:31Z
- **Iteration:** 1
- **Scope decision:** none

FD の中核契約(fail-open 一方向遮断・無状態・依存方向)の保存、常駐サービスパターン非適用と N/A の反証可能な根拠、検証劇場・互換シムの不在を確認して READY。FOLLOW-UP 3件+NIT 1件は verdict 後に即応済み。

### Findings

- FOLLOW-UP | security-design.md:9 | subagentPurposeLine の cite 不足 | 是正済み: amadeus-lib.ts:4109-4114 の file:line+逐語断片を併記(実装時再解決の注記付き)
- FOLLOW-UP | logical-components.md:19 | BR-U1-6 のスコープ外 cite | 是正済み: スコープ内の business-logic-model「状態」節の逐語へ差し替え
- FOLLOW-UP | logical-components.md:19 | 発火ごと再読のコスト所在(kind=library で performance-design 剪定) | 是正済み: 規模上限不問の判断を code-generation 段へ明示引き継ぎ
- NIT | security-design.md:27 | 簡体字「读」の混入 | 是正済み: 「読」へ訂正
