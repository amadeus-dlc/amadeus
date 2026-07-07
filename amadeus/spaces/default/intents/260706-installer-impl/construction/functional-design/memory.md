# Functional Design Memory — インストーラの実装

## Interpretations

- 2026-07-07T07:35:00Z — U1 Setup Package Shell は persistent installer state を持たず、package metadata / runtime invocation / command parsing / top-level result mapping の value object 設計に限定する。
- 2026-07-07T07:35:00Z — GUI frontend はないが、terminal CLI は user-facing surface なので frontend-components.md は CLI interaction components として記述する。
- 2026-07-07T07:50:00Z — U2 Version And Distribution Source は target mutation を持たず、stable SemVer tag resolution、archive fetch/extract、source metadata の value object と ports に限定する。
- 2026-07-07T07:55:00Z — U2 の archive retry owner は ArchiveSourcePort / GitHubArchiveAdapter に一元化し、loadDistribution は二重 retry しない。
- 2026-07-07T08:05:00Z — U3 Target State And Manifest は manifest-first detection、sentinel fallback、TargetSnapshot に限定し、planning policy と apply/verify を持たない。
- 2026-07-07T08:10:00Z — U3 は上流型を変更せず、invalid/unreadable manifest を readManifest null として sentinel fallback へ流す。
- 2026-07-07T08:20:00Z — U4 Operation Planning And Safety は pure planning と `FileOperationPlan` に限定し、prompt/render/apply/manifest/verify を持たない。
- 2026-07-07T08:35:00Z — U5 Apply Verify And UX は U4 plan の実行、Reporter/Prompt、manifest write after apply、post-apply verification に限定し、planning policy を再計算しない。
- 2026-07-07T08:08:56Z — U7 CI And Package Gates は installer-related PR の blocking gate と package validation に限定し、release/publish 副作用は U8 に残す。
- 2026-07-07T08:21:16Z — U8 Manual Release And Docs は `workflow_dispatch` release、publish guard、post-publish verification、installer-first docs に限定し、通常の main/tag push publish は持たない。

## Deviations

- 2026-07-07T07:35:00Z — 追加の人間質問は実施しない。U1 の CLI command contract は requirements.md、unit-of-work.md、component-methods.md で固定済みであり、曖昧さがないため。
- 2026-07-07T07:50:00Z — U2 でも追加の人間質問は実施しない。FR-007/FR-012 と application-design で source repository、tag policy、retry policy が固定済みであるため。
- 2026-07-07T08:05:00Z — U3 でも追加の人間質問は実施しない。FR-006/FR-013 と application-design で target state、manifest fields、kiro/kiro-ide ambiguity が固定済みであるため。
- 2026-07-07T08:20:00Z — U4 でも追加の人間質問は実施しない。FR-008〜FR-011 と application-design で plan/report/backup/force/no-write policy が固定済みであるため。
- 2026-07-07T08:35:00Z — U5 でも追加の人間質問は実施しない。FR-005/FR-008/FR-013/FR-014 と refined mockups で apply/report/prompt/manifest/verify の契約が固定済みであるため。
- 2026-07-07T08:10:00Z — U3 reviewer 指摘により TargetSnapshot diagnostics を追加せず、既存 `existingFiles[].md5?` の省略で unreadable/unknown を表現するよう修正。
- 2026-07-07T08:08:56Z — U7 でも追加の人間質問は実施しない。FR-016、team testing posture、deployment practice で CI gate と manual release の分離が固定済みであるため。
- 2026-07-07T08:16:03Z — U7 reviewer 指摘により gate ごとの command/cwd/artifact/exit code/timeout/dependency/path condition と security adapter schema を functional design に固定した。
- 2026-07-07T08:21:16Z — U8 でも追加の人間質問は実施しない。FR-015/FR-017 と team deployment practice で manual release button、latest stable tag default、installer-first docs が固定済みであるため。
- 2026-07-07T08:25:49Z — U8 reviewer 指摘により release context の U7 gate は changed-files 判定を使わず無条件実行とし、publish command contract を `cwd=packages/setup` の `npm publish --tag <npm_dist_tag> --access public --provenance` に固定した。

## Tradeoffs

- 2026-07-07T07:35:00Z — U1 に non-interactive missing target/harness の完全な policy 実装を持たせず、flag preservation と classified parse/runtime errors に限定する。mode/policy 判定は downstream units と Application Service で完成させる。
- 2026-07-07T07:50:00Z — U2 は GitHub Release metadata を ordering に使わず supplemental diagnostics に留める。requirements の stable SemVer tag first policy を優先するため。
- 2026-07-07T07:55:00Z — U2 の metadata fallback は absent metadata のみに限定し、present-but-invalid metadata は hard error にする。md5/class の安全性を優先するため。
- 2026-07-07T08:05:00Z — U3 の ManifestStorePort は read/write を持つが、write sequencing は Application Service が所有する。schema/store contract と transaction ordering を混同しないため。
- 2026-07-07T08:10:00Z — U3 の interactive `kiro`/`kiro-ide` ambiguity は `detectTarget` 内で PromptPort がある場合に解決し、非対話では `ambiguous-harness` no-write とする。
- 2026-07-07T08:20:00Z — U4 は non-interactive collision と force backup を policy として決めるが、confirmation prompt と rendered wording は U5/Reporter 側に残す。plan と UX の drift を避けるため。
- 2026-07-07T08:35:00Z — U5 は final plain-text wording と snapshot-testable rendering を所有する。U4 は display data と reason codes のみに留めるため。
- 2026-07-07T08:08:56Z — U7 は line coverage threshold ではなく `covers:` registry/ratchet を品質床として扱う。team practice と U6 test harness の traceability を CI に引き継ぐため。
- 2026-07-07T08:16:03Z — U7 の scanner 実装は具体ツール名ではなく normalized JSON adapter contract に寄せる。上流で tool selection が未固定でも blocking 判定を実装可能にするため。
- 2026-07-07T08:21:16Z — U8 は U7 preflight gates を release workflow で再利用するが、release/publish の承認と credential 境界は U8 に置く。PR gate と production publish の責務を混同しないため。
- 2026-07-07T08:25:49Z — U8 の `ReleaseStepName` は U7 `GateName` と同じ粒度に揃える。release workflow 実装時に丸めた step 名から実体 gate を推測させないため。

## Open questions

- 2026-07-07T07:35:00Z — U2 以降で source loading / target detection / planning safety を薄い skeleton から完全版へ拡張する。
- 2026-07-07T07:50:00Z — concrete archive extraction implementation details and temp-dir cleanup behaviorは code-generation で既存 toolchain に合わせて確定する。
