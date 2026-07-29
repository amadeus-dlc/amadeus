# Logical Components — U6: journal-reader-swap

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

NFR 設計（performance/security/scalability/reliability 各 design）の決定がどの論理コンポーネントに適用されるかの対応表。変更面は正本 `packages/framework/core/` の tool 実装のみで、`amadeus-lib.ts` には追加しない（tech-stack-decisions.md）。

## コンポーネント目録

| コンポーネント | 責務 | 適用される NFR 設計 | 故障領域（blast radius） |
|---|---|---|---|
| 共通 reader（U3 Journal Module、本 Unit では利用側） | shard 走査・version 判別 decode・正規化 record 写像・mixed merge | performance-design（単一走査 pass）、security-design（読取専用・非転記）、scalability-design（線形性） | reader 自体の欠陥は U3 の責務。本 Unit の張替えミスは当該 tool のみに限定 |
| doctor 差替え面 | shard 整合性検査の共通 reader 化 | reliability-design（CLI 契約不変）、security-design（fail-noisy 破損行検出） | 差替え不良は doctor 出力の差分として同一性テストで検出 |
| recovery 差替え面 | state 復元 event 列の読取 | reliability-design（出力同一性・FR-MIG-4(a) 入力） | 同上。rollback は tool 単位で独立 |
| presence／grant／learnings 差替え面 | 各 record 読取の共通 reader 化 | reliability-design（不可視性） | v2-only 属性に依存しない（BR-8）ため差替え影響は最小 |
| merge 差替え面 | clone／worktree 横断 mixed-version merge | scalability-design（線形性維持）、reliability-design（BR-5 同等性） | merge 結果の差分は fixture 同等性テストで検出 |
| runtime graph 差替え面 | trace/span 相関を含む graph 構築入力の読取 | reliability-design（edge 非合成、BR-16） | v1 record の相関 ID 欠損は許容。推測で埋めない |
| 検証資産（3 fixture＋ゴールデン） | 同一性・既存スイート不変・rollback 独立性の検証 | reliability-design（3 層検証） | テスト資産のみ。本番経路に影響なし |

## コンポーネント境界と分離方針

- 差替えは tool 単位で独立し、tool 間で状態を共有しない（BR-6）。これが blast radius を 1 tool に閉じ込める構造的根拠
- reader・codec の所有は U3、v1 reader 削除は U8 の責務。本 Unit は利用側の張替えと v2-only 証明のみを行う（business-logic-model.md § v1 reader 削除への接続）
- `core/tools/` 変更のため FR-DST-2 を適用: manifest マッピング整合、`bun scripts/package.ts` で全 7 harness dist＋self-install 面を再生成し `package.ts --check`／`promote:self:check` を通過。distribution tests（BR-21）を Unit 完了条件に含める
