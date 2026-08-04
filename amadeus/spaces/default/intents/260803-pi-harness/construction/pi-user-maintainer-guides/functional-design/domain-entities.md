# Pi 利用者・保守者ガイド — Domain Entities

## モデル境界と上流トレーサビリティ

本 Unit は永続 database を導入しない。`unit-of-work` と `unit-of-work-story-map` が定める spec Unit として、`requirements` の FR-VAL-003 / FR-VAL-004 / NFR-SEC-003 を検証する immutable catalog と parser result を扱う。`components` / `component-methods` の各公開 registry を参照し、`services` の短命 command lifecycle 内だけで検査する。runtime entity の所有権は各実装 Unit に残し、ここでは文書投影用 value object と検証 aggregate だけを定義する。

## Aggregate 一覧

### PiGuideContractSpec

日英文書に必要な意味契約の aggregate root。version 付き immutable authored source であり、実装 surface の一覧そのものは複製しない。

| Field | Type | Rule |
|---|---|---|
| `contractVersion` | `GuideContractVersion` | parser と全文書が完全一致 |
| `documents` | `GuideDocumentRequirement[]` | document ID は一意、locale pair は全単射 |
| `sections` | `GuideSectionRequirement[]` | document kind ごとの順序付き集合 |
| `claims` | `GuideClaimRequirement[]` | section に所属し、重要事実を識別 |
| `facts` | `PiGuideFactCatalog` | critical claim の命題・極性・型付き値 |
| `commands` | `GuideCommandRequirement[]` | canonical token 列と safety class を保持 |
| `links` | `GuideLinkRequirement[]` | locale / target / anchor policy を保持 |

`PiGuideContractSpec` は「何を説明するか」と critical claim の正しい命題を所有する。「現在どの event / resource / test が存在するか」は `PiPortingCatalogProjection` から取り込み、二重管理しない。

### PiGuideFactCatalog

compliance-critical claim を自由文から分離した、versioned immutable first-class collection。verifier と同じ source revision / distribution version に束縛され、文書から期待値を再構成しない。

| Field | Type | Rule |
|---|---|---|
| `schemaVersion` | `GuideFactSchemaVersion` | unknown version は fail-closed |
| `facts` | `GuideFactSet` | fact ID と `(subject, predicate)` は一意 |
| `localeTemplates` | `GuideFactLocaleTemplateSet` | fact が参照する英日 template を全件保持 |
| `payloadDigest` | `Sha256Digest` | catalog 全体の canonical digest |
| `sourceRevision` | `SourceRevision` | verifier / requirements catalog と一致 |

catalog は `PiGuideContractSpec` の package/build artifact として生成し、実行 verifier は埋込 expected digest と完全一致するものだけを受理する。target 文書と catalog を同時改変しても、verifier 自身の expected digest に一致しないため pass しない。

### PiPortingCatalogProjection

各実装 Unit の正準 catalog を保守者文書用の published language へ写す read-only aggregate。

| Field | Type | Rule |
|---|---|---|
| `schemaVersion` | `PortingCatalogSchemaVersion` | verifier が対応する version のみ受理 |
| `distributionVersion` | `DistributionVersion` | 実行 verifier と対象 source revision に束縛 |
| `entries` | `PortingCatalogEntrySet` | ID 一意、category ごとの first-class collection |
| `payloadDigest` | `Sha256Digest` | canonical serialization から導出 |
| `sourceReceipts` | `CatalogSourceReceipt[]` | origin registry と生成 revision を証明 |

projection は `PiHarnessManifestCatalog`、lifecycle event catalog、child driver capability catalog、Unit test inventory、packager inventory を入力に package/build 時生成する。文書や observed `dist/pi` から期待 catalog を再構成しない。

### GuideVerificationRun

一回の deterministic 文書検査を表す aggregate root。filesystem snapshot を取得してから parse し、途中変更を別 run の入力として扱う。

| Field | Type | Rule |
|---|---|---|
| `runId` | `GuideVerificationRunId` | run 内一意、内容判定には使わない |
| `contractDigest` | `Sha256Digest` | `PiGuideContractSpec` の正準 digest |
| `portingCatalogDigest` | `Sha256Digest` | 信頼済み projection の digest |
| `documents` | `ParsedGuideDocumentSet` | 必須 document ID 全件 |
| `results` | `GuideCheckResultSet` | check ID ごとにちょうど一 terminal result |
| `status` | `healthy | unhealthy` | 全 required check pass のときだけ healthy |

catalog 取得 / digest 検証に失敗した場合、catalog 依存 check は `blocked-by(pi.guide.catalog)` とし、run 全体は `unhealthy` になる。observed 文書から期待集合を fallback 生成しない。

## Entity と Value Object

### GuideDocumentRequirement

| Field | Type | Description |
|---|---|---|
| `documentId` | `GuideDocumentId` | `pi.user.en` などの安定 ID |
| `kind` | `user | maintainer` | 必須 section policy を選ぶ |
| `locale` | `en | ja` | 表示言語 |
| `relativePath` | `RepositoryRelativePath` | root 外、symlink escape、絶対 path を拒否 |
| `pairId` | `GuideDocumentId` | 対応 locale 文書 |
| `indexEntries` | `IndexEntryRequirement[]` | 英日 index への登録要件 |

