# Design Decisions(ADR)— Intent Mirror の GitHub Project Status 同期

上流入力(consumes 全数): requirements, architecture, component-inventory, team-practices

requirements の「design への委任事項」4件を ADR-1〜ADR-4 で裁定し、FR-9c(canonical 導出の共有)を ADR-5 で機構化する。構造前提はすべて上流 architecture(codekb、observed cd937c991)の設計分岐点4点と component-inventory の閉じた台帳に依拠する。team-practices の対応表(mirror 構造境界・一方向同期・gh 境界)を設計制約として全 ADR に適用した。

## ADR-1: Project 同期は create/sync 操作の内部ステップとする(第4 operation を新設しない)

- **Context**: `MirrorOperation` は `create|sync|close` の3値に閉じ、receipt key / permit / `APPLICABLE_OPERATIONS` / `nextCompletionOperation` / codec `OPERATIONS` の5面が連動する(architecture.md 設計分岐点)。Issue の失敗セマンティクスは「Project 更新失敗は **Mirror sync を** pending として記録する」と規定し、Project 同期を操作の属性として扱っている。
- **Decision**: Project 同期(item 追加+Status 設定)は executor の create/sync 実行内の**内部ステップ**とする。操作 union・policy 適用表・completion 前進順序は変更しない。Project 面の結果は per-Project receipt(ADR-3)として操作 receipt と別レイヤーで追跡し、操作の outcome(pending / safety-blocked)へ集約する。close は Project mutation を行わない(FR-8 のゲート判定のみ — final **sync** が Done 化を担う)。
- **Consequences**: (+) 5面連動の改変ゼロで既存の同意境界(FR-10a: create/sync の bounded な一部)と字義どおり一致 / (+) prompt モードの ask も既存の操作単位のまま / (−) executor の create/sync パスが長くなる(緩和: Project 同期ステップを純関数+専用ヘルパーに分離)。
- **Alternatives Rejected**: (a) 第4 operation `project-sync` 新設 — 5面の同時改変+`nextCompletionOperation` の前進順序再設計+同意境界の再定義(Q1 裁定 A と矛盾)で変更面が最大。 (b) 独立した新 boundary 種別 — Issue が「既存 eligible boundary に統合」と明示しており仕様違反。
- **Security/Compliance**: 同意境界不変(affirmed Mandated/Forbidden との整合が構造的に保たれる)。

## ADR-2: config は `mirror-projects` 単一キーの closed-schema 拡張

- **Context**: FR-5(3層 config.json・closed schema・層全置換)。既存 `classifyRawValue` は `auto-mirror` 以外の key を拒否し、`MirrorConfig` / `MirrorConfigIssue.key` / `readFailure` の4面が単一キー前提(code-structure.md の closed schema 所在)。
- **Decision**: 新キー **`mirror-projects`** を allowlist へ追加する。値の形状:
  ```json
  {
    "auto-mirror": "auto",
    "mirror-projects": [
      {
        "project": "amadeus-dlc/5",
        "status-names": { "ideation": "Ideation", "inception": "Inception", "construction": "Construction", "operation": "Operation", "done": "Done" }
      }
    ]
  }
  ```
  - `project`: `<owner>/<number>` 形式の文字列(org / user project は owner 名で自然に区別され、解決は GraphQL 照会が担う)。
  - `status-names`: 省略可。省略キーは既定マッピング(FR-3a)を用いる。キーは5フェーズ語彙 `ideation|inception|construction|operation|done` の closed set(unknown キーは fail-closed 拒否)。
  - `mirror-projects` の有効値を持つ**最後の層が丸ごと勝つ**(配列要素の層間マージはしない — FR-5b)。空配列 `[]` は「対象 Project なし」の明示(FR-2d の従来挙動)。
- **Consequences**: (+) auto-mirror と同一の置き場所・同一の fail-closed 流儀(Q3 裁定 A) / (+) 対象 Project と上書きが1キーに同居し、Project 別上書き(受入条件9)が構造で表現される / (−) config パーサの4面同時一般化が必要(見積り +120 行)。
- **Alternatives Rejected**: (a) `mirror-project` 単数キー — 複数 Project(受入条件6)を将来別キーで足す羽目になり closed schema の再改変を招く。 (b) status-names を別キーに分離 — どの Project の上書きかの結合が暗黙になり、層置換の意味論が2キー間で捻れる。
- **Security/Compliance**: 値はリポジトリ内 JSON(秘匿情報なし)。unknown key / unknown phase キーの fail-closed で誤設定は loud。

