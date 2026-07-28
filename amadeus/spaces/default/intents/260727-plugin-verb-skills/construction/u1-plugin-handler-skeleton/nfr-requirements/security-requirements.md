# Security Requirements — U1 u1-plugin-handler-skeleton

上流入力(consumes 全数): business-logic-model.md(委譲フロー)、business-rules.md(BR-U1-1 透明性)、requirements.md(FR-2c)、technology-stack.md(実行環境)。追加参照: 同 Unit FD の domain-entities.md(SR-U1-1 の不変条件の出典)

## SR-U1-1: コマンド組立ての固定

spawn は argument array のみ(business-logic-model.md)。シェル文字列連結・外部入力からのパス合成をしない。委譲先パスは TOOLS_DIR 由来の固定値(domain-entities の不変条件)。

## SR-U1-2: 権限・秘匿情報

新しい認証情報・環境変数・ネットワーク面なし(technology-stack.md のローカル CLI 境界のまま)。rest の透過(business-rules.md BR-U1-1)は plugin CLI の既存入力検証(requirements.md FR-2c の usage-error 透過)に服する。
