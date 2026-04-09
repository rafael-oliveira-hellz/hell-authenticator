import { generateMigration } from '../config/database';

async function main() {
  const name = process.argv[2];

  if (!name) {
    throw new Error('Migration name is required. Usage: npm run migrate:generate -- <name>');
  }

  await generateMigration(name);
}

main().catch((error) => {
  console.error('Failed to generate migration:', error);
  process.exit(1);
});
