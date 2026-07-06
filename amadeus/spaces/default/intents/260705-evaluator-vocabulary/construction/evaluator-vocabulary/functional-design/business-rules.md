# 業務ルール — unit: evaluator-vocabulary

## 読み替えの保存則

- 読み替えは意味を保存する（分担の意図 = 構造検出と接続性・品質評価の分離は不変。語だけを現行実装に合わせる）。
- 実挙動に存在しない検査能力を sensors に帰属させない（sensors の `matches` は Construction 設計成果物系 glob であり、PR 説明や team.md 自身は検査しない）。旧 evaluator 候補のうち sensors がカバーしない項目は、実際の検出主体（PR レビュー = 人間またはレビューボット）へ帰属させる。

## 変更禁止対象

- sensors 実装、validator 実装、イベントタキソノミー。
- Skill Contract（consumer role 定義・catalog TS）。
- 歴史的記録（audit、過去 Intent record、Issue 引用）。

## 言語と経路

- SKILL.md は英語、team.md は日本語。機械可読ラベル（sensor id、イベント名）は英語のまま。
- 昇格先は promote-skill.ts --replace 経由のみ。

## 検証規律

- eval fixture の更新は、SKILL 変更で RED になったことを確認・記録してから行う（証跡は code-summary）。
- grep 判定表は全ヒットを 3 分類のいずれかに必ず割り当てる。不明は 未確認 と記録して人間へ。
