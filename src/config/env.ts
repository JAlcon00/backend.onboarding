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
    GOOGLE_APPLICATION_CREDENTIALS: z.string(),
    GOOGLE_BUCKET_NAME: z.string(),
    GOOGLE_PROJECT_ID: z.string(),
    MAX_FILE_SIZE: z.coerce.number().optional(),
    JWT_SECRET: z.string().default('your-default-secret-key-change-in-production'),
});

console.log("Variables de entorno originales:", process.env);

type EnvType = z.infer<typeof EnvSchema>;

let env: EnvType;
try {
    const parsedEnv = EnvSchema.parse(process.env);
    
    // Para el modo test, usaremos la misma base de datos principal (ONBOARDINGBYOLSON)
    // para hacer tests sobre la base de datos real en lugar de una separada
    env = {
        ...parsedEnv,
        DB_NAME: parsedEnv.NODE_ENV === 'test' 
            ? parsedEnv.DB_NAME_TEST || 'ONBOARDINGBYOLSON'  // Cambio: usar ONBOARDINGBYOLSON como fallback
            : parsedEnv.DB_NAME || 'ONBOARDINGBYOLSON'
    };
} catch (error) {
    console.error("Error al validar las variables de entorno:", error);
    process.exit(1);
}

export { env };


