# Scalability Requirements — U4-engine-boundary

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## SC-U4-1: 境界数の固定

発火境界は PHASE_CHECK_REQUIRED_PHASES の canonical 参照(BR-U4-1)— 境界集合の変更は同定数の1箇所変更で追従(重複定義なし)。

## SC-U4-2: 将来キー・将来 verb への閉性

U4 の分岐は autoMirror(boolean)と Mirror Issue フィールド有無の2入力のみ(MirrorBoundaryDecision 2値)— config キー追加・verb 追加が U4 の分岐爆発を起こさない構造(新分岐は新要件が来た時のみ)。
