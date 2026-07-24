# Security Design — U2 plugin-skeleton

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Safe read

- hostRoot realpath包含、祖先symlink拒否後、`O_NOFOLLOW`相当でopenし、fdのfstatと列挙時dev/inodeを比較して同一fdからreadする。非対応platformはfail-closedにする。
- regular Markdown fileと64MiB総量だけを許可し、slug衝突・schema不正・未知sensorを固定codeで拒否する。

## Trust grant

- local human reviewと明示composeをtrust grantとし、compose journalへplugin name、content digest、grant timestampを記録する。署名/provenanceは要件としない。
- dropでgrantを失効し、未compose contentやdigest driftを実行しない。pluginへ追加権限を付与しない。
