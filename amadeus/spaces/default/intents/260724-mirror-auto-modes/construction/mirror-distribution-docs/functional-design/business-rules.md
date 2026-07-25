# Business Rules — mirror-distribution-docs

> 上流入力（consumes 全数）: `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

## Rule Sources

`unit-of-work.md`のUnit 5、`unit-of-work-story-map.md`のAS-06／07、`requirements.md`のFR-7〜9／NFR-3／4、`components.md`のC9 owner、`component-methods.md`のruntime semantics、`services.md`のCLI／運用契約を正本とする。AS-08／NFR-5のruntime実装検証はOperation Lifecycle／Gateway Unitが所有する。

## Ownership Rules

- runtime正本は`packages/framework/core/`。
- harness差分はmanifest／emitのpath／metadata変換だけ。
- `dist/`とself-install outputはgenerated。
- C9はC8 runtime rendererを所有しない。
- generated outputを直接修正しない。
- unnecessary harness overlayを作らない。

## Surface Rules

正準surface集合は`claude | codex | cursor | kiro | kiro-ide | opencode`だけである。Gemini CLIを加えず、Kiro IDEをKiroへ併合しない。self-promotionはclaude、codex、cursor、opencodeだけで、Kiro／Kiro IDEは明示的に対象外である。

各surfaceは次を持つ。

- executable mirror tool
- `amadeus-mirror` skill
- manifest／emit registration
- expected relative layout
- tool／skill payloadのcore bytesと同一SHA-256 digest

missing／extra／digest mismatchはfailureである。

## Semantic Rules

skill、CLI help、Guide JA/EN、Reference JA/ENは次の集合を一致させる。

- modes=`off,prompt,auto`
- default=`prompt`
- boolean compatibility=`none`
- boundaries=`intent-capture,phase,park,workflow-completion`
- operations=`create,sync,close`
- manual=`create,sync,close,status,repair`
- failure=`workflow-continues`
- close=`provenance+repository+landing+final-sync`

「autoはsyncだけ」、boolean true／false fallback、unsafe close、background syncを示す文言を禁止する。

## Generator Rules

- generatorはdeterministic。
- temporary output完成前にdestinationを変更しない。
- check modeはread-only。
- newline／encodingを固定する。
- generated timestamp／absolute pathを埋め込まない。
- manifestにないad-hoc copyを行わない。

## Docs Parity Rules

- JA/EN pairは同じtopic ID集合を持つ。
- topic markerは`<!-- amadeus-topic:<topic-id> -->`。
- semantic markerは`<!-- amadeus-contract:<topic-id> <key>=<canonical-json>;... -->`で、topicごとに1個だけ置く。
- 正準pairはGuide 22とReference 20の`.md`／`.ja.md`。
- semantic markerは`MIRROR_USER_CONTRACT`から導出し、mode、default、compatibility、command、boundary、failure／retry、close guard順序、scope exclusionsをruntime正本と完全一致させる。
- prose翻訳の語順や文字列byte一致は要求しない。
- UTF-8 NFC／LFの正規化はproseだけに適用し、payload bytesとcanonical JSON stringは文字どおり比較する。
- 片側missing topicはfailure。
- 両localeが同じ誤ったsemantic valueを持っていてもruntime正本との差分としてfailureにする。
- runtimeに存在しないfuture optionを文書化しない。

## Validation Rules

| Check | Required result |
|---|---|
| typecheck／Biome／unit | pass |
| manifest schema | pass |
| six layout existence | 6/6 |
| contract digest | all equal |
| docs topics | JA=EN |
| legacy wording | 0 hits |
| dist:check | clean |
| promote:self:check | clean |

全checkをANDで評価し、一部surface成功を配布成功にしない。

## Acceptance Scenarios

1. 6 surfaceすべてにtoolとskillが生成される。
2. KiroとKiro IDEが別surfaceとして検証される。
3. core skill変更後に未生成distがあるとdist:checkがfailする。
4. self-install 1面のbyte driftでpromote:self:checkがfailする。
5. Guide JAだけから`prompt` defaultを削るとparity testがfailする。
6. Reference ENへboolean互換を追記するとnegative assertionがfailする。
7. CLI helpとskillのcommand集合が違うとfailする。
8. source／self-installの全layoutで同じIntent selector結果になる。
9. check mode実行後にworking tree outputが変更されない。
10. generated fileだけの手修正を正本変更として受理しない。
11. Kiro／Kiro IDEがself-promotion対象外であることをmissing扱いしない。
12. tool／skill payloadの1 byte差でdigest checkがfailする。
13. topic marker重複またはunknown topicでdocs parityがfailする。
