# Business Logic Model — docs-drift-repair (functional-design)

上流入力(consumes 全数): requirements.md (注: stage 宣言の他 consumes — unit-of-work / components / component-methods / services — は amadeus-document スコープが units-generation / application-design を SKIP するため設計上不在(engine directive でも expected-absent)。degrade 構成の documented fallback として requirements.md 単独を上流とする)

依拠箇所: プロセスの各段は requirements.md の FR-6(二層照合)・FR-1〜FR-5(修正仕様)・FR-7(PR 編成)・NFR-1(検証ゲート)を実行順に配列したもの。閉包・表記の規則は business-rules.md(BR-1〜BR-6)、対象集合と真実源は domain-entities.md を参照する。

## プロセス全体(5段)

```mermaid
flowchart TD
    S1[1. 再接地: origin/main fetch + 測定refの更新] --> S2[2. 二層照合: 機械照合(全域) + 精読(ホットスポット)]
    S2 --> S3[3. 乖離目録の確定(全件・機械再計算)]
    S3 --> S4[4. 修正実施: PR-1(クラスタA+B) / PR-2(C+D+E)]
    S4 --> S5[5. 検証: 受け入れ基準grep群 + EN/JAペア照合 + CIゲート]
    S5 -->|残余>0| S4
```

<!-- Text fallback: 1.再接地 → 2.二層照合 → 3.乖離目録確定 → 4.修正(2 PR) → 5.検証、検証で残余があれば4へ戻るループ。 -->

## 段1: 再接地

- `git fetch origin main` し、CG 作業ブランチは最新 origin/main から切る。RA/FD の file:line 引用は再接地後の断面で再解決し、シフトがあれば乖離目録に現行値を記録する(cid:reverse-engineering:upstream-cite-reresolve-on-shift)
- PR #1572(amadeus-document スコープ)着地済みの main を前提とする

## 段2: 二層照合(FR-6a/6b)

**機械照合(全ファイル)** — 各真実源(domain-entities.md エンティティ4)ごとに2キー(変数名・展開後リテラル)で README*.md + docs/ を grep し、ヒット行を実装値と突き合わせる:

1. 件数語スイープ: `six|seven|four|five|eleven|twelve|11個|12個|6つ|7つ` 等の件数語彙 × ハーネス/hook/agent 文脈
2. 列挙スイープ: ハーネス名列挙(claude/codex/cursor/kimi/kiro/kiro-ide/opencode)の完全性 — kimi 欠落の同型検出
3. パス・コマンド実在: docs が引用するファイルパス(`packages/…`、`scripts/…`、`.claude/…`)と CLI コマンドの実在を ls / help 出力で照合
4. EN/JA ペア存在: 写像規則(domain-entities.md エンティティ5)の集合差 = 0 確認

**精読照合(限定)** — (i) 区間 `1673c4332..HEAD` 変更のホットスポット文書、(ii) 機械照合ヒット文書。精読では意味論乖離(誤読を誘発する記述 — 19-plugins の列挙欠落クラス)を検査する。

## 段3: 乖離目録の確定

検出全件を domain-entities.md エンティティ2の正規形で `drift-ledger.md`(code-generation 成果物)に記録する。件数は列挙からの機械再計算。既知5クラスタ(A〜E)の既検出分を初期行として持ち込み、段2の検出分を追記する。

## 段4: 修正実施

- PR-1(クラスタ A+B、Kimi 起因): README 2ファイル+19-plugins 2ファイル。BR-2 の隣接列挙原則で表記を確定し、BR-3 で列挙を配列と同期
- PR-2(クラスタ C+D+E、hook 起因+既存+対訳新規): FR-3 の count-free 化と roster 同期、FR-4 の既存乖離修正、FR-5 の対訳新規2件、FR-6 検出分の残余修正
- 各修正は BR-4(EN/JA 同一変更)を守る。ブランチは worktree 分離で作業する(cid:code-generation:solo-bolt-worktree-required)

## 段5: 検証

1. requirements の受け入れ基準 grep 群を全て実行し出力を転記(FR-1/2/3/4/5 の各基準)
2. EN/JA ペア照合: PR diff の片側変更 0(FR-7)
3. CI ゲート: `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci`(NFR-1)。docs-only 変更のため dist:check / promote:self:check は不変 green を確認
4. 乖離目録の閉包検査: 全行が処置済み(BR-5)。残余 > 0 なら段4へ戻る

## エラー・例外経路

- 実装側欠陥の発見 → BR-6(Issue 起票、修正しない)
- FR-6 検出量が過大で PR-2 が肥大 → 追加分割をユーザーへ諮る(FR-7 の委譲どおり conductor 判断で先行しない)
- CI 赤 → 失敗 assertion の実文まで読んで帰属確定(cid:code-generation:local-ci-red-assertion-verbatim)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T07:46:38Z
- **Iteration:** 1
- **Scope decision:** none

FR/NFR 写像・BR-2 委譲裁定とトレードオフ・相互参照・Mermaid いずれも健全で READY。Minor 1件(consumes N/A 根拠)は即時是正済み。

### Findings

- [Minor] 上流入力ヘッダ3件: stage 宣言必須 consumes の不在理由(SKIP 由来)を N/A 根拠として未記載 — functional-design.md:24-36 との対比。(conductor が同 iteration 内で3成果物へ N/A 注記を追記し閉包)
