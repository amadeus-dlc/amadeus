# Election Record — E-U7CG-Q1

- question: U7 callsite-migration の call-site guard(VER-4: 直接呼出し・旧 observe 利用の CI 拒否+allowlist shrink-only ratchet)の配置。設計内に矛盾がある: (a) nfr-design/logical-components.md 末尾は「Adapter・guard は packages/framework/core/ 変更のため FR-DST-2 を適用(manifest 登録、dist 7面+self-install 再生成)」と guard を core/ に置くと読める。(b) nfr-requirements/tech-stack-decisions.md は「既存の committed baseline JSON+--check 単調非減少テンプレート(coverage ratchet・CCN baseline と同型)を踏襲」とし、その同型実体 tests/coverage-project-gate.ts / tests/complexity-gate.ts + tests/.complexity-baseline.json は repo 専用 dev ツールで dist へ投影されない。実測上の対立点: core/ 配置は repo 専用 CI lint を全ハーネス利用者へ出荷し、guard が tests/ 等の repo パスを参照するため t258 boundary guard(出荷 core/tools は repo パス非参照、blocking)と衝突しうる。各自 t258 の実契約・兄弟テンプレートの実配置・logical-components.md / tech-stack-decisions.md の当該文を実測して投票せよ。

裁定: guard 本体+allowlist JSON は tests/ に置き既存兄弟テンプレート(coverage/complexity gate)へ揃える。CI は lint ジョブ内の1ステップ。Adapter のみ core/ で FR-DST-2 適用。logical-components.md の当該文は Adapter に妥当・guard には過大一般化として申告付きで読み替える(choice 1: 2票)
内訳: choice1=2票 choice2=0票 choice3=0票
- 留保(subagent-1, GoA2): logical-components.md:21 の読み替えは code-summary の Deviation 申告に加え、当該設計文へも申告付き追記(Adapter のみ FR-DST-2 適用)を残し、record 内の矛盾文を無修正のまま残さないこと
- 留保(subagent-2, GoA2): logical-components.md:21 の guard 側読み替えは code-summary の Deviation 節へ申告記録を必須とし、guard 自身の allowlist JSON は t258 の allowlist とは別台帳として shrink-only ratchet 契約を明記すること
票タイムライン: 配信 2026-07-30T10:06:19Z → 配信 2026-07-30T10:06:19Z → subagent-1 2026-07-30T10:08:12Z(受理 2026-07-30T10:08:23Z) → subagent-2 2026-07-30T10:09:01Z(受理 2026-07-30T10:09:14Z) → 開票 2026-07-30T10:09:54Z
GoA[E-U7CG-Q1]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
