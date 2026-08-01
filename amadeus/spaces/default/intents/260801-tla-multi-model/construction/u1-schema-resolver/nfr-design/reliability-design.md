# Reliability Design — u1-schema-resolver

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u1-schema-resolver(C1+C2)

上流入力(consumes 全数): reliability-requirements(fail-closed・後方互換・決定性・複製整合), performance-requirements(出力決定性), security-requirements(入力検証との共有機構), tech-stack-decisions(純粋モジュール・既存検証手続き再利用), business-logic-model(§1.2-1.5 スキーマ検証と非侵襲性 / §2.2-2.6 解決境界と宣言照合)

## 1. 適用性の結論(reliability-requirements からの転記)

reliability-requirements.md §適用性の評価のとおり、本 Unit は状態を永続化しない非永続・非常駐の CI 内検証ツールであり、可用性目標(SLA/SLO)、バックアップ/復旧、災害復旧、データ耐久性は**適用外**。設計が固定する信頼性の本体は「誤緑を出さないこと」であり、fail-closed・後方互換・決定性・複製整合の4系統を、functional-design の既指定機構へ写像する。新機構は発明しない。

## 2. NFR → 機構マッピング(検証方法付き)

| 要件(正本) | 設計機構(functional-design の既指定) | 検証方法(どのテスト/AC が証明するか) |
|---|---|---|
| fail-closed(NFR-2 / BR-R3/R4/R7) | 型付きエラー3種(`MODULE_DEP_UNRESOLVED` / `MODULE_DEP_CYCLE` / `MODULE_DEP_OUT_OF_BOUNDS`)で明示失敗。silent fallback / 打ち切り黙認 / silent skip 禁止 | t402 境界 red 3種がそれぞれ固有コードで落ちること — security-design.md §2 表(fail-closed 行)と同一機構・同一判定、reliability-requirements Acceptance (1) |
| 不正ソースの後段倒し(BR-R6) | C2 §2.1: 閉じられないブロックコメントは末尾までコメントとみなし偽の依存を返さない(寛容な解析で誤緑を出さない graceful degradation の本 Unit 形) | t402 偽陽性ガード — security-design.md §2 表(後段倒し行)と同一判定 |
| 宣言照合の双方向性(BR-C1) | C2 §2.6: missing / extra 双方向比較。片方向の部分集合判定で緑にすることを禁止 | t402 宣言照合ケース — security-design.md §2 表(双方向性行)と同一判定 |
| 冪等性・出力決定性(BR-R5) | C2 §2.3-4: ソート済み・重複排除・起点除外の正規化配列。同一入力には常に同一出力で、走査順・集合実装・環境に依存しない(冪等 = 何度実行しても結果が変わらない純粋関数設計) | t402 同一入力・同一出力ケース — performance-design.md §2 表(出力決定性行)と同一判定 |
| 後方互換(NFR-1 / BR-S1/S8) | C1 §1.5: 省略モデルのパース結果・identity 値は byte 不変。新規エラーコードなし、失敗は全て既存 `invalid(...)` 経路(`MODEL_MAP_INVALID`)に乗せ `ModelLoadErrorCode` 列挙不変 | 既存スキーマ表テスト据置き(期待値不変)— reliability-requirements Acceptance (2) |
| 複製整合(BR-S9、atomic-publish の本 Unit 形) | C1 §1.6: byte-identical 2 複製を同一 byte で同時更新。片側のみの更新は dual-copy `describe.each` 構造上テストが落ち、部分的な公開状態が構造的に存在しない | `cmp` exit 0 + dual-copy 表の両側 green — security-design.md §3 に手順を記載済み、reliability-requirements Acceptance (3) |
| テストカバレッジ(BR-P1〜P5) | patch coverage 100% ゲート(team-practices Testing Posture): 変更行 0-hit 不許容。負例・境界 red を修正と同 PR で運ぶ | patch gate で変更行 0-hit なし + `bun run typecheck` / lint / 既存テスト green — reliability-requirements Acceptance (4) |

## 3. 設計上の注記

- 本 Unit における「atomic-publish」は上表の複製整合に集約される: 2 複製は同一コミット・同一 byte でのみ公開され、片側先行の中間状態は dual-copy テストが赤化させるため CI を通過しない。別途の公開手続き機構は存在しない。
- 「冪等性」は上表の出力決定性に集約される: 副作用を持たない純粋関数(BR-R8)であるため、再実行・重複実行の概念がそもそも成立しない。
- 可用性・復旧系カテゴリが適用外である根拠の正文は reliability-requirements.md §適用性の評価を前方参照。

## 4. 禁止事項(code-generation への制約)

- エラーを握りつぶす `try/catch` + デフォルト値返却の禁止(silent fallback は NFR-2 違反 — security-design.md §5 と同一の禁止)。
- 宣言照合の片方向化・緩和の禁止(BR-C1 違反)。
- 省略モデル経路の戻り値・エラー経路の変更禁止(NFR-1 / BR-S8 違反)。
