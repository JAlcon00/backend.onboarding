import { Usuario } from '../../src/modules/usuario/usuario.model';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env';

export interface TestUser {
  usuario: Usuario;
  token: string;
  password: string;
}

export interface TestUserData {
  nombre: string;
  apellido: string;
  username: string;
  correo: string;
  password: string;
  rol: 'SUPER' | 'ADMIN' | 'AUDITOR' | 'OPERADOR';
  estatus: 'activo' | 'suspendido';
}

export class UserTestHelper {
  private static testUsers: TestUser[] = [];
  private static userCounter = 0;

  /**
   * Crea un usuario de prueba con datos seguros
   */
  static async createTestUser(
    overrides: Partial<TestUserData> = {}
  ): Promise<TestUser> {
    const timestamp = Date.now();
    const counter = ++this.userCounter;
    
    const defaultData: TestUserData = {
      nombre: `Test${counter}`,
      apellido: `User${counter}`,
      username: `test_user_${counter}_${timestamp}`,
      correo: `test.user.${counter}.${timestamp}@test.com`,
      password: 'SecureTestPassword123!',
      rol: 'OPERADOR',
      estatus: 'activo'
    };

    const userData = { ...defaultData, ...overrides };
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const usuario = await Usuario.create({
      ...userData,
      password_hash: hashedPassword
    });

    const token = jwt.sign(
      { 
        usuario_id: usuario.usuario_id, 
        username: usuario.username, 
        rol: usuario.rol 
      },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const testUser: TestUser = {
      usuario,
      token,
      password: userData.password
    };

    this.testUsers.push(testUser);
    return testUser;
  }

  /**
   * Crea múltiples usuarios de prueba con diferentes roles
   */
  static async createUsersByRole(): Promise<{
    super: TestUser;
    admin: TestUser;
    auditor: TestUser;
    operador: TestUser;
    suspendido: TestUser;
  }> {
    const [superUser, adminUser, auditorUser, operadorUser, suspendidoUser] = await Promise.all([
      this.createTestUser({ rol: 'SUPER' }),
      this.createTestUser({ rol: 'ADMIN' }),
      this.createTestUser({ rol: 'AUDITOR' }),
      this.createTestUser({ rol: 'OPERADOR' }),
      this.createTestUser({ rol: 'OPERADOR', estatus: 'suspendido' })
    ]);

    return {
      super: superUser,
      admin: adminUser,
      auditor: auditorUser,
      operador: operadorUser,
      suspendido: suspendidoUser
    };
  }

  /**
   * Crea un token JWT inválido o malicioso para pruebas
   */
  static createMaliciousToken(type: 'expired' | 'invalid_signature' | 'none_algorithm' | 'modified_payload'): string {
    const payload = {
      usuario_id: 999999,
      username: 'malicious_user',
      rol: 'SUPER'
    };

    switch (type) {
      case 'expired':
        return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1ms' });
      
      case 'invalid_signature':
        return jwt.sign(payload, 'wrong_secret', { expiresIn: '1h' });
      
      case 'none_algorithm':
        return jwt.sign(payload, '', { algorithm: 'none' });
      
      case 'modified_payload':
        const validToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1h' });
        // Modificar el payload manualmente (esto haría el token inválido)
        const parts = validToken.split('.');
        const modifiedPayload = Buffer.from(JSON.stringify({
          ...payload,
          rol: 'SUPER',
          usuario_id: 1
        })).toString('base64');
        return `${parts[0]}.${modifiedPayload}.${parts[2]}`;
      
      default:
        return 'invalid_token';
    }
  }

  /**
   * Genera datos de prueba para validación
   */
  static getValidationTestData() {
    return {
      invalidEmails: [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user.domain.com',
        'user@domain.',
        'user@.domain.com',
        'user@@domain.com',
        'user@domain..com',
        'user@domain.com.',
        'user@domain-.com',
        'user@-domain.com'
      ],
      invalidUsernames: [
        'a', // Muy corto
        'ab', // Muy corto
        'a'.repeat(101), // Muy largo
        'user@name', // Caracteres especiales
        'user name', // Espacios
        'user.name!', // Caracteres especiales
        'admin', // Reservado
        'root', // Reservado
        'system', // Reservado
        'administrator',
        'superuser',
        'test',
        'demo',
        'guest'
      ],
      weakPasswords: [
        '123456',
        'password',
        'qwerty',
        'abc123',
        '12345678',
        'password123',
        'admin',
        'user',
        '1234567890',
        'letmein',
        'welcome',
        'monkey',
        'dragon',
        'master',
        'superman',
        'iloveyou',
        'trustno1',
        'football',
        'basketball',
        'baseball'
      ],
      xssPayloads: [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>',
        '"><script>alert("XSS")</script>',
        '<iframe src="javascript:alert(\'XSS\')">',
        '<body onload=alert("XSS")>',
        '<div onclick=alert("XSS")>click me</div>',
        '<input type="text" value="" onfocus="alert(\'XSS\')" />',
        '<marquee onstart=alert("XSS")>test</marquee>'
      ],
      sqlInjectionPayloads: [
        "'; DROP TABLE usuario; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM usuario --",
        "admin'/**/OR/**/1=1#",
        "' OR 1=1 --",
        "' OR 'x'='x",
        "'; INSERT INTO usuario (username, password_hash) VALUES ('hacker', 'hash'); --",
        "' OR username='admin' --",
        "' OR usuario_id=1 --",
        "1' OR '1'='1' /*",
        "' OR 1=1#",
        "' OR 1=1/*"
      ],
      invalidNames: [
        'Juan<script>',
        'María"DROP TABLE',
        'Pedro\'OR 1=1',
        'Ana&lt;script&gt;',
        'Luis%3Cscript%3E',
        'Carmen<img src=x onerror=alert(1)>',
        'Roberto"; DROP TABLE usuario; --',
        'Sofia\' OR 1=1 --',
        'Diego<svg/onload=alert(1)>',
        'Valeria javascript:alert(1)'
      ]
    };
  }

  /**
   * Genera datos de prueba para rate limiting
   */
  static async generateRateLimitTestData(count: number = 10) {
    const requests = [];
    
    for (let i = 0; i < count; i++) {
      requests.push({
        username: `rate_limit_user_${i}`,
        password: 'wrong_password'
      });
    }
    
    return requests;
  }

  /**
   * Crea un usuario temporal para pruebas destructivas
   */
  static async createTemporaryUser(
    overrides: Partial<TestUserData> = {}
  ): Promise<TestUser> {
    const testUser = await this.createTestUser(overrides);
    
    // Agregar método para auto-eliminar después de la prueba
    const originalUser = testUser.usuario;
    testUser.usuario = Object.assign(originalUser, {
      cleanup: async () => {
        try {
          await originalUser.destroy();
        } catch (error) {
          console.warn('Error cleaning up temporary user:', error);
        }
      }
    });
    
    return testUser;
  }

  /**
   * Valida que un usuario tenga los permisos correctos
   */
  static validateUserPermissions(usuario: Usuario, expectedPermissions: string[]): boolean {
    return expectedPermissions.every(permission => usuario.tienePermiso(permission));
  }

  /**
   * Genera tokens con diferentes niveles de expiración
   */
  static generateTokensWithExpiration(usuario: Usuario) {
    return {
      valid: jwt.sign(
        { usuario_id: usuario.usuario_id, username: usuario.username, rol: usuario.rol },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      ),
      shortLived: jwt.sign(
        { usuario_id: usuario.usuario_id, username: usuario.username, rol: usuario.rol },
        env.JWT_SECRET,
        { expiresIn: '5s' }
      ),
      longLived: jwt.sign(
        { usuario_id: usuario.usuario_id, username: usuario.username, rol: usuario.rol },
        env.JWT_SECRET,
        { expiresIn: '30d' }
      ),
      expired: jwt.sign(
        { usuario_id: usuario.usuario_id, username: usuario.username, rol: usuario.rol },
        env.JWT_SECRET,
        { expiresIn: '1ms' }
      )
    };
  }

  /**
   * Limpia todos los usuarios de prueba creados
   */
  static async cleanupTestUsers(): Promise<void> {
    const cleanupPromises = this.testUsers.map(async (testUser) => {
      try {
        await testUser.usuario.destroy();
      } catch (error) {
        console.warn(`Error cleaning up test user ${testUser.usuario.username}:`, error);
      }
    });

    await Promise.all(cleanupPromises);
    this.testUsers = [];
    this.userCounter = 0;
  }

  /**
   * Obtiene estadísticas de los usuarios de prueba
   */
  static getTestUserStats() {
    const stats = {
      total: this.testUsers.length,
      byRole: {} as Record<string, number>,
      byStatus: {} as Record<string, number>
    };

    this.testUsers.forEach(testUser => {
      const rol = testUser.usuario.rol;
      const estatus = testUser.usuario.estatus;
      
      stats.byRole[rol] = (stats.byRole[rol] || 0) + 1;
      stats.byStatus[estatus] = (stats.byStatus[estatus] || 0) + 1;
    });

    return stats;
  }

  /**
   * Valida la fortaleza de una contraseña
   */
  static validatePasswordStrength(password: string): {
    isStrong: boolean;
    issues: string[];
  } {
    const issues = [];
    
    if (password.length < 8) {
      issues.push('Debe tener al menos 8 caracteres');
    }
    
    if (!/[a-z]/.test(password)) {
      issues.push('Debe contener al menos una letra minúscula');
    }
    
    if (!/[A-Z]/.test(password)) {
      issues.push('Debe contener al menos una letra mayúscula');
    }
    
    if (!/\d/.test(password)) {
      issues.push('Debe contener al menos un número');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      issues.push('Debe contener al menos un carácter especial');
    }
    
    const commonPasswords = this.getValidationTestData().weakPasswords;
    if (commonPasswords.includes(password.toLowerCase())) {
      issues.push('No debe ser una contraseña común');
    }
    
    return {
      isStrong: issues.length === 0,
      issues
    };
  }

  /**
   * Simula ataques de timing para detectar vulnerabilidades
   */
  static async simulateTimingAttack(
    validUsername: string,
    invalidUsername: string,
    iterations: number = 50
  ): Promise<{
    validUserAvgTime: number;
    invalidUserAvgTime: number;
    timingDifferenceMs: number;
  }> {
    const validUserTimes = [];
    const invalidUserTimes = [];

    for (let i = 0; i < iterations; i++) {
      // Tiempo para usuario válido
      const validStart = Date.now();
      await Usuario.findOne({ where: { username: validUsername } });
      const validEnd = Date.now();
      validUserTimes.push(validEnd - validStart);

      // Tiempo para usuario inválido
      const invalidStart = Date.now();
      await Usuario.findOne({ where: { username: invalidUsername } });
      const invalidEnd = Date.now();
      invalidUserTimes.push(invalidEnd - invalidStart);

      // Pequeña pausa entre iteraciones
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const validUserAvgTime = validUserTimes.reduce((a, b) => a + b, 0) / validUserTimes.length;
    const invalidUserAvgTime = invalidUserTimes.reduce((a, b) => a + b, 0) / invalidUserTimes.length;

    return {
      validUserAvgTime,
      invalidUserAvgTime,
      timingDifferenceMs: Math.abs(validUserAvgTime - invalidUserAvgTime)
    };
  }
}

export default UserTestHelper;
