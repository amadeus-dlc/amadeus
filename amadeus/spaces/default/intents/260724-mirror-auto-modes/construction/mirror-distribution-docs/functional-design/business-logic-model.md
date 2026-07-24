# Business Logic Model — mirror-distribution-docs

> 上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

## Functional Boundary

`unit-of-work.md`のUnit 5、`unit-of-work-story-map.md`のAS-06／07、`requirements.md`のFR-7〜9／NFR-3／4、`components.md`のC9、`component-methods.md`の完成runtime contract、`services.md`のCLI／運用特性を配布と文書へ投影する。AS-08／NFR-5のruntime実装検証はOperation Lifecycle／Gateway Unitが所有し、C9は確定済みsemanticsの文書・配布projectionだけを検証する。

C9はbuild-time projectionだけを所有し、runtime mode判断、state、GitHub mutation、C8 rendererを再実装しない。

## Source of Truth

正本を次へ限定する。

- runtime tool／types／policy／state integration: `packages/framework/core/tools/`
- user-invocable skill: `packages/framework/core/skills/amadeus-mirror/SKILL.md`
- projection registry: `packages/framework/harness/projections.ts`（surface ID、dist path、self-install stance／path）
- harness固有registration emitter: `packages/framework/harness/<harness>/{manifest,emit}.ts`
- package projection: `scripts/package.ts`
- self-install projection: `scripts/promote-self.ts`
- Guide／Reference: repositoryの正準日英source pair
- user contract value: C8 ownerの`packages/framework/core/tools/amadeus-mirror-presentation.ts`がexportするimmutable `MIRROR_USER_CONTRACT`

`dist/`、`.claude/`、`.codex/`、`.agents/`、`.cursor/`、`.opencode/`の生成対象を独立正本として手編集しない。

`MIRROR_USER_CONTRACT`はmodes、default、compatibility、boundaries、operations、manual commands、failure semantics、close guardsだけを持つruntime-safe data exportである。C8 rendererとCLI helpが同module内で利用し、C9 test／skill／docs validatorが一方向にimportする。runtimeからC9へのimportは禁止する。

## Six-surface Projection

正準surface IDと出力rootを固定する。

| ID | Manifest / emitter | Dist tool | Dist skill | Self-install |
|---|---|---|---|---|
| claude | `harness/claude/manifest.ts` / manifest | `dist/claude/.claude/tools/amadeus-mirror.ts` | `dist/claude/.claude/skills/amadeus-mirror/SKILL.md` | tool: `.claude/tools/amadeus-mirror.ts`、skill: `.claude/skills/amadeus-mirror/SKILL.md` |
| codex | `harness/codex/manifest.ts` / `emit.ts` | `dist/codex/.codex/tools/amadeus-mirror.ts` | `dist/codex/.agents/skills/amadeus-mirror/SKILL.md` | tool: `.codex/tools/amadeus-mirror.ts`、skill: `.agents/skills/amadeus-mirror/SKILL.md` |
| cursor | `harness/cursor/manifest.ts` / `emit.ts` | `dist/cursor/.cursor/tools/amadeus-mirror.ts` | `dist/cursor/.cursor/skills/amadeus-mirror/SKILL.md` | tool: `.cursor/tools/amadeus-mirror.ts`、skill: `.cursor/skills/amadeus-mirror/SKILL.md` |
| kiro | `harness/kiro/manifest.ts` / manifest | `dist/kiro/.kiro/tools/amadeus-mirror.ts` | `dist/kiro/.kiro/skills/amadeus-mirror/SKILL.md` | 対象外（distのみ） |
| kiro-ide | `harness/kiro-ide/manifest.ts` / manifest | `dist/kiro-ide/.kiro/tools/amadeus-mirror.ts` | `dist/kiro-ide/.kiro/skills/amadeus-mirror/SKILL.md` | 対象外（distのみ） |
| opencode | `harness/opencode/manifest.ts` / `emit.ts` | `dist/opencode/.opencode/tools/amadeus-mirror.ts` | `dist/opencode/.opencode/skills/amadeus-mirror/SKILL.md` | tool: `.opencode/tools/amadeus-mirror.ts`、skill: `.opencode/skills/amadeus-mirror/SKILL.md` |

各manifestはcore正本の同じlogical tool／skill IDを登録する。tool bytesと`amadeus-mirror/SKILL.md` bytesはcore sourceと全surfaceで完全一致を要求し、frontmatter変換を許可しない。harness固有registration／wrapperは別artifactとして扱い、payload digest比較へ混ぜない。

## Packaging Workflow

