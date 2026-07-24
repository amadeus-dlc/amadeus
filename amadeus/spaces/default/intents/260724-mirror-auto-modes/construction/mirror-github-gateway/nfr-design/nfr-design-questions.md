# NFR Design Questions — mirror-github-gateway

## 判定

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`は、deadline、effect certainty、process group termination、response容量、permit、redactionを実装可能な契約まで固定している。追加の製品判断は不要である。

## 確定済み回答

### Q1. timeout後にretryするか

[Answer]: Gateway内ではretryしない。read-onlyは`no-effect-confirmed`、mutation process開始後は`outcome-unknown`を返し、C6がreceiptとremote viewから再実行可否を判断する。

### Q2. large paginationをstreaming APIへ置き換えるか

[Answer]: 既存`gh api --paginate --slurp`を維持し、stdoutを64 MiBでhard stopする。全page取得できない場合はpartial successを返さない。SDK／HTTP clientは追加しない。

### Q3. child／descendantをどう終了するか

[Answer]: POSIXは`detached:true`の専用process groupへSIGTERM後1秒でSIGKILL、Windowsは`taskkill /T /F`をargument arrayで実行し、終了確認後にtyped timeoutを返す。

### Q4. mutation authorityをどう偽造防止するか

[Answer]: internal capability moduleのmodule-private WeakSetへfactory生成objectだけを登録し、Gateway validatorがmembershipとbindingをruntime検証する。public export、structural fallback、type assertionだけの認証を認めない。

## 曖昧性分析

- `gh` process開始後にrequest未送信を推測せず、mutationは保守的に`outcome-unknown`とする。
- timeout、response上限、body上限、benchmark母数はすべて上流数値へ固定した。
- state／warning／audit更新はGatewayから分離し、typed outcome handoffだけを本Unitが所有する。
