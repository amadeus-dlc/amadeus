# Unit of Work ストーリーマップ(FR/NFR 対応)

上流入力(consumes 全数): components、component-methods、services、component-dependency、decisions、requirements

user-stories stage は本 scope(self-feature)で SKIP のため、対応付けは requirements の FR/NFR/C を単位に行う(既習形: 260804-tla-authoring)。

## FR/NFR → Unit 対応表

| 要求 | 内容(要約) | U1 | U2 | U3 |
|---|---|---|---|---|
| FR-1a/1b | opt-in 境界(install/uninstall 可逆) | ● 受理面 | | ● 実証 |
| FR-1c | 適用範囲 = CG を EXECUTE する全 scope | ● overlay 適用 | | ● 実証 |
| FR-2a〜2d | produces overlay(seam 接続・trust 3層) | ● | | ● E2E |
| FR-3a〜3d | 収束述語の単一定義 | | ● | |
| FR-4a〜4c | thread 台帳の機械導出 | | ● | |
| FR-5a/5b | 収束ループ工程+トリアージ基準 | | ● CLI 面 | ● 工程断片 |
| FR-5c | Guardrail self-contained | | | ● |
| FR-6a/6b | センサー advisory 可視化(core 側 manifest) | | | ● |
| FR-7a〜7c | GitHub 不達時(park 既定+記録付き override) | | ● | |
| NFR-1 | 対実証(install 前進拒否/未 install 不変) | ● install 面 | | ● E2E |
| NFR-2 | 述語の赤実証(replied-unresolved fixture) | | ● | |
| NFR-3 | 台帳の機械導出実証 | | ● | |
| NFR-4 | import 閉包全数宣言 | | | ● |
| NFR-5 | TDD・tNNN t444+・integration 層 | ● | ● | ● |
| NFR-6 | 全ハーネス dist 再生成成立 | ● core 変更面 | | ● |
| C-1〜C-4 | 制約(no-AI-merge 不変・新規ガード禁止 等) | ● C-2 | ● C-1/C-4 | ● C-3 |
| C-5 | 新設 CI ジョブの既定値逐語継承 | | | N/A(本 intent は新設 CI ジョブを追加しない — 追加が生じた場合に発動する条件付き制約) |

凡例: ● = 当該 Unit が主担当(空欄 = 非担当)。全 FR/NFR が最低1 Unit に割当済み(孤立要求なし。C-5 のみ条件不成立の N/A と明示)、全 Unit が最低1 FR を担う(孤立 Unit なし)。

## 各 Unit が成立させる利用者価値(順序を含意しない — 実装順序は Delivery Planning が決定)

- **U1**: plugin が既存ステージの produces を overlay できる engine 能力(install→produces 反映→unitCovered 点火→drop 復元の最小 E2E)
- **U2**: PR 収束の判定・台帳・CLI(手動運用でも収束確認に使える単体価値)
- **U3**: `pr-convergence` plugin としての install 可能性と、Issue #1971 の受け入れ目安3項目の実証(依存 topology 上 U1・U2 の後段 — これは依存事実であり順序推奨ではない)