### GuideSectionRequirement

section ID、所属 document kind、順序、必須 claim ID set、最小 content shape を保持する value object。見出し文字列は locale 表示値であり identity に使わない。未知 section を silently ignore しない。

### GuideClaimRequirement

| Field | Type | Description |
|---|---|---|
| `claimId` | `GuideClaimId` | 翻訳しない安定 ID |
| `sectionId` | `GuideSectionId` | 所属 section |
| `evidenceKind` | `catalog | command | repository-link | external-spec` | claim の根拠形 |
| `sourceRefs` | `SourceReference[]` | 正準 catalog entry または link ID |
| `contentRequirement` | `prose | code | warning-before` | 空 marker 防止規則 |
| `factId` | `GuideFactId | null` | critical claim は必須、informational claim は null 可 |

informational claim は翻訳文そのものを保持しない。critical claim は `factId` で typed fact に結び、両言語が同じ反証可能事実を持つことを ID / 根拠 / typed payload / generated locale anchor で検査する。

### GuideFact

| Field | Type | Description |
|---|---|---|
| `factId` | `GuideFactId` | 翻訳しない安定 ID |
| `subject` | `GuideFactSubject` | 例: `pi-package-extension`、`native-windows` |
| `predicate` | `GuideFactPredicate` | closed enum。例: `can-execute`、`support-status`、`minimum-version` |
| `operator` | `eq | in | excludes | gte | requires` | value の比較意味 |
| `polarity` | `positive | negative` | 否定を文字列解釈に委ねない |
| `value` | `BooleanFactValue | SemverFactValue | PlatformSetFactValue | SourceKindSetFactValue | RefKindSetFactValue` | predicate ごとの型付き値 |
| `requiredCommandIds` | `GuideCommandId[]` | fact と同時に示す手順 |
| `requiredLinkIds` | `GuideLinkId[]` | fact の根拠 / 詳細 |
| `renderTemplateIds` | `{ en: TemplateId; ja: TemplateId }` | 信頼済み locale renderer の template |
| `factDigest` | `Sha256Digest` | canonical payload から導出 |

`GuideFact.parse()` は predicate と value variant の対応を構築時に保証する。例えば `minimum-version` に boolean、`can-execute` に semver を与えられない。polarity、operator、typed value は canonical JSON に含まれ、digest 算出前に key order / Unicode / platform order を正規化する。

### CanonicalGuideFactBlock

文書 snapshot から parse される entity。`factId`、schema、埋込 canonical payload、digest、locale、可視 anchor、source location を持つ。`verifyAgainst(catalog, renderer)` は次を不可分に検証する。

1. catalog に同じ fact ID が存在する。
2. payload が catalog fact の canonical payload と byte 一致する。
3. payload から再計算した digest、marker digest、catalog digest が一致する。
4. locale renderer が catalog fact から生成した文と可視 anchor が whitespace / line-ending の正規化後に一致する。
5. required command / link ID が同じ section に存在する。
6. `warning-before` fact は対応 install command より前にある。

block start / payload / end の欠落、nesting、duplicate fact ID は parse failure である。

### NormativeFactRestatementGuard

critical fact の controlled published language を canonical block 外へ漏らさない検査 entity。各 `GuideFact` の locale template が宣言する reserved subject token、predicate phrase、typed literal / negation form を lexer rule として持ち、block 外に同じ `(subject, predicate)` の assertion があれば `Fail(pi.guide.fact.restatement)` を返す。単なる link label / code identifier は assertion と区別する。guard rule 自体も fact catalog digest に含め、文書側から緩和できない。

### GuideCommandRequirement

command ID、argv token、placeholder、適用 scope、safety class、前提 claim を持つ immutable value object。shell 文字列の見た目ではなく token 配列で等価性を比較する。

`safetyClass` は次のいずれか:

- `read-only`: `pi --version`、`pi list`、doctor、status
- `install`: setup install、`pi install -l ...`
- `update`: setup update、`pi update ...`
- `remove`: setup uninstall、`pi remove ... -l`

`install` / `update` / `remove` は対象、scope、結果を説明する claim が先行する。recursive delete は catalog へ登録しない。

### GuideLinkRequirement

link ID、source document kind、locale target policy、repository-relative target / anchor または canonical HTTPS URL を保持する。relative target は source snapshot 内で regular file として解決し、root escape を拒否する。外部到達性は任意 network probe とし、deterministic integrity result と分離する。

### PortingCatalogEntry

discriminated union とし、全 variant が `entryId`、`category`、`ownerUnit`、`authoredSource`、`verificationId` を持つ。

