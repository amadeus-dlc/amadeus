# Security Requirements — U3-mirror-config

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## SR-U3-1: 秘匿情報の非包含

config の合法キーは auto-mirror(boolean)のみ(C-06/FR-4 — domain-entities の MirrorConfig と同帰属)— 認証情報・トークンを載せる面を作らない。3面とも git 共有(gitignore 対象外)である前提と整合。

## SR-U3-2: 入力検証(fail-closed)

未知キー・型不整合・構文破損は invalid 全列挙で loud 拒否(BR-U3-1/2)— 不正入力の無音通過なし(システム境界の入力検証 — construction ガードレール)。