## ADR-3: state 永続化は mirror state v1 ブロックの `projectSync` サブオブジェクト

- **Context**: FR-7c(per-Project receipt)。state codec は `ROOT_KEYS` closed set で、追加は keys/validate/render の3面同時更新(architecture.md 設計分岐点/code-structure.md)。canonical レンダラ1定義の write⇔read 対称が規範(team-practices)。
- **Decision**: `ROOT_KEYS` に **`projectSync`**(省略可)を追加する。形状:
  ```json
  "projectSync": {
    "projects": [
      {
        "project": "amadeus-dlc/5",
        "projectId": "PVT_...",
        "itemId": "PVTI_..." | null,
        "lastAppliedStatus": "Ideation" | null,
        "state": "synced" | "pending" | "safety-blocked",
        "updatedAt": "<ISO>"
      }
    ]
  }
  ```
  - `projects` は同期対象 Project ごとの reconcile 台帳(冪等リトライの基点 — FR-7b)。`itemId` は追加成功後にキャッシュし重複追加を防ぐ(冪等性は GraphQL の `addProjectV2ItemById` が既所属で既存 item を返す性質と二重で担保 — 実装時実測で確定)。
  - 書込・読取は既存 canonical 経路(`renderMirrorStateJson` / `parseMirrorStateDocument`)のみ。reducer に projectSync 用 transition を追加し、audit-batch-before-state-atomicity の既存順序に載せる。
- **Consequences**: (+) 部分成功の収束判定(FR-8b)が state から機械導出できる / (+) repair status(FR-9)が同じ台帳を read-only で読む / (−) codec 3面+reducer+FakeGateway 系テストの更新(見積り codec +150 / reducer +100 行)。
- **Alternatives Rejected**: (a) 既存 `receipts` 配列への混載 — receipt は operation×event キーで、Project 軸の reconcile 台帳と意味論が異なり、`MAX_RECEIPTS` の運用も汚す。 (b) 別ファイル永続化 — state の atomic write / lock / audit outbox の既存保証を再発明することになる。
- **Security/Compliance**: ID 類(PVT_/PVTI_)は公開メタデータで秘匿情報なし。

## ADR-4: GraphQL は gateway 内の新 argv 族+body `errors` 解釈層(新モジュールを新設しない)

- **Context**: gh 呼び出しは gateway が唯一のプロセス境界(architecture.md)。既存 argv は REST 形で GraphQL は流用不可、GraphQL は repo 初(同設計分岐点)。component-inventory の閉じた台帳(`MIRROR_TOOL_FILES` 16 ↔ t285 の15)はモジュール追加で手動同期が要る。
- **Decision**: GraphQL 対応は **`amadeus-mirror-gateway.ts` 内の追加**として実装する(新モジュールなし): (i) `graphqlArgv(query, variables)` — `gh api graphql --include -f query=... -F ...` の argv ビルダー族(query 文字列は module 定数、変数は `-F` で渡し文字列連結をしない) (ii) 既存 envelope パーサー(`single` mode)で HTTP 層を読み、**body 解釈層で `errors` 配列を検出**して `MirrorFailureClass` へ写像(FR-7d — INSUFFICIENT_SCOPES→`permission` / NOT_FOUND→`api` 非 retryable / RATE_LIMITED→`rate-limit` 等の写像表は実 gh 応答の実測で確定) (iii) `MirrorGitHubGateway` へ Project 系メソッドを追加(listProjectItems / resolveProjectStatusField / addProjectItem / updateProjectItemStatus)。mutation 2種は既存 permit 検証(`requireValidPermit`)を通す。runner は既存 `single` profile(30s/1MiB)を使う。
- **Consequences**: (+) 「GitHub と話すのは gateway のみ」の境界不変、台帳更新は不要(`MIRROR_TOOL_FILES` 16 のまま) / (+) FakeGateway 系拡張は interface 実装クラス**4箇所**(t279 / t282 LifecycleGateway / t284 RepairGateway / t300)の全数更新+型キャストの t280 の手動確認で吸収(reviewer 実測 grep で確定 — 当初の「3箇所」は誤り) / (−) gateway が +250 行前後に成長(単一責務内の成長として許容 — G3/G5/G7 の既存内部区分に沿う)。
- **Alternatives Rejected**: (a) `amadeus-mirror-project-gateway.ts` 新設 — 台帳2面(MIRROR_TOOL_FILES/t285)+7ハーネス dist の追加同期を招き、「唯一のプロセス境界」を2分割する。 (b) GraphQL クライアントライブラリ導入 — 配布 framework への runtime dependency 追加は Forbidden(Bun-only 前提)。
- **Security/Compliance**: token は gh の credential store 委譲のまま(gh-scripts-boundary)。redactSummary 流儀を GraphQL 失敗にも適用し生応答を転記しない。

