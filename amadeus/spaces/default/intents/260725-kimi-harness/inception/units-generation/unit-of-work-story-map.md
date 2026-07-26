上流入力(consumes 全数): components, component-methods, services, component-dependency, decisions, requirements

# Unit of Work Story Map — 260725-kimi-harness

user-stories ステージはスコープで SKIP のため stories は存在しない。requirements.md の FR を実装 Unit へマッピングする(FR が事実上のストーリー)。components.md の FR↔C 表とは、FR-6(表では C5+C4)と FR-8(表では C1)の2件で意図的に分解が異なる — 本マップでは FR-6 の主担当を U5 とし U4 側(doctor 検査面)は DAG エッジで表現、FR-8 は独立 Unit U7 とした(C1 の fills は U1 がカバー)。component-methods.md のインターフェースと component-dependency.md の経路は各 Unit の受け入れ条件の具体として使用し、services.md の「実行単位は無状態・短命プロセス」判定は U2 の設計制約とする。

## FR → Unit マッピング

| FR | 内容 | Unit |
|---|---|---|
| FR-1 | ハーネス定義・dist 生成 | U1 kimi-harness-definition |
| FR-2 | hook adapter | U2 kimi-hook-adapter |
| FR-3 | 配線マージ機構 | U3 setup-hooks-merge |
| FR-4 | コア編集3箇所 | U4 core-harness-enums |
| FR-5 | 配布・CI 列挙 | U5 distribution-enumeration |
| FR-6 | dogfood | U5 distribution-enumeration |
| FR-7a | adapter 契約テスト | U2 kimi-hook-adapter |
| FR-7b | dist 構造 smoke | U1 kimi-harness-definition |
| FR-7c | setup マージ単体 | U3 setup-hooks-merge |
| FR-7d | swarm resolve 分岐 | U4 core-harness-enums |
| FR-8 | ドキュメント | U7 kimi-harness-docs |
| FR-9 | live driver + journey | U6 kimi-live-journey |
| FR-10 | セッションスキル全量 | U1 kimi-harness-definition |

## 横断的関心事

- **NFR-1(可搬性)**: 全 Unit の実装規律(既存同等の Windows 考慮)。特定 Unit には帰属させず、各 Unit の受け入れ条件に含める
- **NFR-2(堅牢性)**: U2(fail-open)と U3(atomic・バックアップ)に具体的に帰属
- **NFR-4(追従性)**: U2(未知フィールド寛容)と U4(doctor probe)に帰属

## カバレッジ検証

- 全 FR(FR-1〜FR-10)がいずれかの Unit に割当済み ✓
- 全 Unit(U1-U7)が1件以上の FR を持つ ✓
- decisions.md の ADR-1〜7 は各 Unit の設計制約として unit-of-work.md の該当節から参照済み ✓

## Unit 内の実装順序

複数 FR を持つ Unit は U1(FR-1/FR-7b/FR-10)のみ。順序: (1) manifest + authored surfaces で `package.ts kimi` を通す(FR-1) → (2) runner-gen 生成物を確認してセッションスキル6本の同梱を検証(FR-10) → (3) dist 構造 smoke(FR-7b)を module-scope リテラル表で追加 → (4) `--check` で byte-parity を確定。他 Unit は単一 FR 群のため順序付けは不要。
