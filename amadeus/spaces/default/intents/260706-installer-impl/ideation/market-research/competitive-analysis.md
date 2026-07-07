# Competitive Analysis — インストーラの実装

> ステージ: market-research (Ideation) / 作成: 2026-07-07
> 上流入力: `../intent-capture/intent-statement.md`(導入・更新・安全性の3課題、npm公開CLI + bunx ワンライナーの方向性)
> 比較対象の選定根拠: `market-research-questions.md` Q1(スペック駆動フレームワーク型 + パッケージマネージャ型)

## 比較対象

ユーザー指定により、直接競合であるスペック駆動フレームワーク型(cc-sdd、GitHub spec-kit)を中心に、参照型(パッケージマネージャ型)も比較に含める。

| 観点 | cc-sdd | GitHub spec-kit (specify) | パッケージマネージャ型(参照) | Amadeus(現状) |
|------|--------|---------------------------|-------------------------------|-----------------|
| 導入コマンド | `npx cc-sdd@latest` | `specify init`(uvx/pip 系) | `npm install <pkg>` | `git clone` + `cp -r dist/<harness>/...`(手動) |
| クローン要否 | 不要 | 不要 | 不要 | **必要**(最大の弱点) |
| マルチエージェント対応 | 8エージェント(Claude Code/Codex/Cursor 等)、13言語 | Claude Code/Copilot/Gemini/Cursor 等 | N/A | 4ハーネス(claude/codex/kiro/kiro-ide)だが手動選択コピー |
| 更新手段 | `npx cc-sdd@latest` 再実行(npm dist-tag で最新取得) | `specify init --here --force` — `--force` なしでは既存共有ファイルをスキップ | `npm update`(参照型の最強点) | **なし**(構造的欠落 — intent-statement の課題2) |
| 既存ファイル保護 | 上書き系(要注意領域) | `--force` フラグで明示的に上書き、なしならスキップ | ユーザーファイルと分離(node_modules) | 手動のため事故リスクあり |
| オプション | `--lang ja --os mac` 等 | `--integration <agent>` 等 | N/A | なし |

出典: [cc-sdd (GitHub)](https://github.com/gotalab/cc-sdd)、[cc-sdd (npm)](https://www.npmjs.com/package/cc-sdd)、[Spec Kit Upgrade Guide](https://github.com/github/spec-kit/blob/main/docs/upgrade.md)、[Spec Kit Documentation](https://github.github.com/spec-kit/index.html)

## 強み・弱みの評価

### cc-sdd(ユーザー指定の主参照)
- **強み**: `npx` ワンライナーで13言語・8エージェント対応。v2.0.0(2025-11)で安定版に到達し、再実行が事実上の更新手段として機能。npm の `@latest` dist-tag によるバージョン解決が単純明快
- **弱み**: 更新は「再インストール」であり、差分レポートや非破壊マージの保証は明示されていない — Amadeus が Q3 で決めた「バージョン検出 + 差分レポート」はここに対する差別化になる

### GitHub spec-kit
- **強み**: 90k+ スター。`init --here --force` の再実行アップグレードモデル。テンプレートを GitHub Release から取得する配布構造
- **弱み**: `--force` が「共有インフラを一括上書き」で、ユーザーカスタマイズとの境界が粗い。upgrade はドキュメント上も丁寧な手順を要する

### パッケージマネージャ型(参照)
- **強み**: 更新は `npm update` で完結し、ユーザーファイルとフレームワークファイルが物理的に分離される(node_modules)
- **弱み**: Claude Code 等のハーネスは `.claude/` 配下の実ファイルを要求するため、参照型のみでは成立しない。コピー型とのハイブリッド(参照 + 展開)は複雑化を招く

## Amadeus インストーラの差別化機会

1. **非破壊マージの構造的保証** — `amadeus-*` プレフィックス規約により「フレームワーク所有ファイルのみ更新」が機械判定できる。spec-kit の粗い `--force` や cc-sdd の再インストールに対する明確な優位(intent-statement の衝突ポリシー)
2. **差分レポート付き更新** — 適用前に何が変わるかを表示する更新体験(Q3)。競合はいずれも事前差分表示を持たない
3. **テーブルステークスの充足** — `bunx` ワンライナー、対話式ウィザード + 非対話フラグ(Q2)は cc-sdd/spec-kit が確立した「当然の期待」であり、これを満たさない限り土俵に立てない
