// src/models/associations.ts
// COMENTADO: Las asociaciones ahora se definen en cada modelo individual
// para evitar conflictos de alias duplicados

/*
import { Cliente } from '../modules/cliente/cliente.model';
import { Documento } from '../modules/documento/documento.model';
import { DocumentoTipo } from '../modules/documento/documentoTipo.model';
import { Solicitud } from '../modules/solicitud/solicitud.model';
import { SolicitudProducto } from '../modules/solicitud/solicitudProducto.model';

// Establecer asociaciones entre modelos
export function setupAssociations() {
  // Relaciones para Documento
  Documento.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'clienteDocumento' });
  Documento.belongsTo(DocumentoTipo, { foreignKey: 'documento_tipo_id', as: 'tipo' });
  
  // Relaciones para Solicitud (usar un alias diferente)
  Solicitud.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'clienteSolicitud' });
  Solicitud.hasMany(SolicitudProducto, { foreignKey: 'solicitud_id', as: 'productos' });
  
  // Relaciones para SolicitudProducto
  SolicitudProducto.belongsTo(Solicitud, { foreignKey: 'solicitud_id', as: 'solicitud' });
  
  // Relaciones inversas
  Cliente.hasMany(Documento, { foreignKey: 'cliente_id', as: 'documentos' });
  Cliente.hasMany(Solicitud, { foreignKey: 'cliente_id', as: 'solicitudes' });
  DocumentoTipo.hasMany(Documento, { foreignKey: 'documento_tipo_id', as: 'documentos' });
}
*/

// Exportar función vacía para mantener compatibilidad
export function setupAssociations() {
  // Las asociaciones se definen en cada modelo individual
}
