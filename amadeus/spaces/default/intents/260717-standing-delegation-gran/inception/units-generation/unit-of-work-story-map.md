# Unit of Work Story Map — standing-delegation-grant

上流入力(consumes 全数): `../application-design/components.md`(C-1〜C-6)、`../application-design/component-methods.md`、`../application-design/services.md`(三経路の権限フロー)、`../application-design/component-dependency.md`(直列 C-5→C-1→C-2→C-4→C-6)、`../application-design/decisions.md`(ADR-1〜7)、`../requirements-analysis/requirements.md`(FR-1〜8)

## トレース(user-stories 非実行スコープ — requirements の FR/AC を正とする)

| Unit | FR/AC | 価値 |
|------|-------|------|
| standing-grant | FR-1/2(発行・撤回 verb)| ユーザーの standing authorization を1回の実 HUMAN_TURN で機構化 |
| standing-grant | FR-3(approve 側第2経路・全条件 AND)| per-gate HUMAN_TURN 待ちの停滞解消(#1125 の3波実測) |
| standing-grant | FR-4(既定除外+opt-in)| P4 境界の保存(E-SDG-RA2=C・E-SDG-AD2=X) |
| standing-grant | FR-5(落ちる実証6種+白側 sweep)| fail-closed の実証と #671 退行ゼロ |
| standing-grant | FR-6/7(doctor・taxonomy)| 可視性と偽造耐性 |

## E-OC1 判定(questions 非生成の整理)

本ステージの成果物は上流裁定(SD SQ2・E-SDG-RA/RA2/AD2)の機械導出で構成され、新規の明確化質問なし — questions ファイルは生成しない(宣言 produces にも不在)。判定申告はゲート報告に同梱する。
