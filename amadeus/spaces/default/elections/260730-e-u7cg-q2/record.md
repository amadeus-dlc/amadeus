# Election Record — E-U7CG-Q2

- question: U7 callsite-migration Bolt の deliverable 境界。unit-of-work.md U7(L) の責務は「約1600 call site の段階移行(互換 Adapter 経由)、call-site guard」で所有要件 FR-MIG-1/FR-MIG-2/VER-4。後続 U8 legacy-writer-removal は U7 依存で削除ゲート条件に「call site ゼロ」を含む。実測: 非 dist の *.ts で appendAuditEntry 参照 1085 行、うち core/ 内 99 行 — 1 Bolt での全書換えは L サイズを大きく超える。functional-design 自身は GuardAllowlist を「移行開始時に全既存 site で初期化 → batch 変換ごとに縮小」と規定(BR-7/BR-8: shrink-only ratchet)し、段階移行を構造として前提している。論点: 本 Bolt でどこまでを deliverable とするか。U8 の「call site ゼロ」ゲートとの間で実書換え作業が宙に浮かない編成を選ぶこと。各自 unit-of-work.md:44-54、business-rules.md BR-7/BR-8、FR-MIG-2 の実文、appendAuditEntry 参照の実測数を確認して投票せよ。

裁定: 選択肢1の機構一式に加え、第1弾の実書換え batch(core/ 内 99 行)まで本 Bolt に含め、縮小 ratchet の実効を同一 PR で実証する(choice 2: 2票)
内訳: choice1=0票 choice2=2票 choice3=0票 choice4=0票
- 留保(subagent-2, GoA2): core/ 99 行 batch は dist 7 ハーネス再生成+drift check を同一 PR に伴うため PR は肥大するが機械的増分に留まること、および残存 ~790 行(tools/tests 中心)の縮小 batch 群を U8 の call-site ゼロゲート前に明示 Bolt として計画に載せることを条件とする。
- 留保(subagent-1, GoA2): core/ 内 99 行 batch が Bolt 規模を圧迫する場合は batch の分割を許容するが、shrink-only ratchet の実効実証(allowlist 縮小が実際に green で通り、site 追加が赤になる両側実測)を伴う非ゼロの実書換え batch を同一 Bolt に必ず含めること。また残 batch(tests 192 行・scripts 4 行を含む正味 295 行、self-install/dist は再生成で追従)を U8 前の追加 Bolt 群として明示編成し、宙に浮かせないこと。
票タイムライン: 配信 2026-07-30T10:06:20Z → 配信 2026-07-30T10:06:20Z → subagent-2 2026-07-30T10:08:41Z(受理 2026-07-30T10:08:50Z) → subagent-1 2026-07-30T10:09:10Z(受理 2026-07-30T10:09:18Z) → 開票 2026-07-30T10:09:54Z
GoA[E-U7CG-Q2]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
