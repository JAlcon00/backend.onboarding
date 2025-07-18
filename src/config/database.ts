const { Sequelize } = require("sequelize");
let env;
try {
    env = require("./env").env;
    // Mostrar las variables de entorno relevantes para depuración
    console.log("Variables de entorno cargadas:", {
        DB_HOST: env.DB_HOST,
        DB_USER: env.DB_USER,
        DB_PASS: env.DB_PASS ? '***' : undefined,
        DB_NAME: env.DB_NAME,
        DB_PORT: env.DB_PORT,
    });
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

module.exports = { sequelize, testDbConnection };