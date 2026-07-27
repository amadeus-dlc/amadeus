# Reliability Design — solo-election-surface (U2)

上流入力(consumes 全数): performance-requirements.md(U2-PERF)、security-requirements.md(U2-SEC)、scalability-requirements.md(U2-SCALE)、reliability-requirements.md(U2-REL)、tech-stack-decisions.md(prose+integration 層の決定)、business-logic-model.md(ソロ手順・降格・ノルム改定の設計正本)。

## 設計

- U2-REL-01(未着回復): SKILL 転送節に「pending 残存 → 同一 voter 名で再起動1回 → なお未着なら人間へ(選挙はそのまま保存)」を明記。上限「1回」は数詞で書き、テストが「1回」の実在を grep。
- U2-REL-02(resume 降格): 人間委譲節に「resume 不能時は新規起動で同一 voter 名を引き継ぎ、その旨を選挙の record に残す」を明記(文言 grep)。
- U2-REL-03(spawn 不能告知): 起動節に降格1行(「サブエージェント起動が使えないため、この判断はユーザー裁定へ切り替えます」)の定型文を固定し、テストが定型文の実在を grep。不開設採用の申告は FD 済み。
- U2-REL-04(ノルム加算性): code-generation で team.md 改定 diff と team.md「共通の品質契約」節(チームモード限定宣言)の非矛盾を照合し、照合結果を code-summary に記録(BR-U2-7)。

## 障害時の挙動境界

全異常系は人間エスカレーションへ収束(自動回復の新機構なし — nfr-requirements の境界を設計でも維持)。
