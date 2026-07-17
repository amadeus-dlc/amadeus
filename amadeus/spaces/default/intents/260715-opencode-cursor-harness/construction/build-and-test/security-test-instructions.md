# Security Test Instructions — 260715-opencode-cursor-harness

上流入力(consumes 全数): 攻撃面の実測棚卸し(依存追加ゼロ・秘密情報なし・fail-open 設計)は各 unit の code-generation-plan.md / code-summary.md(U1〜U4)と ADR-3 を上流とする。

## 判定: N/A(追加検査なし — 根拠付き、build-and-test:c3)

攻撃面・依存・承認 NFR の実測棚卸し:

- **依存追加ゼロ**: 両ハーネスの正本は既存 core への薄い投影のみ(package.json 変更なし — git diff で実測)
- **秘密情報なし**: manifest/emit/docs に credential・API キーなし(construction ガードレールどおり環境変数も不使用)
- **入力境界**: cursor adapter の stdin は JSON.parse 失敗で advisory fail-open(exit 0)— ゲート強制・監査整合は**ツール所有 emit(hook 非依存)が正**であり、hook の fail-open が安全性を毀損しない構造は ADR-3 セキュリティ影響欄で設計時に明文化・レビュー済み。exit 2(deny)は不使用 = 権限昇格面なし
- **既存必須 scan の維持**: CI の lint/typecheck/テストは全 green(省略なし — c3 の「省略根拠にしない」を遵守)
- 承認済み NFR にセキュリティ要件の追加なし(security-design: 既存境界の維持のみ)

新規のセキュリティ検査は比例選定の結果ゼロ。opencode の permission 既定全許可の差分は opencode.json.example の絞り込み例+docs 記載で利用者へ可視化済み(R-4)。

## 再発時の入口

将来、hooks へゲート強制(deny 経路)を導入する場合や新規入力境界(外部サービス・credential)が生じた場合は、その時点で threat model の再評価と検査の比例選定をやり直す — 本 N/A は現在の攻撃面実測に対する判定であり、恒久免除ではない(c3)。
