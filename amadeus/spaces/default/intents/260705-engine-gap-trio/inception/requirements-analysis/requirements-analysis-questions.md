# Requirements Analysis 質問（260705-engine-gap-trio）

対象 Issue: [#478](https://github.com/amadeus-dlc/amadeus/issues/478)

Maintainer の包括委任（sub 割り当て、agmsg 2026-07-05T08:28:36Z）に基づき、推奨案で自己回答する。

---

## Q1. gap2（slug 制約 vs 命名規約）はどちら側を直しますか？

A. tool 側で解決する。amadeus-worktree の slug 境界で入力を小文字へ正規化して受理する（`U001-x` → `u001-x`）。命名規約（project.md）は変更しない
B. 命名規約側を `unnn-<slug>` へ変更する（project.md 編集）
X. Other (please specify)

[Answer]: A（sub の注意点 1 = project.md 変更は当方文書 Intent と接触しうる、を回避。macOS の大文字小文字非区別 FS で case-only rename が事故りやすい実績（#470 で遭遇）からも、派生物（branch / dir 名）は小文字へ正規化するのが安全）

## Q2. gap1（audit-fork 再入）の再入条件は？

A. worktree 側 shard の内容が main 側 shard の先頭一致（prefix または同一）のときだけ再入を許し、fork 内容で上書きする。分岐している場合は従来どおり拒否する
B. 無条件に上書き
X. Other (please specify)

[Answer]: A（phase PR で commit 済みの shard は必ず main の過去断面 = prefix であることを利用。分岐 = 別作業の痕跡は上書きすると監査を失うため拒否を維持）

## Q3. gap3（Per unit マルチ Unit）はどちら側を直しますか？

A. validator 側を複数 unit 対応にする。連続する `Per unit:` 行を集合として解釈し、per-unit ステージの completed 判定で全 unit の produces を検査する（現状は最後の 1 unit しか検査されない）
B. engine の state template を変更する
X. Other (please spec定)

[Answer]: A（engine は「stage ごとに 1 checkbox 行」の設計が正であり、連続 Per unit 行は #470 で実運用済みの表現。validator が全 unit を検査すれば検査の弱まりが解消する。skill 変更のみで構成できるため粒度制約とも整合）