| Variant | Additional fields |
|---|---|
| `RegistrationEntry` | registration seam、generated destination、projection consumer |
| `EventMappingEntry` | Pi native event、canonical event、presence / mutation policy、fixture ID |
| `DriverCapabilityEntry` | request / result contract、process guarantee、negative test ID |
| `TestInventoryEntry` | test tier、owner、live gate、formal-evidence eligibility |
| `GeneratedInventoryEntry` | generator、authored inputs、generated path、drift command |

同じ entry ID を複数 category へ再利用しない。`ownerUnit` は責任分界であり、文書の進捗 status ではない。

### ParsedGuideDocument

snapshot bytes から一度だけ生成する immutable entity。

| Field | Type | Description |
|---|---|---|
| `identity` | `GuideDocumentIdentity` | document / locale / contract version |
| `sections` | `ParsedSectionSet` | ID、order、source location |
| `claims` | `ParsedClaimSet` | ID、section、隣接 content shape、fact ID |
| `factBlocks` | `CanonicalGuideFactBlockSet` | typed payload / digest / generated locale anchor |
| `commands` | `ParsedCommandSet` | ID、tokenized command、source location |
| `links` | `ParsedLinkSet` | ID、raw target、resolved target |
| `portingEntries` | `ParsedPortingEntrySet` | maintainer 文書だけが持つ |

parser は fenced code block 内の marker 例、HTML comment 風の文字列、malformed marker を区別する。parse error を空集合へ丸めない。

### GuideCheckResult

```text
GuideCheckResult =
  | Pass(checkId, documentIds, evidence)
  | Fail(checkId, documentIds, expected, observed, remediation)
  | Blocked(checkId, blockedBy, remediation)
```

`evidence` は ID / relative path / digest だけを含み、home 絶対 path、credential、provider token を含めない。

## First-Class Collections と不変条件

### ParsedGuideDocumentSet

- `PiGuideContractSpec.documents` と ID set が完全一致する。
- locale pair は `en ↔ ja` の全単射で、同じ kind / contract version を持つ。
- duplicate path、duplicate document ID、case-fold collision を拒否する。

### PortingCatalogEntrySet

- entry ID と `(category, authoredSource, generatedDestination?)` の衝突を拒否する。
- source receipt のない entry は作れない。
- expected entry を observed 文書側から追加・削除できない。

### GuideCheckResultSet

- required check ID ごとに exactly one terminal result を持つ。
- `Fail` / `Blocked` が一件でもあれば `healthy` を生成できない。
- unsupported native Windows、catalog missing、locale mismatch を advisory pass に降格しない。

## 関係

```text
PiGuideContractSpec 1 ── requires ── * GuideDocumentRequirement
PiGuideContractSpec 1 ── requires ── * GuideSection/Claim/Command/LinkRequirement
PiGuideContractSpec 1 ── owns ── 1 PiGuideFactCatalog
PiGuideFactCatalog 1 ── contains ── * GuideFact
PiPortingCatalogProjection 1 ── contains ── * PortingCatalogEntry
GuideVerificationRun 1 ── parses ── 4 ParsedGuideDocument
GuideVerificationRun 1 ── compares ── 1 PiGuideContractSpec
GuideVerificationRun 1 ── compares ── 1 PiPortingCatalogProjection
GuideVerificationRun 1 ── emits ── * GuideCheckResult
```

テキスト表現: 一回の検査 run は、typed fact を含む文書意味契約と実装由来 porting catalog を信頼済み期待値として読み、四つの文書 snapshot を parse する。critical fact は payload / digest / generated locale anchor を照合し、block 外の normative restatement を拒否する。その後に catalog の双方向比較を行う。文書は期待値の正本にならない。

## Lifecycle

```text
catalog-load → catalog-verified → snapshot-captured → parsed → compared → reported
      │                 │                │           │          │
      └─ fail ──────────┴────────────────┴───────────┴──────────┴→ unhealthy
```

1. verifier と同じ distribution / source revision に束縛された guide contract、fact catalog、porting catalog を読み、schema / version / digest を検証する。
2. 四文書と index の regular-file snapshot を取得する。
3. marker、section、claim、canonical fact block、command、link、porting entry を parse する。
4. fact payload / polarity / typed value / digest / locale anchor、block 外 restatement、locale parity、必須集合、順序、link、machine catalog 双方向差分を計算する。
5. check ID ごとの terminal result と全体 status を返す。runtime state、audit、workflow pointer、文書を変更しない。

## Ownership と統合境界

- `pi-user-maintainer-guides`: `PiGuideContractSpec`、文書、parser / verifier、guide negative fixture。
- `pi-harness-foundation`: harness / skill / stage registration catalog。
- `pi-lifecycle-gate-adapter`: native event mapping catalog と fixture inventory。
- `pi-child-execution-driver`: driver capability / terminal behavior catalog。
- `pi-distribution-installation`: package / setup / generated inventory と source identity。
- `pi-doctor-diagnostics`: doctor check ID と remediation contract。
- `pi-conformance-evidence`: cross-unit live journey、TUI dogfood、正式 green evidence。

この所有関係により、ガイド Unit は他 Unit の catalog を読むが、その runtime contract や正式 evidence を編集・捏造しない。
