# Retired AWS infrastructure

Daily production no longer uses this CDK project. Authentication and data sync
now run on Supabase; see [`../docs/supabase-operations.md`](../docs/supabase-operations.md).

This directory is retained only as historical source for the completed AWS
migration and for reading legacy resource definitions. Do not deploy, update,
or configure this stack for Daily production. Preserve the AWS backups until
the legacy recovery window has closed and the migration has been formally
retired.
