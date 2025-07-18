const { sequelize } = require('../../src/config/database');

/**
 * Helper para configurar la base de datos de prueba
 */
export const setupTestDatabase = async () => {
  try {
    // Verificar conexión
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Sincronizar modelos (sin forzar recreación)
    await sequelize.sync({ force: false });
    console.log('✅ Database models synchronized.');
    
    return sequelize;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

/**
 * Helper para cerrar la conexión de la base de datos
 */
export const closeTestDatabase = async () => {
  try {
    await sequelize.close();
    console.log('✅ Database connection closed.');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
    throw error;
  }
};

/**
 * Helper para limpiar datos de prueba
 */
export const cleanTestData = async () => {
  try {
    // Limpiar datos de prueba específicos
    await sequelize.query('DELETE FROM documento WHERE cliente_id IN (SELECT cliente_id FROM cliente WHERE correo LIKE "%test%")');
    await sequelize.query('DELETE FROM ingreso_cliente WHERE cliente_id IN (SELECT cliente_id FROM cliente WHERE correo LIKE "%test%")');
    await sequelize.query('DELETE FROM solicitud_producto WHERE solicitud_id IN (SELECT solicitud_id FROM solicitud WHERE cliente_id IN (SELECT cliente_id FROM cliente WHERE correo LIKE "%test%"))');
    await sequelize.query('DELETE FROM solicitud WHERE cliente_id IN (SELECT cliente_id FROM cliente WHERE correo LIKE "%test%")');
    await sequelize.query('DELETE FROM cliente WHERE correo LIKE "%test%"');
    await sequelize.query('DELETE FROM usuario WHERE correo LIKE "%test%"');
    
    console.log('✅ Test data cleaned successfully.');
  } catch (error) {
    console.error('❌ Error cleaning test data:', error);
    throw error;
  }
};

/**
 * Helper para obtener información de la base de datos
 */
export const testDatabase = {
  sequelize,
  setup: setupTestDatabase,
  close: closeTestDatabase,
  clean: cleanTestData,
  
  /**
   * Autenticar conexión con la base de datos
   */
  authenticate: async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Database authentication successful.');
      return true;
    } catch (error) {
      console.error('❌ Database authentication failed:', error);
      throw error;
    }
  },
  
  /**
   * Ejecutar una consulta SQL
   */
  query: async (sql: string, options?: any) => {
    try {
      const result = await sequelize.query(sql, options);
      return result;
    } catch (error) {
      console.error('❌ Error executing query:', error);
      throw error;
    }
  },
  
  /**
   * Obtener estadísticas de la base de datos
   */
  getStats: async () => {
    try {
      const [clientesCount] = await sequelize.query('SELECT COUNT(*) as count FROM cliente');
      const [usuariosCount] = await sequelize.query('SELECT COUNT(*) as count FROM usuario');
      const [solicitudesCount] = await sequelize.query('SELECT COUNT(*) as count FROM solicitud');
      const [documentosCount] = await sequelize.query('SELECT COUNT(*) as count FROM documento');
      
      return {
        clientes: clientesCount[0].count,
        usuarios: usuariosCount[0].count,
        solicitudes: solicitudesCount[0].count,
        documentos: documentosCount[0].count
      };
    } catch (error) {
      console.error('❌ Error getting database stats:', error);
      throw error;
    }
  }
};
