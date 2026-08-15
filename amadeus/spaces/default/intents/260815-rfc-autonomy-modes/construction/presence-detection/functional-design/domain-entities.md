# Domain Entities — unit presence-detection(U2 / C3 / FR-2)

## SessionInteractivity(新規、U2 所有)

component-methods.md C3 のシグネチャをそのまま採用(refine 不要 — 型自体が最小で曖昧さがない):

```ts
type SessionInteractivity = {
  readonly interactive: boolean;
  readonly source: "human-turn-pipeline";
  readonly measuredAt: string; // ISO 8601、呼び出し時点の壁時計
};

function resolveSessionInteractivity(projectDir: string): SessionInteractivity;
```

### 不変条件

- `source` は常にリテラル `"human-turn-pipeline"` — 他の値を取らない(将来 harness 依存の headless 信号を合成する場合も、それは U4/Stop hook 側の別フィールドであり、この型に `source` の他ケースを追加しない。C3 は一次信号を 1 種に固定する設計)
- `interactive === true` ⟹ 呼び出し時点でこのクローンの監査シャードに `HUMAN_TURN` が実在した(過大評価不能。business-rules.md R-4)
- `measuredAt` は呼び出しごとに再計算される(business-rules.md R-6)。この型自体に「前回値との比較」機能は持たせない — 遷移の検知は消費側(U3/U4)の責務

### 意図的に持たない属性

- **鮮度・時刻範囲**: `HUMAN_TURN` の個々のタイムスタンプは型に含まない。件数(1 件以上か)のみが意味を持ち、「いつの」ターンかは判定に無関係(鮮度ウィンドウの再導入を防ぐための設計上の欠落)
- **どの HUMAN_TURN か(provenance)**: `amadeus-presence-reservation.ts` の `PresenceReservation`/`TargetedApprovalEvidence` のような個別ターンの identity・reservation 紐付けは持たない。U2 は「あるか/ないか」の集約値のみを返す — 個別ターンの provenance が必要な経路(reservation の的中判定等)は既存の `mintArmedPresenceReservation` 系が別途担う
- **セッション横断の履歴**: 複数呼び出しの結果を蓄積するログ・タイムラインはこの型にもこの unit にも存在しない(呼び出しは常にステートレス)

## 既存型の参照(再利用のみ、変更なし)

- `HostSessionCapability`(`amadeus-presence-reservation.ts:580-582`)/ `MintHumanPresenceInput`(:596-601)/ `mintHumanPresence`(:607): U2 は呼ばない。名前を挙げるのは「なぜ呼ばないか」(Q1)の文脈のためのみで、U2 の所有物ではない
- `PresenceEvent`(`amadeus-lib.ts:3738-3749` 相当)・`scanPresenceLedger`: C13(presence-closure, U6)の所有物。U2 の対話性判定はゲート境界の presence 検査とは別軸であり、この型を参照・再利用しない(Q2 の判定どおり)

## 本 unit が扱わないもの(スコープ外の明示)

- **waiting 状態への admission 判定**(C4/U3): `resolveSessionInteractivity` の戻り値を「使う」側だが、admission のレート制約・基準指紋(`basisFingerprint`)・resume 契約は一切扱わない
- **Stop hook の carveout 合成ロジック**(ADR-5/U4): `transcriptIsConversational` との組み合わせ方(どちらが優先するか、両方 false のときの扱い等)は U4 の設計であり、U2 はそのための追加フィールドやフラグを持たない
- **headless 明示信号**(harness 依存): RFC Drawbacks が明記する「harness 差が移植性の負担になる」残存ギャップは本 unit のスコープ外 — 将来 U4 相当の拡張で別信号として合成される想定であり、U2 の型・関数はこれを先取りして拡張可能にする設計上の配慮(例: 判別可能な union への将来拡張)を要求されていない(YAGNI — 未定義の将来仕様に対する事前対応はしない)
