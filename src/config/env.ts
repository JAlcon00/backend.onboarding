import dotenv from 'dotenv';
import { z } from 'zod';

// Cargar archivo de entorno según el entorno
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: envFile });

const EnvSchema = z.object({
    NODE_ENV: z.string().default('development'),
    PORT: z.coerce.number().default(3000),
    DB_HOST: z.string(),
    DB_USER: z.string(),
    DB_PASS: z.string(),
    DB_NAME: z.string().optional(), // Para producción/desarrollo
    DB_NAME_TEST: z.string().optional(), // Para testing
    DB_PORT: z.coerce.number().default(3306),
    
    // Configuración de Pool de Base de Datos
    DB_POOL_MIN: z.coerce.number().default(2),
    DB_POOL_MAX: z.coerce.number().default(10),
    DB_POOL_ACQUIRE: z.coerce.number().default(30000), // 30 segundos
    DB_POOL_IDLE: z.coerce.number().default(10000),    // 10 segundos
    
    GOOGLE_APPLICATION_CREDENTIALS: z.string(),
    GOOGLE_BUCKET_NAME: z.string(),
    GOOGLE_PROJECT_ID: z.string(),
    MAX_FILE_SIZE: z.coerce.number().optional(),
    JWT_SECRET: z.string().default('your-default-secret-key-change-in-production'),
});

// Solo mostrar variables de entorno en modo desarrollo explícito
if (process.env.NODE_ENV === 'development' && process.env.DEBUG_ENV === 'true') {
    console.log("Variables de entorno cargadas para debug:", {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        DB_HOST: process.env.DB_HOST,
        // No mostrar credenciales sensibles
    });
}

type EnvType = z.infer<typeof EnvSchema>;

let env: EnvType;
try {
    const parsedEnv = EnvSchema.parse(process.env);
    
    // Protección crítica: en modo test, OBLIGAR el uso de DB_NAME_TEST
    if (parsedEnv.NODE_ENV === 'test') {
        if (!parsedEnv.DB_NAME_TEST) {
            throw new Error('DB_NAME_TEST es obligatorio en modo test. Nunca uses la DB de producción para tests.');
        }
        env = {
            ...parsedEnv,
            DB_NAME: parsedEnv.DB_NAME_TEST
        };
    } else {
        env = {
            ...parsedEnv,
            DB_NAME: parsedEnv.DB_NAME || 'ONBOARDINGBYOLSON'
        };
    }
} catch (error) {
    console.error("Error al validar las variables de entorno:", error);
    process.exit(1);
}

export { env };


