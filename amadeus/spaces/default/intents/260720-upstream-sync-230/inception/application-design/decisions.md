# Decisions (ADR) — upstream-sync-230

> 上流入力(consumes 全数): `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`。`stories.md` は本 scope で SKIP 済み。

質問0問の根拠は `application-design-questions.md` の E-OC1 判定に置く。以下の選択は新規仕様ではなく、承認済みFR/NFRと既存brownfield境界を満たす実現方式である。

## ADR-1: 既存 modular monolith の choke pointを拡張する

- Context: 24項目はschema、runtime、workspace、packaging、harness、reviewerへ横断するが、NFR-7は巨大fileの一般refactorとdormant adapterを禁止し、`component-inventory.md`は既存の所有点を特定済み。
- Decision: C1–C7を論理componentとして定義し、既存moduleの公開seamへ最小変更する。新規network/process境界は作らない。
- Consequences: transaction/audit/generatorを再利用でき、非active経路のbyte-identicalを守りやすい。既存large fileへの局所変更は残るため、各Boltの差分上限とtargeted testが必要。
- Alternatives Rejected: (a) plugin/runtime用の独立service — deployment/storage/IPCを増やしscope外 (b) engine全体の先行分割 — 24契約と無関係な大規模refactorでNFR-7違反 (c) adapter interfaceだけを先行追加 — consumer不在のdormant code。
- Reversibility: 高。論理componentは既存module境界に沿い、個別Boltを戻せる。

## ADR-2: Stage schema と Unit kind は単一Contract Kernelで共有する

- Context: FR-2 item 7とFR-6 item 18はschema/graph/directive/sensorで同じclosed vocabularyを要求する。plugin専用parserを持つと同一fieldが二重解釈される。
- Decision: C1を唯一の型・validation・normalization正本とし、全consumerがimportする。`when`は型付き保存するが評価しない。
- Consequences: unknown kind/不正typeを一箇所でfail-closedにできる。既存stage parserの互換fixture更新が必要。
- Alternatives Rejected: (a) plugin manifest内で独自stage parser — driftとsilent divergenceを生む (b) raw YAMLを各consumerが読む — closed vocabularyを機械保証できない (c) `when`評価も同時実装 —明示deferred面を越える。
- Reversibility: 中。共有型はconsumerへ広がるが、compile-time参照で追跡できる。

## ADR-3: Plugin は source→projection→transactional composition の三境界に分ける

- Context: FR-6はauthoring source、6 harness projection、compose/doctor/dropを要求し、NFR-2は衝突時の既存bytes不変を要求する。
- Decision: `plugins/<name>/`を正本、C5を決定的projector、C4をtemp-tree `inspect→plan→validate→atomic apply/drop` ownerとする。composition recordは実際に所有したpathだけを保持する。
- Consequences: build driftとruntime no-clobberを別々に検証でき、失敗時rollbackではなくcommit前破棄でatomicityを得る。integration fixtureはtemp workspaceを必要とする。
- Alternatives Rejected: (a) canonical treeへのin-place逐次write+rollback — crash時の部分適用を封鎖できない (b) `dist/plugins`手編集 — generator ownership違反 (c) marketplace/lockfile/dynamic fetch —scope外かつnetwork/供給網面を新設 (d) stage全置換 — no-clobber/seam merge契約違反。
- Reversibility: 中。record formatは継続利用されるがversioned migrationなしで変更可能なrepo-local contract。

## ADR-4: 6 harness package と4 harness self-installを分離維持する

- Context: NFR-4/C-3は6面projectionと既存4面self-installを区別する。`promote-self.ts`のclosed listは `claude/codex/cursor/opencode`。
- Decision: C5 packageは発見済み全6 harness、self-installは既存4面だけを対象にする。両方を独立drift checkする。
- Consequences: Kiro系を誤ってlocal install対象にせず、配布完全性は全6面で維持できる。テストは6×projectionと4×promotionの別matrixになる。
- Alternatives Rejected: (a) blanket 6面self-install —既存closed contractを未承認変更 (b) 4面packageへ縮小 —C-3違反 (c) hostごとの手書きplugin copy — generated ownershipと決定性を失う。
- Reversibility: 高。既存定数とmanifest discoveryに沿う。

