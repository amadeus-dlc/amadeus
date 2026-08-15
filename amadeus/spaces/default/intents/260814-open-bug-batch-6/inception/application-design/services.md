# Services — 260814-open-bug-batch-6

本 intent は既存 CLI ツール群・センサー・docs のバグ修正であり、新規サービス・新規通信経路・新規データストアは導入しない(`requirements.md` スコープ、P5 surgical)。

- サービス層の変化: なし
- 外部連携: GitHub API(gh CLI 経由、既存の読取・PR 作成経路のみ。人間承認境界は不変)
- データ所有: pr-convergence report(record 内 JSON)へ kind: landed の書込が self record でも可能になる(FR-1)。スキーマは既存 predicate の landed verdict に整合し、merge fact フィールド(mergeCommitOid / mergedAt / checkRollupState=記録項目)は非 self 経路の landed report が既に書いている集合と同一とする(新規フィールドの発明はしない)。blocking センサー(report 形式検査)は同一変更で landed+merge commit 検証分岐を得るため、書き手とセンサーの整合は C-1 内で閉じる(component-methods.md の落ちる実証1セットが両者を同時に検証)
- 移行: 不要(既存 report の読み手は kind を判別済み。旧拒否経路は削除して置換 — 互換シムなし)
