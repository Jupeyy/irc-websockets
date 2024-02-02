ALTER TABLE Accounts RENAME TO accounts_casinsensitive_conflict;
ALTER TABLE accounts_casinsensitive_conflict RENAME TO accounts;
ALTER TABLE Webhooks RENAME TO webhooks_casinsensitive_conflict;
ALTER TABLE webhooks_casinsensitive_conflict RENAME TO webhooks;
