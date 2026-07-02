# D002: Task Generation 承認

## 背景

B001（wave 実行契約の定義）の Task 分解が Task Generation Gate の `ready_for_approval` に到達し、人間の承認待ちになった。

## 判断

B001 の Task 分解（T001 SKILL.md への wave 契約定義、T002 promote 同期）を Maintainer が承認した。
`taskGeneration.status` を `passed` にし、実装実行へ進める。

## 理由

Task が Bolt の完了条件、Functional Design（BL001〜BL006、BR001〜BR008）、Unit Design Brief の Bolt 分割方針と対応しており、契約の章立て、挿入位置、不変条件（Gate と内部プロセス順序の維持）が確定済みであるため。

## 影響

実装実行は T001、T002 の順で進める。
承認 evidence として本判断を `state.json` の `taskGeneration.evidence` に記録する。
