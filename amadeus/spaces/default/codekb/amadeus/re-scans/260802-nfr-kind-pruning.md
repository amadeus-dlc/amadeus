# re-scan: 260802-nfr-kind-pruning

## メタデータ

- Date: `2026-08-02T18:29:49Z`
- Base commit: `689c38744cb9f4fcf2eb517e490cb66b3bb58ce8`
- Observed commit: `71fcdf106a67d40534ae4b3147adefefcd8ed2de`（`git rev-parse HEAD origin/main` は双方とも同値）
- Distance: `22 commits`（`git rev-list --count 689c38744..71fcdf106`）
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、Depth `Minimal`、Test Strategy `Comprehensive`
- Focus: [Issue #2019](https://github.com/amadeus-dlc/amadeus/issues/2019) — units-generation に kind の書き手契約を接続し、NFR Requirements / NFR Design の既存 `produces_kinds` pruning を通常 workflow で活性化する。
- Scan mode: Developer scan を入力に、Architect が observed 断面の全引用、Git 区間、公式 upstream commit、open PR を read-only で再実測した。

## 差分区間の証拠

- 祖先性: `git merge-base --is-ancestor 689c38744 71fcdf106` → exit `0`。
- 区間規模: `740 files changed, 71380 insertions(+), 6876 deletions(-)`。
- `git log 689c38744..71fcdf106 -- <target paths>` では units-generation、NFR 2 stage、orchestrator、runtime、required-sections sensor/tool、`t133`、`t248`、`t367` に commit なし。
- 近傍で触れた正本は2件だけ。`amadeus-graph.ts` は `9750f8aea fix(plugin)` の plugin stage index hunk、`amadeus-lib.ts` は `8448fdc6e feat(observability)` の execution projection digest field hunkで、下記 kind seam と非交差。
- 結論: 片翼移植の機序は base から observed まで不変で、現行 HEAD に残存する。

## 現行契約の file:line 再確認

| 関心 | observed の一次証拠 | 確認結果 |
| --- | --- | --- |
| 閉じた kind 語彙 | `packages/framework/core/tools/amadeus-lib.ts:65-73` | `service/spec/ui/packaging/library` の5値 |
| untrusted kind 検証 | `amadeus-lib.ts:94-108` | 語彙外・非 string を reject |
| runtime Unit 型 | `amadeus-lib.ts:7851-7855` | `kind?: UnitKind`。legacy の optional 性を型で維持 |
| units parser | `amadeus-lib.ts:8123-8187` | `name`、`depends_on`、optional `kind` を読み、重複／invalid kind を reject |
| DAG parser | `amadeus-lib.ts:8231-8249` | parse error を `malformed`、空 block を reject |
| runtime snapshot | `packages/framework/core/tools/amadeus-runtime.ts:112-122`, `:398-404` | parsed units を `bolt_dag.units` へそのまま投影 |
| applicability | `packages/framework/core/tools/amadeus-graph.ts:791-805` | `produces_kinds` が無い／artifact key が無い場合は全 kind 適用 |
| kind reader | `packages/framework/core/tools/amadeus-orchestrate.ts:1650-1677` | 有効 kind だけ Map 化。kindless は未登録、壊れた row/重複は空 Map |
| consume presence | `amadeus-orchestrate.ts:1925-1948`, `:1951-1995` | required missing を producer-on-path なら `expected:false` と分類 |
| directive outputs | `amadeus-orchestrate.ts:1998-2024` | known kind なら required/optional output を pruning、unknown なら full matrix |
| per-unit coverage | `amadeus-orchestrate.ts:3313-3332` | applicable required files が全てあれば covered。kindless は全 files |
| state artifact guard | `packages/framework/core/tools/amadeus-state.ts:1606-1649` | kind-aware applicable setを使うが、少なくとも1 artifact の存在確認 |
| producer stage body | `packages/framework/core/amadeus-common/stages/inception/units-generation.md:97-122` | Unit 本文／YAML 例とも kind 要求なし。machine block は name + depends_on |
| producer sensor manifest | `packages/framework/core/sensors/amadeus-required-sections.md:38-44` | block の present/well-formed/cycle-free だけを約束 |
| producer sensor tool | `packages/framework/core/tools/amadeus-sensor-required-sections.ts:230-245` | `parseBoltDag` が ok なら pass。全 Unit の kind 実在は見ない |
| NFR Requirements mapping | `packages/framework/core/amadeus-common/stages/construction/nfr-requirements.md:15-34` | library は untagged の security + tech-stack の2件 |
| NFR Requirements Step 6 | `nfr-requirements.md:107-115` | 本文は5成果物を無条件列挙し frontmatter と不一致 |
| NFR Design mapping | `packages/framework/core/amadeus-common/stages/construction/nfr-design.md:13-34` | library は untagged security + tagged logical-components の2件 |
| NFR Design required inputs | `nfr-design.md:24-37` | pruning 前提でも NFR Requirements 5件を一律 required consume |
| NFR Design Step 6 | `nfr-design.md:115-123` | 本文は5成果物を無条件列挙し frontmatter と不一致 |

## upstream 831bd29 の公式確認

`gh api repos/awslabs/aidlc-workflows/commits/831bd29c392eff141a230e1e0501239eae132c31` は成功し、SHA を完全一致で返した。commit patch の `core/aidlc-common/stages/inception/units-generation.md` で確認した正確な様式は次のとおり。

```yaml
units:
  - name: <unit-name>
    kind: service
    depends_on: []
  - name: <another-unit>
    kind: spec
    depends_on: [<unit-name>]
```

upstream prose は `kind` を **optional** とし、存在する場合だけ5語彙に制限する。省略は full construction matrix、invalid 値は edge-block sensor failure。NFR 2 stage の `produces_kinds` mapping はローカル現行と一致する。

Issue #2019 Track A は upstream の逐語 parity ではない。新規 units-generation 成果物では kind を **required** とし、既存 record/runtime parser の `kind?` と full-matrix fallback は維持するローカル policy delta である。これにより新規 producer の欠落を gate で落としつつ、legacy resume を壊さない。

## library の期待行列と未解消の consume 非対称

| Stage | library の required outputs | pruning 後の required upstream inputs |
| --- | --- | --- |
| NFR Requirements | `security-requirements`, `tech-stack-decisions` | functional design / requirements 系は現行どおり |
| NFR Design | `security-design`, `logical-components` | 現行宣言は performance/security/scalability/reliability/tech-stack の5件すべて |

`nfr-design` の性能・拡張性・信頼性 input は、library の upstream stage が意図的に作らない。それでも producer stage は scope path 上にいるため、現行 `splitConsumesByPresence` は3件を `expected:false` の absent consume とする。これは pruning 自体の出力判定とは別 seam であり、normal-path characterization を追加してから、要件段で consumes を kind-aware にするか、stage body が許容する expected absence とするかを決める。

## 実装面

最小の正本変更候補:

1. `packages/framework/core/amadeus-common/stages/inception/units-generation.md` — plan approval、Unit 定義、YAML prose/example、completion に required kind を追加。
2. `packages/framework/core/tools/amadeus-sensor-required-sections.ts` と `packages/framework/core/sensors/amadeus-required-sections.md` — units-generation の新規 output では全 Unit の canonical kind 実在を gate。
3. `packages/framework/core/amadeus-common/stages/construction/nfr-requirements.md` / `nfr-design.md` — Step 6 を directive-applicable artifacts に同期し、pruned N/A file を禁止。Track B の転記抑制を記述。
4. `amadeus/spaces/default/memory/project.md` — stale な「全5成果物」条件を kindless fallback に限定する訂正は、実装 intent の学習／規範変更手順で扱う。
5. `scripts/package.ts` による dogfood harness、7 dist harness、self-install 面の再生成。生成物は手編集しない。

engine の `amadeus-lib.ts` parser、runtime、graph、orchestrator は原則変更不要。consume 非対称の裁定が kind-aware consumes を要求した場合だけ orchestrator/frontmatter の追加変更が生じる。

## Comprehensive test 面

- `tests/unit/t133-bolt-dag-compile.test.ts:232-244`, `:347-358` — 現行 kindless green fixture。新規 producer gate の kind 欠落 red、5値 green、invalid red を追加する。
- `tests/unit/t248-stage-contract.test.ts:32-54`, `:166-223` — 語彙、applicability、tagged/untagged parser は既存 green。legacy optional contract を維持する。
- `tests/integration/t248-stage-contract-routing.test.ts:205-247`, `:443-467` — tagged routing と untagged/malformed full matrix は既存。normal DAG 上の library NFR Requirements 2出力、NFR Design 2出力、各2件だけで covered、NFR Design absent consumes の分類を追加する。
- `tests/integration/t367-degrade-unitname-resolution.test.ts:427-455` — degrade path の library NFR Requirements 2成果物 coverage は既存。normal path／NFR Design の代用にはしない。
- stage-body contract assertion — units-generation の required kind、NFR 2 stage の applicable-only / no N/A contract を正本文言に対して pin する。
- focused tests 後に `bun run lint`、`bun run typecheck`、`bun run test:ci`、`bun scripts/package.ts --check`、`bun run promote:self:check`。必要なら heavy timeout は対象 file を `bun test --timeout 120000` で再確認する。

## open PR 棚卸し

`gh pr list --repo amadeus-dlc/amadeus --state open --search '2019' --json number,title,url,headRefName,baseRefName` の結果は `[]`。scan 時点で Issue #2019 を参照する open Pull Request はなく、引き取り対象はない。

## 明示的な未検証事項

- 本 RE は read-only synthesis であり、修正後の engine E2E、sensor red/green、package regeneration は未実行。
- 50→20成果物および所要時間削減は Issue の試算で、observed `71fcdf106` 上の after 計測ではない。
- `tech-stack-decisions` optional 化を本 intent に含める最終要件は未確定。含めると library の NFR Requirements は2→1になり、NFR Design consume 契約も変わる。
- NFR Design の pruned required consumes を engine が gate/block/recovery のどこまで実害として扱うかは、normal workflow fixture による characterization が未実施。
- upstream は公式 commit API の patch を確認したが、upstream repository checkout での test 実行はしていない。

## Requirements Analysis への引き継ぎ

1. 推奨: Track A は「new producer required / legacy parser optional」の二層契約で固定し、producer gate の落ちる実証を acceptance criterion にする。
2. NFR stage 本文を directive-applicable outputs に同期し、pruned artifact の N/A document 作成を禁止する。転記は file:line 参照または1行判断へ縮退する。
3. library の NFR Design consume 非対称は normal-path characterization 後に裁定する。
4. `tech-stack-decisions` optional 化は dependency surface が独立して広いため、最小 self-fix から分離するのを推奨する。
