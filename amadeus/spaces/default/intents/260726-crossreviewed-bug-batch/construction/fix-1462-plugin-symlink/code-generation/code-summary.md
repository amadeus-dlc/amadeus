# Code Summary — fix-1462-plugin-symlink

上流入力(consumes 全数): requirements.md(FR-5)。degrade 構成につき設計系成果物は非生成(plan 参照)。

- Issue: #1462 → **CLOSED**(PR #1518 スカッシュ着地、ユーザー承認マージ)
- 修正: plugin 列挙を Dirent(withFileTypes)判定へ — dangling symlink は安全 skip、symlink 経由の正当 dir は維持、通常 dir は追加 syscall ゼロ。初版 existsSync 案の性能退行(0.338/0.312)を帰属・是正(conductor 引き取り)
- 検証: dangling fixture 赤→緑、性能テスト3連続 pass、dist 10面同期、CI 全 green
- 測定 ref: origin/main 着地コミットは PR #1518 参照。着地確認は merge 後の gh state 実測+着地面 grep。
