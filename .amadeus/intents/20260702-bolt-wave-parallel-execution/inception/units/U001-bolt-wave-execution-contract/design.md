# Unit Design Brief

## 概要

この文書は Unit Design Brief である。
Inception では、Bolt wave 実行契約の課題解決方針を定め、Bolt 分割と Construction へ渡す設計入力だけを扱う。
契約の文言と挿入位置は Construction で確定する。

## 設計戦略

- wave は新しい状態や成果物を導入せず、`bolts.md` の既存の依存表から導出する順序判断として定義する。`state.json` に wave のフィールドを追加しない。
- 契約は公開入口 `amadeus-construction` に 1 箇所で定義し（G001）、内部 skill の契約（bolt-preparation の停止、implementation-execution の前提）は変更しない。wave は親 skill の orchestration として表現する。
- 実行の運用前提（worktree 分離、直列化、統合手順、まとめ承認）は、対象 workspace の steering policy（並行運用の判断基準）がある場合はそれに従う一般形で参照し、特定 workspace の policy へ固定参照しない。
- 直列実行を既定のまま維持し、wave 並行は条件（依存のない Bolt が複数あり、worktree 分離で実行できる）を満たす場合の選択肢として追加する。既存の e2e eval（直列前提）を壊さない。
- 観察済みの実例（#334 の B002/B003 並行可能性とまとめ承認 D003、並行運用ポリシーの根拠）に基づいて契約を書き、推測の規則を作らない。

## 責務境界

- 所有するもの: `amadeus-construction` SKILL.md の wave 実行契約（導出、実行、統合、まとめ承認、直列既定）、promote 同期、既存検証の非破壊確認。
- 所有しないもの: 内部 skill の契約、Task Generation Gate の契約（20260702-phase-gate-approval-contract の所有）、並行運用の判断基準そのもの（並行運用ポリシーの所有）、承認待ちキュー一覧の実装（20260702-gate-queue-visualization の所有）。
- 依存してよいもの: `bolts.md` の依存表構造、Task Generation Gate 契約、並行運用ポリシー、承認待ちキュー一覧、promote 手順。
- 後続で再確認が必要になる条件: wave 並行の実運用で新しい観察（統合の失敗、想定外の競合）が得られた場合、wave 導出の機械化が必要になった場合。

## 構成候補

- wave 導出: 依存表からのトポロジカルレベル導出と循環時の扱いを扱う。
- wave 実行: worktree 分離での並行実行と同一 worktree の直列維持を扱う。
- 統合と検証: wave 完了時の統合、共有成果物の整合、次の wave への進行条件を扱う。
- まとめ承認: wave 単位の Bolt 準備とまとめ承認の運用を扱う。
- 直列既定: wave 並行の適用条件と、条件を満たさない場合の従来どおりの直列実行を扱う。

## データと契約候補

- 入力候補: 対象 Intent の `bolts.md`（依存表）、`state.json` の `targetBolts` と `taskGeneration`。
- 出力候補: wave 分割の実行計画（人間への提示）、wave 単位で準備された Bolt 成果物、統合済みの作業ツリー。
- 状態候補: wave 導出済み、wave 実行中、wave 統合済み。いずれも `state.json` の新フィールドにせず、既存の Bolt 単位の状態から導出する。
- 事前条件候補: `bolts.md` が validator の構造検査を通る。依存に循環がない。
- 事後条件候補: wave の統合後に標準検証が pass する。
- 不変条件候補: Bolt ごとの Task Generation Gate と内部プロセスの順序は wave 並行でも変わらない。

## 検証観点

- 契約の記述が R001 から R004 の受け入れ条件を満たすことを人間レビューで確認する。
- 標準検証（`npm run test:all`。e2e mock eval を含む）の pass を維持する。
- skill-forge 確認（skill 境界、本文指示の矛盾、eval coverage）を PR で記録する。
- promote 同期と `test:it:promote-skill` の pass を確認する。

## Bolt 分割方針

- B001 で `amadeus-construction` SKILL.md へ wave 実行契約を定義し、promote で同期する。
- B002 で既存検証との整合を確認する（e2e mock eval の非破壊確認、必要な場合の期待値調整、skill-forge 確認の記録）。
- B002 は B001 の完了後に実行する。確認対象の契約本文が前提になるためである。

## Construction への引き継ぎ

- Functional Design で確定する事項: wave 契約の文言、SKILL.md 内の挿入位置（内部プロセスと入力のどこに置くか）、wave 導出の循環時の文言、steering policy への一般形参照の文言。
- 検証時に確定する事項: e2e eval（mock）の期待出力への影響の有無と、影響がある場合の期待値調整の範囲。
