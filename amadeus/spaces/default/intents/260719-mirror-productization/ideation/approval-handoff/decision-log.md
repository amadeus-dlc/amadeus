# Decision Log — mirror-productization

> 上流入力(consumes 全数): intent-statement.md、feasibility-assessment.md、constraint-register.md、scope-document.md、intent-backlog.md

## 裁定一覧

全てユーザー直接裁定(P-02。D-01〜07 は 2026-07-19 standalone grilling の合意サマリー明示確認済み = G-1〜G-7、D-08 は scope-definition Q1)。

| ID | 決定 | 内容 | 由来 |
|---|---|---|---|
| D-01 | gh optional 依存許容 | 配布物でも optional runtime 依存として可。不在・未認証は loud エラーで当該機能のみ不可、workflow は止めない。keyring 委譲維持。gh-scripts-boundary ノルムの改定を伴う(norm PR — C-01/P-01) | G-1 |
| D-02 | core/tools 移設・scripts 廃止 | 正本 = packages/framework/core/tools/amadeus-mirror.ts。二重実装を作らない | G-2 |
| D-03 | SKILL verb 構成 | create/sync/close(挙動不変)+新規 status(読取専用の乖離3クラス診断)。SKILL は診断→実行の薄い分岐のみ | G-3 |
| D-04 | phase 境界の実現形 | engine が phase boundary で ask directive、auto 時は sync 実行 print 指令。既存 directive 語彙のみ(新 kind なし) | G-4 |
| D-05 | 3層 config 新設 | Global→Space→Intent の汎用階層解決(下位優先)。初キー auto-mirror のみ、既存設定の移行はしない | G-5b |
| D-06 | Global 置き場 | amadeus/ 直下・git 管理の共有設定(形式は design 委任 — U-03)。マシンローカル層は作らない | G-6 |
| D-07 | auto 副作用境界 | auto 無確認実行は sync のみ。create/close は常に ask、close は close-after-landing 検証維持 | G-7 |
| D-08 | intent/Bolt 分割 | 1 intent のまま Bolt 分離: Bolt 1 = S-01〜03 縦スライス(単独ゲート)、Bolt 2+ = config→engine | scope-definition Q1(U-01 解消) |

## 未決の委任(残)

- U-02(実行主体制約)・U-03(設定形式・SKILL 生成様式)→ design / U-04(ask 発火粒度・create 選択肢の出し方)→ requirements(constraint-register 準拠)
