import { initializeDatabase, runMigrations, closeDatabase } from '../config/database';

async function main() {
  await initializeDatabase();
  await runMigrations();
  await closeDatabase();
}

main().catch((error) => {
  console.error('Failed to run migrations:', error);
  process.exit(1);
});
