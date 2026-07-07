# NFR Requirements Memory — インストーラの実装

## Interpretations

- 2026-07-07T08:30:30Z — U1 Setup Package Shell の NFR は CLI shell の起動、help、parse、runtime wrapper、package metadata に限定し、version resolution、target inspection、planning、apply の NFR は downstream units が所有する。
- 2026-07-07T08:39:29Z — U2 Version And Distribution Source の NFR は stable SemVer resolution、GitHub tag/archive port、archive extraction、source metadata integrity、temp cleanup に限定し、target mutation は扱わない。
- 2026-07-07T08:44:41Z — U3 Target State And Manifest の NFR は manifest-first detection、sentinel fallback、target snapshot、manifest schema/store contract に限定し、planning/apply/manifest write sequencing は扱わない。
- 2026-07-07T08:49:18Z — U4 Operation Planning And Safety の NFR は pure planning、no-write/canApply contract、backup-before-update ordering、force/yes policy、plan traceability に限定し、prompt/render/apply は扱わない。
- 2026-07-07T08:55:45Z — U5 Apply Verify And UX の NFR は approved FileOperationPlan execution、manifest write sequencing、post-apply verification、prompt/reporter UX に限定し、version resolution、target detection、planning policy recalculation は扱わない。
- 2026-07-07T08:59:10Z — U6 Installer Test Harness の NFR は U1〜U5 contracts を deterministic に検証する fake ports、temp fixtures、snapshot tests、coverage registry/ratchet に限定し、runtime installer behavior や release publication は扱わない。
- 2026-07-07T09:04:48Z — U7 CI And Package Gates の NFR は installer-related PR detection、blocking gate execution、security/coverage/drift/package metadata reports、U8 handoff readiness に限定し、npm publish、SBOM/provenance、post-publish verification は扱わない。
- 2026-07-07T09:18:37Z — U8 Manual Release And Docs の NFR は workflow_dispatch release、release-mode U7 preflight、publish guard、SBOM/provenance、post-publish verification、installer-first docs に限定し、ordinary merge/tag push publish や multi-package release orchestration は扱わない。

## Deviations

- 2026-07-07T08:30:30Z — U1 では追加の人間質問を実施しない。`requirements.md`、U1 functional design、`technology-stack.md` で Bun-first、package layout、command grammar、no-write boundary が固定済みであるため。
- 2026-07-07T08:34:11Z — U1 reviewer 指摘により startup performance の測定条件、interactive mode の未指定 harness/target 保持、NFR-004 portability verification を明示した。
- 2026-07-07T08:39:29Z — U2 では追加の人間質問を実施しない。FR-007/FR-012/FR-013 と U2 functional design で tag policy、retry ownership、metadata fallback policy が固定済みであるため。
- 2026-07-07T08:44:41Z — U3 では追加の人間質問を実施しない。FR-006/FR-011/FR-013 と U3 functional design で target state、manifest fields、ambiguous harness、snapshot unknown md5 が固定済みであるため。
- 2026-07-07T08:49:18Z — U4 では追加の人間質問を実施しない。FR-008〜FR-011 と U4 functional design で plan contract、conflict no-write、confirmation-gated operations、backup path policy が固定済みであるため。
- 2026-07-07T08:55:45Z — U5 では追加の人間質問を実施しない。FR-008〜FR-014、NFR-002、NFR-003、NFR-004、NFR-006 と U5 functional design で apply、manifest、verification、prompt、reporter の contract が固定済みであるため。
- 2026-07-07T08:59:10Z — U6 では追加の人間質問を実施しない。FR-001〜FR-016、NFR-001〜NFR-006 と U6 functional design で test layers、fixture workflow、coverage registry、required matrix が固定済みであるため。
- 2026-07-07T09:04:48Z — U7 では追加の人間質問を実施しない。FR-016 と U7 functional design で gate list、command contract、allowlist policy、scanner normalized schema、coverage registry/ratchet が固定済みであるため。
- 2026-07-07T09:18:37Z — U8 では追加の人間質問を実施しない。FR-015/FR-017 と U8 functional design で manual release trigger、default latest stable tag、dry-run、confirm_package、protected environment、publish command、docs command names が固定済みであるため。
- 2026-07-07T09:24:59Z — U8 reviewer 指摘により docs consistency の必須条件に `bunx`、best-effort `npx` caveat、Bun required を追加し、npm publish identity は後続 CI/Deployment design で token mode または trusted publishing mode の exactly one を検証する contract として固定した。

## Tradeoffs

- 2026-07-07T08:30:30Z — U1 の performance target は service SLA ではなく CI smoke/benchmark の品質床として定義する。local CLI shell に availability SLA を置くより、起動/invalid input の accidental heavy import を防ぐ方が実装価値が高いため。
- 2026-07-07T08:34:11Z — U1 は `--harness`/`--target` の明示値を最大1つに制限するが、未指定は downstream prompt/validation に渡す。interactive contract と parser scalability を両立するため。
- 2026-07-07T08:39:29Z — U2 の performance gate は fake ports/local fixtures に限定し、real GitHub network latency を deterministic CI target にしない。外部 service variance を reliability diagnostics と分離するため。
- 2026-07-07T08:44:41Z — U3 は invalid/unreadable manifest を `manifest-installed` とせず sentinel fallback に流す。壊れた manifest を信頼するより manual/partial detection へ落とす方が安全であるため。
- 2026-07-07T08:49:18Z — U4 は destructive safety を runtime apply ではなく plan invariant として先に固定する。U5 が policy を再計算せず approved plan を実行できるようにするため。
- 2026-07-07T08:55:45Z — U5 は rollback restore workflow を初回リリースの reliability requirement に含めない。既存スコープ外判断を守りつつ、backup records、partial apply diagnostics、manifest-write-failed classification で安全性と復旧判断材料を担保するため。
- 2026-07-07T08:59:10Z — U6 は line coverage percentage ではなく requirement/story coverage registry と ratchet を品質床にする。ユーザー可視 install/upgrade safety を Must requirements と直接結び、U7 CI gate が stale/missing coverage を機械的に落とせるようにするため。
- 2026-07-07T09:04:48Z — U7 は scanner tool choice を NFR で固定せず、normalized JSON schema と `security-gate.ts` の blocking 判定を固定する。OSV/gitleaks 等の具体選定を CI Pipeline design に残しつつ、FR-016 の fail conditions を先に安定させるため。
- 2026-07-07T09:18:37Z — U8 は dry-run と publish mode で同じ validation path を共有する。first run を安全に rehearsal でき、publish 時だけ protected environment / npm credential / `confirm_package` が追加 gate になるようにするため。
- 2026-07-07T09:24:59Z — U8 は npm token と trusted publishing のどちらを採用するかをこの NFR stage で固定しない。requirements の open question を尊重しつつ、publish 前に exactly one configured publish identity を検証できない場合は fail する contract で実装ぶれを抑えるため。

## Open questions

- 2026-07-07T08:30:30Z — Node-only compatibility は初回 release では扱わない。将来要求になった場合は separate ADR と NFR 再評価が必要。
