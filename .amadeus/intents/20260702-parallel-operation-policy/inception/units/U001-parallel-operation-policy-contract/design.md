# Unit Design Brief

## 概要

この文書は Unit Design Brief である。
Inception では、並行運用ポリシー契約の課題解決方針を定め、Bolt 分割と Construction へ渡す設計入力だけを扱う。
policy 本文の見出し構成と各判断基準の文言は Construction で確定する。

## 設計戦略

- 判断基準は推測で作らず、観察済みの実例（#334 cycle の並行統合と Bolt 直列実行、#350 cycle の衝突面判断、承認キュー運用、Issue #274 の遡及承認）に根拠がある範囲だけを規則化する。
- agent-instruction-rules に従い、望ましい行動を肯定形で先に書き、禁止は実際に起きた失敗に限定する。
- policy 本文は判断基準だけを扱い、実例は Intent 成果物と PR への参照リンクとして根拠に置く。policy の安定性と実例の追跡可能性を分離する。
- 既存 Git Branching Policy と同じ記録構造（目的、対象、責務分担の見出し形式、policies.md と README の索引）に載せ、新しい構造を発明しない。
- 責務分担は「単一 branch の lifecycle は Git Branching Policy、複数 worktree の並行判断は並行運用ポリシー」とし、両 policy に相互参照を明記して判断基準の分散を防ぐ。

## 責務境界

- 所有するもの: `parallel-operation.md` の判断基準（並行可否、統合手順、承認運用、直列化）、索引登録、責務分担の相互参照。
- 所有しないもの: branch lifecycle（Git Branching Policy の所有）、phase PR の統合条件（同）、新しい phase やゲートの定義、ゲート契約そのもの（20260702-phase-gate-approval-contract の所有）、承認待ちキュー一覧の実装（20260702-gate-queue-visualization の所有）。
- 依存してよいもの: 既存 policies の記録構造、GateQueueList.ts と IndexGenerate.ts の実行入口、#334 と #350 の Intent 成果物（観察根拠）。
- 後続で再確認が必要になる条件: 並行運用で新しい実例（統合の失敗、想定外の衝突）が観察された場合、Bolt の依存 wave 並行実行（Issue #352）が契約化された場合。

## 構成候補

- 並行判断: 並行させる単位と接触面による並行可否の判断基準を扱う。
- 統合手順: マージ後の追従と共有成果物再生成の順序、索引行の衝突の扱いを扱う。
- 承認運用: 承認待ちキューの確認、バッチ承認、遡及承認の扱いを扱う。
- 直列化: 同一 worktree 内の直列実行と worktree 単位の並行の使い分けを扱う。
- 責務分担と登録: 両 policy の境界の明記と索引への登録を扱う。

## データと契約候補

- 入力候補: 候補 Issue と進行中 Intent の変更対象（実装対象、Bolt、PR）、承認待ちキュー一覧の出力、マージイベント。
- 出力候補: 並行可否の判断、統合後の整合した共有成果物、承認済みの gate 状態、policy を根拠にした Intent 成果物と PR 説明の参照。
- 状態候補: 並行中、統合待ち、承認待ち、承認済み。
- 事前条件候補: policy が索引から参照できる。変更対象が成果物から読める。
- 事後条件候補: 並行判断と承認判断が policy と成果物（decision、traceability）から追跡できる。
- 不変条件候補: policy の判断基準は観察済みの実例への根拠リンクを持つ。

## 検証観点

- policy 本文の必須見出しと索引参照の実在を validator の pass で確認する。
- 判断基準の根拠リンクが実在する成果物を指すことを確認する。
- 責務分担の記述が git-branching.md の既存本文と矛盾しないことを人間レビューで確認する。
- 標準検証（`npm run test:all`）の pass を維持する。

## Bolt 分割方針

- B001 で `parallel-operation.md` 本文を作成し、`policies.md` と `policies/README.md` の索引へ登録する。
- B002 で `git-branching.md` へ責務分担の相互参照を追記し、両 policy の整合を確認する。
- B002 は B001 の完了後に実行する。相互参照が指す policy 本文の見出しが前提になるためである。

## Construction への引き継ぎ

- Functional Design で確定する事項: policy 本文の見出し構成（目的、対象、責務分担、判断基準の章立て）、各判断基準の文言、根拠リンクの対象（どの Intent 成果物と PR を指すか）、validator への個別 policy 構造検査追加の要否。
- 文書変更で確定する事項: git-branching.md へ追記する相互参照の位置と文言。
- 検証時に確定する事項: 文書変更に対する検証の範囲（validator と標準検証で足りるか、eval 追加が必要か）。