1. core runtime／skill／docs sourceを更新する。
2. 共通projection manifestの6 entryがtool／skill、dist path、self-install stance／pathを宣言していることをvalidateする。
3. package generatorを一時directoryへ実行する。
4. surfaceごとにrequired relative pathsとSHA-256 byte digestを収集する。
5. checked-in `dist/`と一時生成物をbyte比較する。
6. promote generatorも同じprojection manifestを読み、一時directoryへ実行してself-install対象とbyte比較する。promote側にsurface／path listを持たない。
7. mismatchはsurface、relative path、missing／extra／content mismatchを列挙してfailする。

generatorは同じinputで同じbytesを出す。tool／skill payloadはbyte-exact、registration／wrapperは各manifestのgolden outputとbyte-exactに比較する。content normalizationは行わない。生成時刻、absolute path、cwd、machine-specific newlineを出力へ含めない。

## Skill and CLI Contract

`amadeus-mirror` skillは次を明記する。

- config: `off | prompt | auto`、既定prompt、boolean拒否、Global < Space < Intent
- lifecycle boundary: Intent Capture、phase verification、park、workflow completion
- manual commands: create、sync、close、status、repair
- promptはoperation別、autoはcreate／sync／safe closeだけ
- GitHub failureはworkflow非阻害
- provenance／repository／landing／final-sync guard
- statusのmode、Issue、provenance、pending、warning

CLI helpとskillのcommand名／option／defaultを同じcontract fixtureから検証する。「autoはsyncだけ」という旧文言はnegative assertionで拒否する。

command schemaは次に固定する。全commandでpositional argumentを許可せず、`--intent <dirName>`を省略した場合はactive Intentを選択する。

| Command | Required options | Optional options |
|---|---|---|
| `create` | なし | `--intent <dirName>` |
| `sync` | なし | `--intent <dirName>` |
| `close` | なし | `--intent <dirName>` |
| `status` | なし | `--intent <dirName>` |
| `repair status` | なし | `--intent <dirName>` |
| `repair relink` | `--issue <n>` | `--intent <dirName>` |
| `repair abandon` | `--operation <id>` | `--intent <dirName>` |

## Documentation Parity

正準文書pairを`docs/guide/22-intent-mirror.md`／`.ja.md`と`docs/reference/20-intent-mirror.md`／`.ja.md`に固定し、topic ID単位で対応付ける。各topicはリテラルmarker `<!-- amadeus-topic:<topic-id> -->`で開始し、次markerまたはEOFまでをsectionとする。markerは各fileで一意でなければならない。

| Topic ID | Required semantics |
|---|---|
| modes | off／prompt／auto、既定prompt、boolean非互換 |
| precedence | Global < Space < Intent |
| boundaries | capture／phase／park／completion |
| completion | create→final sync→safe close |
| failure | non-blocking、warning、retry／reconciliation |
| safety | provenance／repository／landing／final-sync |
| cli | create／sync／close／status／repair |
| scope | autoはIntent Mirrorだけ、PR等を含まない |

parity testは翻訳文字列のbyte一致ではなく、marker集合と`MIRROR_USER_CONTRACT`からtopicごとに導出した正準semantic fieldを比較する。各sectionには`<!-- amadeus-contract:<topic-id> <key>=<canonical-json>;... -->`を1個置き、validatorはkey順を正規化して次の必須値と完全一致させる。

| Topic ID | Canonical semantic fields |
|---|---|
| modes | `modes=["off","prompt","auto"]`、`default="prompt"`、`compatibility="reject-boolean"` |
| failure | `workflowContinues=true`、`retry="boundary-only"`、`warning="global-visible"` |
| safety | `closeGuards=["provenance","repository","landing","final-sync"]`（順序も一致） |
| scope | `automation="intent-mirror-only"`、`excludes=["pr","merge","release","publish","deploy","repair"]` |

他topicも`MIRROR_USER_CONTRACT`の対応fieldから同じ形式で導出する。parserはproseに限りUTF-8をNFC normalizeし、改行をLFへ統一する。payload bytesとcanonical JSON string内のcase／hyphen／space／配列順は変更しない。日英どちらかだけにtopic／contract markerがない、unknown keyがある、または値が正本と違う場合はfailする。これにより日英が同時に同じ誤記をしても、runtime contractとの差分として検出する。

## Distribution Validation

validation matrixは次を全て必須にする。

1. core typecheck／Biome／unit tests。
2. manifest schema validation。
3. six-surface tool／skill existence。
4. runtime contract digest parity。
5. CLI help／skill command parity。
6. docs topic parityとlegacy wording absence。
7. `dist:check`。
8. `promote:self:check`。

1件でも失敗すれば配布readyにしない。missing surfaceをwarningへ降格しない。

