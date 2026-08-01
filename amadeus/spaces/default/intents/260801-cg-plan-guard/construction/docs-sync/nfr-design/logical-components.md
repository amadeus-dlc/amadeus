# Logical Components — docs-sync(U4)

上流入力(consumes 全数): business-logic-model.md
- 宣言 consumes のうち performance/security/scalability/reliability-requirements と tech-stack-decisions は該当ステージが本スコープで SKIP のため設計どおり不在(consumes_absent expected)— 代替正本は requirements.md の NFR-1〜4。

- U4 は docs のみの unit — **新規論理コンポーネントなし**(`business-logic-model.md` の対象文書列挙が全て)。

## 論理コンポーネント

- N/A(根拠: 変更面は docs/ の md のみ。記述対象コンポーネント(C1〜C7)の正本は AD components.md と各 unit の FD — 本 unit は参照のみで定義・実装を持たない)。

## 層別の検証責務

- docs の検収は U4-AC-1〜3(business-rules.md)が引き受ける。コード層の検証責務なし。
