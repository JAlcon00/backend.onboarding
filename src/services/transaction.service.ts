import { Transaction } from 'sequelize';
const { sequelize } = require('../config/database');

export class TransactionService {
  /**
   * Ejecutar una función dentro de una transacción
   */
  static async executeInTransaction<T>(
    operation: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    const transaction = await sequelize.transaction();
    
    try {
      const result = await operation(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  /**
   * Ejecutar múltiples operaciones en una transacción
   */
  static async executeMultipleInTransaction<T>(
    operations: Array<(transaction: Transaction) => Promise<any>>
  ): Promise<T[]> {
    const transaction = await sequelize.transaction();
    
    try {
      const results = [];
      for (const operation of operations) {
        const result = await operation(transaction);
        results.push(result);
      }
      
      await transaction.commit();
      return results;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  /**
   * Crear una nueva transacción manualmente
   */
  static async createTransaction(): Promise<Transaction> {
    return await sequelize.transaction();
  }
  
  /**
   * Confirmar una transacción
   */
  static async commitTransaction(transaction: Transaction): Promise<void> {
    await transaction.commit();
  }
  
  /**
   * Revertir una transacción
   */
  static async rollbackTransaction(transaction: Transaction): Promise<void> {
    await transaction.rollback();
  }
}

// Tipos para mejor tipado
export type TransactionOperation<T> = (transaction: Transaction) => Promise<T>;
export type TransactionOptions = {
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  autocommit?: boolean;
  deferrable?: boolean;
};
