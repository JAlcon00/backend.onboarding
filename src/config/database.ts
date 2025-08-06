const { Sequelize } = require("sequelize");
let env;
try {
    env = require("./env").env;
    // Solo mostrar información de conexión en modo desarrollo y con flag de debug
    if (env.NODE_ENV === 'development' && process.env.DEBUG_DB === 'true') {
        console.log("Configuración de base de datos:", {
            DB_HOST: env.DB_HOST,
            DB_NAME: env.DB_NAME,
            DB_PORT: env.DB_PORT,
            // Nunca mostrar usuario, contraseña o credenciales sensibles
        });
    }
} catch (error) {
    console.error("Error al cargar las variables de entorno o el esquema:", error);
    process.exit(1);
}

import type { Sequelize as SequelizeType } from "sequelize";
let sequelize: SequelizeType;
try {
    if (!env.DB_NAME || !env.DB_USER || !env.DB_PASS || !env.DB_HOST || !env.DB_PORT) {
        throw new Error("Faltan variables de entorno requeridas para la conexión a la base de datos.");
    }
    sequelize = new Sequelize(
        env.DB_NAME,
        env.DB_USER,
        env.DB_PASS,
        {
            host: env.DB_HOST,
            port: env.DB_PORT,
            dialect: "mysql",
            pool: {
                min: env.DB_POOL_MIN,
                max: env.DB_POOL_MAX,
                acquire: env.DB_POOL_ACQUIRE,
                idle: env.DB_POOL_IDLE,
            },
            logging: env.NODE_ENV === 'development' ? console.log : false,
            dialectOptions: {
                charset: 'utf8mb4',
                collate: 'utf8mb4_unicode_ci',
            },
        }
    );
} catch (error) {
    console.error("Error al crear la instancia de Sequelize:", error);
    process.exit(1);
}

// Validar cada variable de entorno individualmente
const requiredEnvVariables = ["DB_HOST", "DB_USER", "DB_PASS", "DB_NAME", "DB_PORT"];
requiredEnvVariables.forEach((variable) => {
    if (!env[variable]) {
        console.error(`La variable de entorno ${variable} no está definida o es inválida.`);
        process.exit(1);
    }
});

// Prueba de conexión a la base de datos
async function testDbConnection() {
    try {
        await sequelize.authenticate();
        console.log('Conexión a la base de datos establecida correctamente.');
    } catch (error: unknown) {
        console.error('No se pudo conectar a la base de datos:', error);
        if (typeof error === 'object' && error !== null && 'original' in error) {
            console.error('Detalle del error:', (error as any).original);
        }
        process.exit(1);
    }
}

// Ejecutar la prueba automáticamente si este archivo es el punto de entrada
if (require.main === module) {
    testDbConnection();
}

// Exportaciones CommonJS y ES6
module.exports = { sequelize, testDbConnection };
export { sequelize, testDbConnection };