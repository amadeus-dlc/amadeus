# Business Logic Model — U2 u2-install-verb

上流入力(consumes 全数): unit-of-work.md(U2 境界)、unit-of-work-story-map.md(導入ジャーニー GWT)、requirements.md(FR-1a〜1f)、components.md(C1)、component-methods.md(C1 メソッド案)、services.md(冪等性契約)

## 処理フロー(install = 素材配置+既存 compose 委譲)

```
amadeus-plugin.ts install <path> [--force] [--project-root <dir>]
  → parseInstall(rest)                     … path 欠落/余剰 flag は usage-error(exit 2)
  → handleInstall(cmd, deps)
      1. source 検分: deps 経由で <path> がディレクトリであること・plugin 名 = basename(<path>)
      2. 衝突判定: deps.stagingEntryState(dst, src) → absent | identical | different
         - absent    → 3 へ
         - identical → 3 へ(冪等再試行 — コピー省略)
         - different → --force なければ failure(stage:"install", exit 1、stderr に --force 案内)
                       --force あり → 3 へ(置換は 3 の swap に内包 — 事前の裸削除をしない)
      3. 原子的配置: deps.copyPluginSource(src, dst)   … seam は canonical の2引数(component-methods.md C1 と逐語一致)。
         既定実装の内部契約: (α) src の実体ファイルのみを tmp(<staging>/.amadeus-plugin-install-tmp-<name>/)へコピー
         — symlink はコピーせずスキップし stderr に1行警告(BR-U2-4 はこの phase で発火) —
         (β) dst 既存(--force 置換)なら dst → <staging>/.amadeus-plugin-install-old-<name>/ へ rename 退避
         (γ) tmp → dst へ rename (δ) old を削除。tmp/old は実行開始時に毎回破棄・再作成
      4. compose 委譲: handleCompose 相当(既存経路そのまま — trust 三層・2段 recompile を含む)
  → 結果: { kind:"installed", name, composeOutcome:"composed"|"noop" }(exit 0)
          失敗は PluginCliResult の failure variant(stage:"install" 新設、または委譲先の既存 stage)
```

## 冪等再試行の収束(FR-1d)

dst の可視状態は常に「absent / 完全な旧 plugin / 完全な新 plugin」の3値のみ — すべての中間状態は dot-tmp 名前空間(tmp/old)に閉じる(BR-U2-2)。

| 前回の失敗点 | 再実行時の観測状態 | 挙動 |
|---|---|---|
| (α) コピー途中 | tmp 残渣、dst = 前状態のまま | tmp を破棄・再作成して続行 |
| (β) 退避 rename 後・(γ) 前(--force) | dst = absent、old 残渣 | old を破棄し、absent として新規配置(--force の意思は完遂済みとみなす — 旧内容は different で置換対象だった) |
| (γ) 後・(δ) 前 | dst = 新 identical、old 残渣 | old を破棄 → compose 再試行 |
| compose 失敗 | dst = identical | コピー省略 → compose のみ再試行(既存の冪等機構) |

tmp/old dot-dir(`.amadeus-plugin-install-{tmp,old}-*`)は既存の `.amadeus-plugin-*` prefix 除外(isEngineDotfile:195-197)により compose 走査から構造的に不可視。

## エラーハンドリング

- source 不在/非ディレクトリ → failure(stage:"install")、exit 1、loud
- different かつ --force なし → failure(stage:"install")、stderr に「一致しない同名 plugin が存在。--force で置換、または drop 後に再実行」
- compose 委譲失敗 → 委譲先の failure をそのまま返す(exit 1)。install 側で握りつぶさない

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T22:31:18Z
- **Iteration:** 2
- **Scope decision:** none

it.1 の Critical(copyPluginSource 三者矛盾 → canonical 2引数へ統一・swap は実装内契約へ)/ Major(--force 除去中断 → swap 方式で状態空間を dot-tmp に閉包)/ Minor(symlink のフロー明記)をすべて閉包。3ファイル+上流 C1 の逐語一致を実測確認。残存なし。

### Findings

- None
