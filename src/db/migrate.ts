import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from './config';

async function main() {
  try {
    await migrate(db, { migrationsFolder: 'drizzle' });
    console.log('✅ Migración completada con éxito');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
}

main();
