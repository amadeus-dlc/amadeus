# Unit Story Map

> 上流入力（consumes 全数）: `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`

## Mapping方針

User Storiesステージは本scopeでSKIPされ、`stories.md`は生成されていない。そのため`requirements.md`の受け入れ基準とFR-1〜10を利用者価値のacceptance sliceへ正規化し、`components.md`／`component-methods.md`のowner、`services.md`のflow、`component-dependency.md`のDAG、`decisions.md`の安全判断へ対応付ける。

このStory MapはUnit間の経済的な実装順序を決めない。各Unit内の番号は、そのUnitだけを検証可能にするcontract→behavior→failure testの局所順序を表す。

## Acceptance Slice

| ID | 利用者価値 | 主な要件 |
|---|---|---|
| AS-01 | 管理者が`off | prompt | auto`を曖昧さなく設定できる | FR-1、FR-2 |
| AS-02 | Intent所有者が安全にMirror Issueを1件だけ作成できる | FR-3、NFR-1、NFR-2 |
| AS-03 | 共同開発者がphase／park状態をIssueで追跡できる | FR-4、FR-10 |
| AS-04 | workflow完了時に検証済みIssueだけを最終sync・closeできる | FR-5、FR-10 |
| AS-05 | operatorがGitHub／state障害後もworkflowを止めず復旧できる | FR-6、FR-7 |
| AS-06 | 利用者がstatus／prompt／CLIから現在状態と次アクションを理解できる | FR-7、FR-8 |
| AS-07 | maintainerが6ハーネスと日英文書をdriftなく配布できる | FR-8、FR-9、NFR-3、NFR-4 |
| AS-08 | operatorが背景通信なしで、境界または明示CLI時だけGitHub操作が起きると信頼できる | NFR-5 |

## Unit別Story Mapping

### `mirror-contract-policy`

| 局所順序 | Slice | 実装内容 |
|---:|---|---|
| 1 | AS-01 | C0 domain union、strict config schema、既定`prompt` |
| 2 | AS-01、AS-03、AS-04 | mode × operation × boundary decision table |
| 3 | AS-05 | pending／skip／same-event re-entry policy |
| 4 | AS-01〜AS-05 | exhaustive unit testsとinvalid boolean tests |

### `mirror-state-provenance`

| 局所順序 | Slice | 実装内容 |
|---:|---|---|
| 1 | AS-02、AS-05 | receipt／provenance／warning codecとMirror revision |
| 2 | AS-02 | atomic prepare／complete、create identity marker |
| 3 | AS-02、AS-04 | ownership verify、0・1・複数候補分類 |
| 4 | AS-05 | one-time repair challenge、CAS／partial-write tests |

### `mirror-github-gateway`

| 局所順序 | Slice | 実装内容 |
|---:|---|---|
| 1 | AS-02、AS-05 | explicit repository Gatewayとfailure normalization |
| 2 | AS-02、AS-03、AS-04 | create／search／view／edit／close response validation |
| 3 | AS-08 | daemon／pollerなし、readiness／viewの非mutation contract |
| 4 | AS-02〜AS-05、AS-08 | fake runner、argument、repository、response tests |

### `mirror-operation-lifecycle`

| 局所順序 | Slice | 実装内容 |
|---:|---|---|
| 1 | AS-02〜AS-05 | C6 Executor、receipt順序、reconciliation、safe close guard |
| 2 | AS-03、AS-04 | engine-owned boundary identityの接続 |
| 3 | AS-01、AS-03、AS-04 | `off`／`prompt`／`auto` driverとcompletion chain |
| 4 | AS-05 | non-blocking outcome、retry、manual repair CLI |
| 5 | AS-06、AS-08 | resolved modeを含むstatus context、runtime prompt／Issue body／redaction、境界限定通信、read-only status非mutation |
| 6 | AS-02〜AS-06、AS-08 | remote/local failure、resume／park／completion／non-default space tests |

### `mirror-distribution-docs`

| 局所順序 | Slice | 実装内容 |
|---:|---|---|
| 1 | AS-07 | core／manifest／package／promote対象の同期 |
| 2 | AS-06、AS-07 | `amadeus-mirror` skill、CLI help、runtime status contractの説明 |
| 3 | AS-07 | Guide／Reference日英parity |
| 4 | AS-07 | 6ハーネスlayout、dist／promote drift tests |

## Cross-cutting Story

| Slice | 跨るUnit | Contract |
|---|---|---|
| AS-02 | contract-policy、state-provenance、GitHub Gateway、operation-lifecycle | 同じevent／operation identityでIssue 1件へ収束 |
| AS-03 | contract-policy、state-provenance、GitHub Gateway、operation-lifecycle | boundary receipt→policy→verified sync |
| AS-04 | state-provenance、GitHub Gateway、operation-lifecycle | provenance／repository→landing→final sync→close |
| AS-05 | 全runtime Unit | typed failure、永続receipt、warning、workflow継続 |
| AS-07 | 全Unit | 正本contractをdistribution/docsへ投影 |
| AS-08 | contract-policy、GitHub Gateway、operation-lifecycle | background processなし、eligible boundary／manual CLI限定、read-only status非mutation |

## Coverage Verification

| 要件群 | 担当Unit |
|---|---|
| FR-1、FR-2 | `mirror-contract-policy`、`mirror-operation-lifecycle` |
| FR-3 | `mirror-state-provenance`、`mirror-github-gateway`、`mirror-operation-lifecycle` |
| FR-4、FR-5 | `mirror-github-gateway`、`mirror-operation-lifecycle` |
| FR-6、FR-7 | 全runtime Unit |
| FR-8 | `mirror-operation-lifecycle`、`mirror-distribution-docs` |
| FR-9 | `mirror-distribution-docs` |
| FR-10 | `mirror-contract-policy`、`mirror-state-provenance`、`mirror-operation-lifecycle` |
| NFR-1、NFR-2 | state-provenance、GitHub Gateway、operation-lifecycle |
| NFR-3、NFR-4 | 全5 Unit |
| NFR-5 | contract-policy、GitHub Gateway、operation-lifecycle |

FR-1〜10とNFR-1〜5は少なくとも1 Unitへ割り当て済みであり、全5 Unitは少なくとも1 acceptance sliceを所有する。孤立要件とstoryを持たないUnitは0件である。
