# Election Record
Election ID: E-260819-RFC0001-BT-S13
Run ID: run-1
Lifecycle: tallied
Established questions: 1
Hold questions: 0
Held question IDs: none

## Question q-learnings-selection: intent 260815-rfc-autonomy-modes の build-and-test ステージ §13 学習選定。候補は3件。project.md の Learnings Inbox へ採用すべき候補を1つ選ぶか、いずれも採用しないかを裁定せよ。判断基準は (a) 一般化可能性 — 将来の runner が同じ判断に到達できるか (b) 既存ノルムとの重複・矛盾の有無。既存ノルムは amadeus/spaces/default/memory/project.md と team.md を実読して確認すること(特に cid:build-and-test:c2-no-test-theatre-for-absent-nfr / c1-build3029 / c2-build3029 と cid:code-generation:push-first)。
Established: upstream-coverage センサーを stage 成果物だけでなく memory.md にも手動発火させ、不要な FAILED 行を1件作った (choice 3)
Choice counts:
- Choice 1 性能テストは「適用可能な NFR 不在(N/A)」と判定し実体を作らなかった: 0
- Choice 2 検証は remote CI ではなくローカルフルスイートを正本とした: 0
- Choice 3 upstream-coverage センサーを stage 成果物だけでなく memory.md にも手動発火させ、不要な FAILED 行を1件作った: 2
- Choice 4 いずれも採用しない(0 件で可): 0
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-19T08:13:10Z] GoA 2: 採用するが Inbox への文面は「反省文」ではなく機械判定可能な規則として書くこと。最低限 (1) 手動 fire の許可対象は stage graph の produces + optional_produces に限る (2) 根拠として document-shape/governance センサーが hook 経路では invocationDeclaresOutput で produces へ絞られる一方、手動 fire 経路は設計上ゲートされない旨(.claude/tools/amadeus-sensor-invocation.ts:20-24 の逐語コメント「the conductor's manual `amadeus-sensor.ts fire` path is not gated and remains the authoritative gate-preparation check」)(3) 監査は append-only のため誤発火の FAILED 行は取り消せない、の3点を含めること。近接則 cid:formal-model-check:fmc-no-activation-record-on-not-applicable(発火条件外で record verb を実行しない)と同族である旨も併記し、次回蒸留での統合候補として明示すること。
- Reservation subagent-2 [original:2026-08-19T08:13:00Z] GoA 2: 採用に賛成するが、記載形を「一回性の反省」ではなく機械化可能な一般則にすること。すなわち『手動 amadeus-sensor.ts fire の対象集合は run-stage directive の produces / optional_produces から導出し、ステージディレクトリの列挙から作らない。理由は (a) 自動 hook 側は document-shape / governance カテゴリに invocation scope 検査を課すが、manual path は構造的に無検査(packages/framework/core/tools/amadeus-sensor-invocation.ts:22-24 逐語「the conductor's manual `amadeus-sensor.ts fire` path is not gated and remains the authoritative gate-preparation check」、判定は同ファイル :110-118 sensorAllowsInvocationOutput / :74-87 invocationDeclaresOutput) (b) 監査は append-only のため誤発火の SENSOR_FAILED 行は取り消せず、実在しない finding を恒久的な証拠として残す(P2 に反する)』という形で書く。あわせて file:line 実測と audit seq の一次証跡を併記すること。将来的な機械化(manual fire 側にも produces 検査を課す、または memory.md を拒否する)は Issue 起票が望ましく、ノルム追記はその代替ではない。
Late responses:
- None
Run lineage: run-1

## Timeline
- tallied at=2026-08-19T08:14:06Z run=run-1