## ADR-5: 期待 Status 導出は policy 層の純関数 1 定義を sync と repair で共有

- **Context**: FR-9c(診断用の複製導出禁止 — cid:code-generation:c1-drift-canonical-renderer)。phase 取得 seam は `lifecycleSnapshot()` のみ、`Backlog` 等への写像禁止。
- **Decision**: `expectedProjectStatus(snapshot: MirrorSnapshot, boundaryKind: MirrorBoundary["kind"], statusNames: MirrorProjectStatusNames): { kind: "status", name } | { kind: "keep" }` を **policy 層(C2、純粋決定層)** に1定義で置く(3引数 — component-methods.md C2 と同一シグネチャ)。`parked`(`boundaryKind === "parked"` または `snapshot.registryStatus === "parked"`)→ `keep`、完了(registryStatus=complete かつ Status=Completed)→ `done` 名、それ以外 → 現在フェーズ名。executor(同期)と lifecycle(repair status)は**この同一関数のみ**を消費する(repair は boundary 文脈を持たないため `boundaryKind` に非 parked の定数を渡し、registryStatus 側の判定だけが効く)。
- **Consequences**: (+) write⇔read のレンダラ非対称クラス(#1547 同型)を構造排除 / (+) 単体テストが純関数直叩きで書ける。
- **Alternatives Rejected**: executor 内のローカル導出+repair 側の再実装 — 同型欠陥(偽 drift)の再導入そのもの。
- **Security/Compliance**: 影響なし(純関数)。

## 規模の正当化(数値見積り・行数)

| 変更面 | 見積り(行) | 根拠 |
|---|---|---|
| gateway(argv 族+errors 解釈+4メソッド) | +250 | 既存 argv ビルダー7本=約100行、envelope 拡張なし(body 層のみ追加) |
| config(4面一般化+mirror-projects) | +120 | 既存 classifyRawValue 系の対称拡張 |
| types(ProjectRef / ProjectSyncState / permit 拡張) | +80 | 既存 union 様式 |
| state codec(keys/validate/render 3面) | +150 | 既存サブオブジェクト(receipts)と同規模 |
| reducer(projectSync transitions) | +100 | 既存 transition 平均 30-40 行×3種 |
| policy(expectedProjectStatus+config 型) | +60 | 純関数+表 |
| executor(内部ステップ+reconcile) | +200 | executeLinked(107行)と同規模の追加パス |
| lifecycle / presentation(repair 拡張+契約) | +120 | repair status 6→11 項目+docs 契約 |
| 合計(正本) | **約 +1,080** | — |
| テスト(unit+integration+golden) | 約 +1,400 | t272/t279/t282 の既存様式比例+gateway interface 実装4箇所(t279/t282/t284/t300)の全数更新と t280 手動確認を含む(棚卸し訂正後の見積り) |

## Reuse Inventory(再利用棚卸し)

- **再利用**: runner(profile/deadline/cap)/ capability permit WeakSet / state store(lock・atomic write・audit outbox)/ envelope パーサー single mode / redactSummary / FakeGateway・memoryStore・runtime 注入のテスト様式 / od -c envelope golden 様式 / mirror docs 4文書+TOPICS 契約 / boundary 5種と policy 適用表(無変更)。
- **新設は3点のみ**: GraphQL argv 族+errors 解釈(gateway 内)、`mirror-projects` config キー、`projectSync` state サブオブジェクト。**adapter・登録スロット等の先行着地はなし**(実装+配線が本 intent 内で揃う — inception guardrail 準拠)。
