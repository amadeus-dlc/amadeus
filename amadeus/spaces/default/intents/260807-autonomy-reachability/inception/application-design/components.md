# Components — autonomy-reachability(#2378)

上流入力(consumes 全数): requirements.md(FR-1〜6 を各コンポーネントの責務変更へ写像)、architecture.md / component-inventory.md(codekb — 既存コンポーネントの現在断面。本 intent の患部詳細は `re-scans/260807-autonomy-reachability.md` を正本として参照)。

本 intent は新コンポーネントを追加しない。既存6コンポーネント+文書面の責務を変更する。

## C1: Launch Declaration(amadeus-orchestrate.ts C13 節)

- **責務**: `--autonomy` 起動宣言の argv 抽出・判定・適用。変更: judgment 0(`:1290-1294`)の「active intent 必須」を「birth 同時受理」へ改訂(FR-1)
- **公開面**: `next --autonomy <none|semi|full>` フラグ(CLI 契約)
- **境界**: 適用は C2 の canonical 関数へ委譲(自前で state を書かない)

## C2: Autonomy Production(amadeus-intent-autonomy-production.ts)

- **責務**: mode 適用・認可判定・preview。変更2点: (a) `applyProductionAutonomyMode` が state 3フィールド書込まで所有(canonical 化 — FR-2c)(b) `autoApprove === false` 時に `authorizationReason` を audit イベントとして emit(FR-2a、`:227-231` seam)。preview に非自動裁定種別の列挙を追加(FR-2b)
- **境界**: 認可判定の意味論は不変(観測のみ追加)

## C3: Mode Recording CLI(amadeus-bolt.ts set-autonomy / decide-question)

- **責務**: canonical 記録経路。変更: `handleSetAutonomy` の state 書込(`:1075-1081`)を C2 呼出しへ縮約(重複定義の削除 — FR-2c)
- **境界**: verb 契約(引数・出力)は不変

## C4: Question Audit(amadeus-log.ts)

- **責務**: `QUESTION_ANSWERED` の発行(`:180-187` = 全質問の通過点)。変更: decide-question 経由か否かの判別属性を追加(FR-3a)
- **境界**: 回答の受理可否は変えない(FR-3c — 観測のみ)

## C5: Stop Hook(amadeus-stop.ts)

- **責務**: question carve-out・継続キャップ。変更: 自身は無変更 — FR-2c の state canonical 化により `:196-198` の state-first 読みが C13 経由宣言でも正しい mode を見るようになる(受け入れ基準の検証対象)
- **境界**: 述語構造は不変

## C6: Conduit(文書正本群)

- **責務**: conductor・ユーザーへの導線。変更: SKILL.md 6面+commands 2面+utility help+README+docs/reference/24 対訳+stage-protocol semi 手順(FR-5a〜5c)、plugin stage 文書2点(FR-6a)
- **境界**: 記載は engine 実装の記述であり新挙動を発明しない

## C7: Parity Guard(新設テスト)

- **責務**: C6 の全面に `--autonomy` 記載が存在することの機械検査(FR-5d、blocking)。既存 t258-boundary-guard と同族の文書境界ガード
- **境界**: 件数語を持たない(count-free)— 面の集合はコードから discover

## FR-4(回帰計測)の N/A 注記

FR-4 はコンポーネント変更を持たない — 測定述語 `INTENT_AUTONOMY_TRANSACTION_COMMITTED` の発行点(C2 既存)と新設 refusal イベント(FR-2a で C2 に追加)をそのまま読む**計測レポート作業**であり、設計要素は FR-2a のイベント設計に包含される。レポート自体は build-and-test 段の成果物として作成する(意図的な設計対象外 — Review iteration 1 NIT 1 への応答)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T14:46:19Z
- **Iteration:** 1
- **Scope decision:** none

C1-C7境界とADR構造は健全だが完全性欠落3件: ADR-1可逆性の自己矛盾/FR-2d 6読み手の帰属2系統欠落/C3 method仕様の欠落。是正コスト小

### Findings

- BLOCKER | decisions.md:9,49 — ADR-1 可逆性が Option A 記述(高)と可逆性まとめ(中)で自己矛盾 — 下流の Bolt 順序・ロックイン判断を誤導
- BLOCKER | component-dependency.md:12-24 — FR-2d の読み手6系統のうち statusline(amadeus-lib.ts:4942)と swarm scheduling(amadeus-orchestrate.ts:1894-1899)+stop cap/budget(:150,:160)がどの component にも帰属せず、棚卸しテストの所有者未指定
- BLOCKER | component-methods.md — C3(handleSetAutonomy 縮約)の method 仕様が欠落 — components.md が明記する実変更の orphan 化
- NIT | 全5成果物 — FR-4(回帰計測)への言及ゼロ — コード変更不要なら明示 N/A が必要
- NIT | component-methods.md:21-25 — FR-3b の実現手段の functional-design 委譲が無申告

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T14:48:53Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER 3件+NIT 2件すべてクローズ確認(ADR-1可逆性統一/6読み手全数帰属表/C3 method新設/FR-4 N/A/FR-3b委譲明示)。新規指摘ゼロ・相互参照整合

### Findings

- None
