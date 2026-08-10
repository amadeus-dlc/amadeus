# Code Summary — Bolt 1 protocol-core

**Intent**: 260810-grilling-frontier-resync / **Stage**: code-generation / **Unit**: protocol-core (spec)

上流入力(consumes 全数): `code-generation-plan.md`(Step 実績)、`unit-of-work.md`(U1 完了条件)、`business-rules.md`(BR-U1-1〜12)、`bolt-plan.md`(検証列)、`requirements.md`(FR AC)、`security-design.md`(骨格完全性統制の充足面)。

## 実装実績(swarm 経路 — builder: amadeus-builder-agent、worktree `bolt-protocol-core`、base = origin/main f1270d710)

| コミット | 内容 |
|---|---|
| a0bc0641f | feat(grilling): grilling-protocol.md 全面書き直し(骨格+overlay、136→258行) |
| f5b8f24da | feat(stage-protocol): Step 3d / §8 接続段落 / §3 semi 除外 / :277 説明文 |
| f39ee6c3d | feat(amadeus-grilling): SKILL.md レベル引数+Free 既定 |
| 8eeda8342 | test(t415): 暫定 pin 差し替え+復活禁止 pin |
| 6407b3210 | fix(grilling): 追指摘是正 — :277 終了範囲の閾値限定 / conductor.md persona のラウンド契約化(c6 による U3 スコープ縮小、実 diff 再評価前提)。t415+t199 26 pass / tc 0 / lint 0 |
| 2efaf961b | fix(grilling): PR #2828 レビュー是正 — 終了条件の閾値限定 / 遮断器境界のラウンド原子性(E-GFR-CG1 裁定 2-0、BR-U1-5 へ申告付き追補同期) / フェンス言語 / Grill me の予算表現分離。是正後 t415+t199 26 pass / typecheck 0 / lint 0 / 骨格 sha 不変を再実測 |

referee: `amadeus-swarm.ts check protocol-core` converged / tampered false → `finalize --claimed protocol-core` exit 0(converged 1 / failed 0)。finalize のブランチ着地は無かったため conductor が `--no-ff` 明示マージで回収(parents 2・`ls-files -u` 0・bolt head との対象4ファイル fidelity diff 空 — cid:code-generation:c2 の回収手順)。

## 検証(builder 実測+conductor 独立再実測の二重)

| 検査 | 結果(builder) | 結果(conductor 再実測) |
|---|---|---|
| 骨格抽出 diff(FR-PROTO-1) | exit 0、1872 bytes | sha256 `fa5c1e5e…` 完全一致、1872 bytes(自己記述 awk 手順) |
| 帰属 SHA 1 hit(FR-PROTO-2) | grilling-protocol.md:1 のみ | 同左(git grep -c) |
| `hybrid termination` 0 hit(FR-CONTRACT-1) | 0件 | 0件(git grep exit 1) |
| §8 数値表不変(FR-CONTRACT-2) | diff 0行 | — |
| t415(暫定) | 8 pass / 0 fail / 182 expect | referee check-cmd 内で green |
| t199(rebuild 込み) | 18 pass / 0 fail | referee check-cmd 内で green |
| typecheck / lint | 0 / 0 | 0 / 0(worktree 内で独立実行) |
| build 後 tracked 不変 | porcelain 差分なし | — |
| 明示改訂の実効(対角) | 改訂前 t415 × 新正本 = 1 fail(pin 破れ)/ 改訂後 = green | — |

隣接契約テスト(builder 実測): stage-protocol 系 t34/t35/t36/t37/t86/t01/t146/t487/t492/t76 = 250 pass / 0 fail、t123+t199-generated-prefix = 362 pass / 0 fail、t174/t55 = 13 pass / 0 fail。

## 逸脱・申し送り

- 実装前停止に至る逸脱なし。builder 開示2点は conductor 裁定で執行クラスと確定: (1) Step 3d 内 write-back 文言「次の質問」→「次のラウンド」はラウンド一括提示(FR-PROTO-9 / BR-U1-7/8)からの一意帰結(1問1件の記録契約は不変) (2) 節番号配置(骨格 §1 / overlay §2〜)は stage-protocol.md:320 の既存参照 `§2` の意味(質問 append 規律)を保存する配置選択。
- 旧語彙 sweep のうち conductor.md:51 のみ c6(先行 Bolt の設計必然)で本 Bolt が先行是正済み(6407b3210 — 実行時配布される conductor_persona と出荷契約の即時矛盾を封鎖)。残る docs/guide・docs/reference 等の旧語彙 sweep は U3(Bolt 3)の所掌で未着手(意図どおり)。
- PR 未発行 — pr-convergence overlay の順序(cid:code-generation:c2-ssp-plugin-overlay-review-order)に従い、PR 発行 → 収束 → report 生成 → §12a → approve の順で後続処理。
