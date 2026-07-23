# Constraint Register — 260723-archived-status-guard

上流入力(consumes 全数): intent-statement。

## 制約一覧

| # | 制約 | 種別 | 根拠 |
|---|---|---|---|
| C1 | status enum は in-flight / parked / complete / archived の4値(E-ASGIC2 裁定 A — parked は語彙契約のみ、registry 書込なし) | 裁定 | E-ASGIC1/2、leader 承認 03:43:35Z |
| C2 | archive / unarchive は対の専用 verb+human-presence 必須+両方向監査イベント(E-ASGIC1 裁定 A) | 裁定 | 同上 |
| C3 | ガードは cursor 設定・next・unpark の3経路すべてを loud 拒否(Issue #1396 提案、ユーザー着手承認) | 既決 | #1396 |
| C4 | 260713 移行は closure-note.md を根拠に archived へ(既存ユーザー裁定の執行) | 既決 | closure-note.md |
| C5 | 落ちる実証(archived への next が赤)を完成条件に含める | Mandated | org.md |
| C6 | 正本は packages/framework/core/tools/、dist・self-install 同期必須 | 構造 | project.md Mandated |
| C7 | #1309 の status 語彙と分裂させない(実装前に e2 設計成果物との一致を機械確認) | 整合 | Issue #1396 関連節+feasibility リスク分析 |
| C8 | 後方互換シム禁止 — `closed` 文字列の温存分岐を作らず移行で置換する | Forbidden | org.md(要求されない互換レイヤー禁止) |

## 運用注記

- C1〜C5 は裁定・既決の転記であり requirements で変更不可(変更はユーザーエスカレーション)。C6〜C8 は project/org の既存規範の適用面
