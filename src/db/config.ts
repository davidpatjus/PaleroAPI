import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { configDotenv } from 'dotenv';
import * as postgres from 'postgres';
import * as schema from './schema';

// Cargar variables de entorno según el ambiente
configDotenv({
  path:
    process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env.development',
});

// Obtener la cadena de conexión
const connectionString = process.env.DATABASE_URL;

// Verificar que la cadena de conexión esté definida
if (!connectionString) {
  throw new Error('Missing DATABASE_URL environment variable');
}

// Configuración del cliente postgres para Supabase
const sql = postgres(connectionString, {
  ssl: 'require', // Supabase requiere SSL
  // max: process.env.NODE_ENV === 'production' ? 10 : 1, // Pool de conexiones
  // idle_timeout: 20, // 20 segundos
  // max_lifetime: 60 * 30, // 30 minutos
  // connect_timeout: 10, // 10 segundos para timeout de conexión
  prepare: false, // Desactivar prepared statements para mejor compatibilidad
});

// Crear instancia de Drizzle con el esquema
export const db: PostgresJsDatabase<typeof schema> = drizzle(sql, {
  schema,
});

// Función para cerrar la conexión
export const closeConnection = async (): Promise<void> => {
  try {
    await sql.end();
    console.log('🔐 Database connection closed');
  } catch (error) {
    console.error('❌ Error closing connection:', error);
  }
};

// Función para probar la conexión
export const testConnection = async (): Promise<boolean> => {
  try {
    console.log('🔄 Testing database connection...');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const result = await (sql as any)`SELECT NOW() as current_time`;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (result && result.length > 0) {
      console.log('✅ Database connection successful!');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.log(`📅 Current time: ${result[0].current_time}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};