## Root Resolution Scenarios

source layoutと各self-install layoutから同じworkspace selectorを呼び、固定親階層数を使わない。test fixtureはdefault／non-default space、explicit／active Intent、各surface tool locationを網羅し、解決結果のIntent record identityを比較する。

## Failure and Rollback

- transaction対象はprojection manifestが列挙するfileだけとし、surface root全体や管理外fileを置換しない。各対象fileは同じ親directory内でnew fileを完成・fsyncしてからatomic renameし、親directoryをfsyncする。
- generate／recoverはrepository-local transaction lockをexclusive取得し、check／validationは同じlockをshared取得する。これにより準拠readerは更新前または更新後の完全snapshotだけを読み、commit途中を観測しない。
- journalは全対象fileのold／new digest、backup／absent marker、固定commit順を置換前にfsyncする。途中失敗はrelease successを返さずjournalとbackupを保持する。
- checkは未完journalを`recovery-required`としてread-onlyでfailする。rollbackは`bun scripts/distribution-transaction.ts recover`または次回mutating generateのpreflightだけがexclusive lock下で行い、commit済みfileを逆順に復元する。
- rollback失敗はfail closedとし、journalとbackupを削除しない。recover後はmanifest管理file集合が旧snapshotへ一致し、管理外fileが不変であることをdigest検証する。
- check commandはread-onlyで生成差分を報告し、正本を書き換えない。
- generated outputだけに修正がある場合はfailし、core／manifest／generator source変更を要求する。
- docs pair片側だけの変更はparity failureにする。
- package／promote failureはreleaseを止めるが、runtimeのAI-DLC workflowを操作しない。


## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T05:47:26Z
- **Iteration:** 1
- **Scope decision:** none

配布対象とC9の責務境界は概ね上流と整合するが、contract fixtureの所有方向、digest比較規則、self-install配置、文書parity入力が未確定。

### Findings

- Blocker — RuntimeContractFixtureのownerと依存方向が未定義。runtime coreを正本としてC8が利用し、C9が一方向に参照する具体module/path/APIが必要。
- Blocker — 配布同一性の判定規則が矛盾。artifact種別ごとのbyte一致範囲と許容変換が必要。
- Major — self-install投影表が欠落。surfaceごとのmanifest、emitter、dist root、self-install root、tool path、skill pathが必要。
- Major — 文書parityのmarker構文、正準ファイル、topic対応、literal正規化が未定義。
- Major — AS-08／NFR-5のtraceabilityがUnit境界と不一致。

## Review Iteration 1 Remediation

- C8 ownerの`amadeus-mirror-presentation.ts`に`MIRROR_USER_CONTRACT`を置き、runtimeとC9の依存を一方向へ固定した。
- tool／skill payloadは全surfaceでcore bytesと完全一致、harness registrationは別golden artifactとして比較する規則へ統一した。
- 6 surfaceのmanifest／emitter、dist tool／skill path、self-install対象有無を表へ固定した。
- Guide 22／Reference 20の日英pair、topic marker構文、NFC／LFとbacktick literal比較規則を定義した。
- C9 traceをAS-06／07とNFR-3／4へ限定し、AS-08／NFR-5のruntime検証はOperation Lifecycle／Gateway ownerへ戻した。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T05:52:08Z
- **Iteration:** 2
- **Scope decision:** none

初回指摘は概ね修正されたが、digest規則、self-install配置、CLI fixture、文書parity、traceabilityに欠落が残る。

### Findings

- Major — digest規則がraw bytesとnormalized digestで矛盾。
- Major — self-install配置表で4対象面のliteral tool／skill pathが不足。
- Major — RuntimeContractFixtureに--intent option schemaがない。
- Major — 文書parityがcompatibility、failure、close guards、scope exclusionsの意味同等性を保証できない。
- Major — AS-08／NFR-5の責務境界が3成果物で不一致。

## Review Iteration 2 Remediation

- payload digestをsource raw bytesへのSHA-256に統一し、payloadにはUnicode／改行正規化を適用しない規則へ揃えた。
- self-promotion対象4面のtool／skill literal pathを列挙し、Kiro／Kiro IDEを「対象外（distのみ）」と明示した。
- 通常4 commandとrepair 3 commandについて、required／optional option、positional argument禁止、active Intent既定を固定した。
- docs sectionに正準contract由来の構造化semantic markerを要求し、compatibility、failure／retry、close guard順序、scope exclusionsをruntime正本と直接照合するようにした。
- 3成果物のtraceabilityをAS-06／07とNFR-3／4へ統一し、AS-08／NFR-5をruntime ownerへ戻した。
