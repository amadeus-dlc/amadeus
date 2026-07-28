# Business Logic Model — U4 u4-skill-docs

上流入力(consumes 全数): unit-of-work.md(U4 境界)、unit-of-work-story-map.md(ガード付き操作ジャーニー)、requirements.md(FR-3・FR-5a/5b)、components.md(C3/C5)、component-methods.md(C3/C5)、services.md(入口3系統)

## スキルの対話フロー(amadeus-mirror 様式)

```
/amadeus-plugin [args]
  → Step 1: status first — bun <harness-dir>/tools/amadeus-plugin.ts status を必ず先に実行し現状を提示
  → Step 2: 固定 verb の選択肢(status/compose/drop/doctor/install)と各 verb の効果・不可逆性を説明
  → Step 3: 選択された固定 verb のみを実行(Canonical command contract の許容形以外は組み立てない)
```

- `<harness-dir>` は起動時に解決した1個の検証済みパス引数。スキル本文のバイト列は全ハーネス同一(mirror :14-17 様式)
- ハーネス列挙は**個別列挙をやめ導出形**にする: 「現在インストールされているハーネスディレクトリ(`tools/amadeus-plugin.ts` を含む dot-dir)」— FR-3c の count-free 要求。mirror の5面列挙陳腐化を構造回避
- drop / install --force(不可逆・置換系)は Step 2 で影響を明示してから実行

## docs 更新フロー(FR-5b)

19-plugins EN/JA の「操作」導入部を3系統の入口(スキル → ハンドラ → raw CLI の順で案内、raw は上級者向け)へ再構成。手順例は `/amadeus plugin <verb>` を第一表記にする。EN/JA は同一変更で同期。

## 投影フロー(FR-3b、ADR-3)

正本 `packages/framework/core/skills/amadeus-plugin/` → 7ハーネスへ**3系統の配線**(literal entry = kimi / helper registry = claude・cursor・kiro・kiro-ide / emit.ts 配列 = codex・opencode — mirror の実配線を grep 再列挙し同一系統で追随。domain-entities.md の投影配線行が正)→ `bun scripts/package.ts` + `promote:self` → dist:check / promote:self:check green。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T22:44:41Z
- **Iteration:** 2
- **Scope decision:** none

it.1 の Major(U4 テスト増の無申告逸脱 → UG 予算 +340〜540 へ申告改訂、t258 前例明記)/ Minor(投影機構の3系統明記+U4 変更面に harness 配線 .ts を含む申告)を閉包。UG/AD/FD 5ファイルの数値一致を機械照合。残存なし。

### Findings

- None
