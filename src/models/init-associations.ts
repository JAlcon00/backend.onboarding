// src/models/init-associations.ts
// Función para inicializar todas las asociaciones una sola vez

import { Cliente } from '../modules/cliente/cliente.model';
import { IngresoCliente } from '../modules/cliente/ingresoCliente.model';
import { Documento } from '../modules/documento/documento.model';
import { DocumentoTipo } from '../modules/documento/documentoTipo.model';
import { Solicitud } from '../modules/solicitud/solicitud.model';
import { SolicitudProducto } from '../modules/solicitud/solicitudProducto.model';

let associationsInitialized = false;

export function initializeAssociations() {
  if (associationsInitialized) {
    console.log('⚠️ Asociaciones ya inicializadas, saltando...');
    return;
  }

  console.log('🔧 Inicializando asociaciones de modelos...');

  // Cliente - IngresoCliente
  Cliente.hasMany(IngresoCliente, { foreignKey: 'cliente_id', as: 'ingresos' });
  IngresoCliente.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'clienteIngreso' });

  // Cliente - Documento
  Cliente.hasMany(Documento, { foreignKey: 'cliente_id', as: 'documentos' });
  Documento.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'clienteDocumento' });

  // Cliente - Solicitud
  Cliente.hasMany(Solicitud, { foreignKey: 'cliente_id', as: 'solicitudes' });
  Solicitud.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'clienteSolicitud' });

  // DocumentoTipo - Documento
  DocumentoTipo.hasMany(Documento, { foreignKey: 'documento_tipo_id', as: 'documentos' });
  Documento.belongsTo(DocumentoTipo, { foreignKey: 'documento_tipo_id', as: 'tipo' });

  // Solicitud - SolicitudProducto
  Solicitud.hasMany(SolicitudProducto, { foreignKey: 'solicitud_id', as: 'productos' });
  SolicitudProducto.belongsTo(Solicitud, { foreignKey: 'solicitud_id', as: 'solicitud' });

  associationsInitialized = true;
  console.log('✅ Asociaciones inicializadas correctamente');
}

export function areAssociationsInitialized(): boolean {
  return associationsInitialized;
}
