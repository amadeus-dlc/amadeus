# Team Messaging Backend

> Languages: **English** | [日本語](team-messaging.ja.md)

## Removed

Amadeus no longer ships `team-msg.sh`. That CLI is gone from the distribution
together with the Team Mode launcher.

Do not invoke the removed `team-msg.sh` CLI. There is no replacement
transport in this distribution. The election CLI remains; it talks to agmsg
directly and does not go through that script.

A historical herdr send header of the form
`[team-msg from:<role> via:herdr machine]` may still appear in old logs.
Classifiers that treat that prefix as machine-injected stay in place so those
lines are not mistaken for human turns.

## Related

See [Team Mode](20-team-mode.md) for the remaining Team Mode contract
(`AMADEUS_OPERATING_MODE=team`) and the election loop.