## ADR-5: Runtime修復・拒否は既存transaction内の純判定seamに置く

- Context: FR-1/FR-2は自己修復、guard、iteration、previewを同時に含む。NFR-2は失敗時のstate/audit/marker不変、NFR-6はspawn blind spot回避を要求する。
- Decision: recovery/selection/guard/previewをI/Oなし関数として切り出し、既存lock付きCLI transactionが結果を一度だけ適用する。characterization対象4項目はtestで不足を確認してから実装する。
- Consequences: failure/no-op/idempotenceをin-processで検証できる。既存CLI stdoutとaudit順序をfixtureで固定する必要がある。
- Alternatives Rejected: (a) CLI subprocessだけのテスト —failure injectionとpartial-write証明が弱い (b) hook/proseだけのguard —state mutation境界を強制できない (c) upstream差分の無条件移植 —EQUIVALENT契約違反。
- Reversibility: 高。pure seamは既存handlerから局所的に呼ばれる。

## ADR-6: Workspace検出はread-only・depth-1・非選択とする

- Context: FR-3はtop-level signal不在時だけdepth-1を見て、複数候補を勝手に選ばず、submodule状態をadvisory表示する。
- Decision: C3が一つの`WorkspaceScan`を生成し、birth/detect/doctor/JSONが同じ結果を投影する。scanは初期化・修復・候補選択を行わない。
- Consequences:各入口の観測差を防ぎ、Greenfield誤上書きを避ける。利用者が複数候補を解消する必要がある。
- Alternatives Rejected: (a) 最初の候補を選ぶ —filesystem順への依存と誤選択 (b) recursive scan —範囲とcostが未承認 (c) `git submodule update`自動実行 —外部state/network mutationでscope外。
- Reversibility: 高。read-only resultのadditive面。

## ADR-7: Harness/reviewer変更は薄いadapterと生成同期で同乗させる

- Context: FR-4/FR-5は6 harnessとreview protocolの具体的欠陥を直すが、C-4はharness固有toolをcoreへ置くことを禁じる。
- Decision: host payload変換とcommand quotingは各C6 source adapter、共有contractだけC1/C2に置く。reviewer date/read-scopeはpersona/protocol正本で更新し、C5経由で全対象面へ投影する。
- Consequences: host差を局所化し、source/dist driftをcheck可能。各adapter変更は実装・配線・fixtureを同一Boltに含める必要がある。
- Alternatives Rejected: (a) host固有payloadをcoreへ流入 —boundary違反 (b) distだけ修正 —次回packageで消失 (c)共通adapterだけ先行 —dormant integration。
- Reversibility: 高。host単位で追跡可能。

## ADR-8: 完了判定は24 item traceとledgerの単一verification境界に置く

- Context: FR-8は24項目、必須gate、最終SHAが揃うまで`APPLIED`を禁止する。NFR-5/NFR-6はfull CIとpatch coverageを要求する。
- Decision: C7がitem ID→test/docs/evidenceを集約し、全条件成功後だけidempotent ledger transitionを生成する。EQUIVALENT項目も証拠を必須とする。
- Consequences: 実装差分がないitemも追跡から脱落しない。full verification costはPhase末に集中するため、各Boltでtargeted testを先行する。
- Alternatives Rejected: (a) 実装commit数で完了判定 —EQUIVALENTとdocsを表現できない (b) individual Boltでledgerを部分更新 —baselineが途中前進する (c) CI greenだけでAPPLIED —24 disposition/最終SHAが欠落しうる。
- Reversibility: 中。ledger履歴はappend-onlyだが、未完了判定ロジックはテスト可能。

## 規模と代替案の総括

手書き総量は実装1,800–3,170行（C1–C6の1,730–3,040行+reference plugin 70–130行）、tests 3,580–5,790行、docs/trace 460–810行。独立service化や全面refactorはコード量・migration面を増やす一方、承認済みNFRを改善しないため viable ではない。唯一の主要な可逆性低下はC1 shared contractとC4 composition recordであり、先にschema/record fixtureを固定してからconsumerを接続する。
