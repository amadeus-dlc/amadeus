# Memory: code-generation（B003）

## Interpretations

- 「必須節定義の共有」を、validator が stage 定義の frontmatter produces を直接読む実装で実現した（定義の複製なし。設計判断 6）。
- backward-compatibility.md が存在しない workspace（examples の snapshot）は旧形式検査へフォールバックする設計にした。examples を変更せずに既存検証が通る。

## Deviations

- 実装はサブエージェントへ委譲した。
- B001 と B002 で 3.5 成果物を `construction/bolts/<id>/` に置いたのは旧契約の配置誤りで、B003 で `construction/<id>/` へ是正した（validator fail の根本原因）。

## Tradeoffs

- SKILL.md は適応コピー（改名 + bridge 段落）のため hash 照合対象外とし、存在照合のみにした。本文の乖離検出は弱いが、適応差分を許容する現実的な線である。

## Open questions

- type-check sensor hook が .ts 編集のたびに audit shard へ SENSOR_FIRED / SENSOR_PASSED を自動追記する。shard の肥大は上流仕様の範囲だが、運用感触は B004 の dogfooding で確認する。
