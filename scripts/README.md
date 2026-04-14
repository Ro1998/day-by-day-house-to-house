# Neon to Supabase Migration

This directory contains scripts to migrate data from Neon database to Supabase database.

## Prerequisites

1. **Update Supabase Password**: Before running any scripts, you must replace `[YOUR-PASSWORD]` in both migration scripts with your actual Supabase database password.

2. **Ensure Prisma Schema**: Make sure your Supabase database has the same schema as your Neon database. The migration scripts assume identical table structures.

## Scripts

### 1. Test Connections (`test-connections.ts`)
Tests database connections and shows current table counts for both databases.

```bash
npm run migrate:test-connections
```

### 2. Migration Script (`migrate-neon-to-supabase.ts`)
Performs the actual data migration from Neon to Supabase.

```bash
npm run migrate:neon-to-supabase
```

## Migration Process

### Step 1: Update Connection String
Edit both `test-connections.ts` and `migrate-neon-to-supabase.ts` files and replace `[YOUR-PASSWORD]` with your actual Supabase password:

```typescript
const SUPABASE_DATABASE_URL = 'postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.fuhhnfdbepnxwjcgzdpg.supabase.co:5432/postgres';
```

### Step 2: Test Connections
Run the connection test to verify both databases are accessible:

```bash
npm run migrate:test-connections
```

This will:
- Test connections to both Neon and Supabase
- Show table counts for both databases
- Verify that the databases are ready for migration

### Step 3: Execute Migration
Once connections are verified, run the migration:

```bash
npm run migrate:neon-to-supabase
```

This will:
- Clear existing data from Supabase tables
- Migrate data in the correct order (respecting foreign key constraints)
- Provide a detailed summary of the migration
- Show success/failure status for each table

## Migration Order

The script migrates data in this order to respect foreign key constraints:

1. `User` (independent)
2. `RegistrationVerification` (independent)
3. `Expense` (depends on User)
4. `MonthlyPayment` (depends on User)
5. `Menu` (depends on User)
6. `MenuItem` (depends on Menu)
7. `Activity` (depends on User)
8. `InventoryItem` (depends on User)
9. `Notification` (depends on User)
10. `MenuSuggestion` (depends on User)
11. `Availability` (depends on User)
12. `SupplyReport` (depends on User)

## Safety Features

- **Connection Testing**: Verifies both databases are accessible before migration
- **Data Integrity**: Compares record counts before and after migration
- **Error Handling**: Provides detailed error messages if migration fails
- **Rollback Safety**: Clears Supabase data before migration to prevent conflicts
- **Duplicate Handling**: Uses `skipDuplicates: true` to handle potential conflicts

## Troubleshooting

### Connection Issues
- Verify your Supabase password is correct
- Check that both databases are accessible
- Ensure network connectivity to both database hosts

### Migration Errors
- Check that table schemas match between databases
- Verify foreign key constraints are satisfied
- Review error messages in the migration summary

### Data Integrity Issues
- Compare table counts before and after migration
- Run the connection test script to verify data counts
- Check for any error messages during migration

## Important Notes

- **Backup**: Consider backing up your Supabase database before migration
- **Downtime**: The migration will clear existing Supabase data
- **Dependencies**: The migration respects foreign key relationships
- **Performance**: Large datasets may take time to migrate

## Post-Migration Verification

After migration completes successfully:

1. Run the connection test again to verify final table counts
2. Test your application with the new Supabase database
3. Update your application's database URL to point to Supabase
4. Consider updating your `DATABASE_URL` environment variable
