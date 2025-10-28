# Módulo de Storage - PaleroSoft API

Este módulo proporciona funcionalidades completas de gestión de archivos utilizando Supabase Storage con una arquitectura limpia, totalmente integrada con la base de datos y siguiendo principios SOLID.

## 🌟 Características

- **✅ Integración Completa con BD**: Metadatos guardados en `fileAttachmentsTable`
- **✅ Validación de Entidades**: Verifica que proyectos, tareas y usuarios existan
- **✅ Gestión de Buckets**: Organización automática por tipos de archivo
- **✅ Validación Robusta**: Control estricto de tipos, tamaños y formatos
- **✅ URLs Públicas y Firmadas**: Acceso seguro y controlado a archivos
- **✅ Logging Completo**: Trazabilidad total de operaciones
- **✅ Type-Safe**: Sin uso de `any`, TypeScript completo
- **✅ Principios SOLID**: Código mantenible y extensible

## 📁 Estructura de Buckets

### Bucket `images` (Público)
```
images/
├── profiles/{entityId}/     # Imágenes de perfil de usuarios (PROFILE_IMAGE)
├── projects/{entityId}/     # Imágenes relacionadas con proyectos
├── tasks/{entityId}/        # Imágenes de tareas
└── comments/{entityId}/     # Imágenes en comentarios
```

### Bucket `files` (Privado)
```
files/
├── projects/{entityId}/     # Archivos de proyectos
├── tasks/{entityId}/        # Archivos de tareas
├── comments/{entityId}/     # Archivos en comentarios
└── documents/{entityId}/    # Documentos de cliente (CLIENT_DOCUMENT)
```

## 🚀 Instalación y Configuración

### 1. Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```bash
# Configuración de Supabase para Storage
SUPABASE_URL="https://tu-proyecto.supabase.co"
SUPABASE_SERVICE_KEY="tu-service-key-aqui"
```

### 2. Inicializar Buckets

Una vez configuradas las variables de entorno, inicializa los buckets:

```bash
POST http://localhost:3000/storage/initialize
```

## 📖 Uso de la API

### Subir Archivos

```bash
POST /storage/upload
Content-Type: multipart/form-data

# Campos del formulario:
- file: [archivo binario]
- bucket: "images" | "files"
- folder: "profiles" | "projects" | "tasks" | "comments" | "documents"
- entityType: "PROJECT" | "TASK" | "CLIENT_DOCUMENT"
- entityId: [UUID del proyecto/tarea/cliente]
- uploadedById: [UUID del usuario que sube]
- customFileName: [opcional] nombre personalizado
```

**Ejemplo con cURL:**
```bash
curl -X POST http://localhost:3000/storage/upload \
  -F "file=@/path/to/image.jpg" \
  -F "bucket=images" \
  -F "folder=projects" \
  -F "entityType=PROJECT" \
  -F "entityId=123e4567-e89b-12d3-a456-426614174000" \
  -F "uploadedById=123e4567-e89b-12d3-a456-426614174001"
```

### Obtener URL de Descarga

```bash
GET /storage/download?bucket=images&filePath=projects/uuid/file.jpg&expiresIn=3600
```

**Respuesta:**
```json
{
  "signedUrl": "https://...",
  "expiresIn": 3600
}
```

### Obtener URL Pública

```bash
GET /storage/public-url?bucket=images&filePath=projects/uuid/avatar.jpg
```

### Listar Archivos

```bash
# Por entidad específica
GET /storage/list?entityType=PROJECT&entityId=uuid-del-proyecto

# Por usuario
GET /storage/list?uploadedById=uuid-del-usuario&limit=20&offset=0

# Todos con paginación
GET /storage/list?limit=50&offset=0
```

### Eliminar Archivos

```bash
DELETE /storage/:fileId
Content-Type: application/json

{
  "fileId": "uuid-del-archivo",
  "deletedBy": "uuid-del-usuario"
}
```

## 🔧 Configuraciones de Archivos

### Imágenes
- **Tamaño máximo**: 5MB
- **Formatos permitidos**: JPEG, PNG, WebP, GIF
- **Extensiones**: .jpg, .jpeg, .png, .webp, .gif

### Documentos
- **Tamaño máximo**: 10MB
- **Formatos permitidos**: PDF, Word, Excel, Texto
- **Extensiones**: .pdf, .doc, .docx, .xls, .xlsx, .txt

### Videos
- **Tamaño máximo**: 50MB
- **Formatos permitidos**: MP4, MPEG, QuickTime
- **Extensiones**: .mp4, .mpeg, .mov

### Audio
- **Tamaño máximo**: 10MB
- **Formatos permitidos**: MP3, WAV, OGG
- **Extensiones**: .mp3, .wav, .ogg

### Otros
- **Tamaño máximo**: 20MB
- **Formatos permitidos**: ZIP, RAR
- **Extensiones**: .zip, .rar

## 🏗️ Arquitectura

```
src/modules/storage/
├── config/
│   └── storage.config.ts      # Configuraciones y constantes
├── dto/
│   ├── storage.dto.ts         # DTOs con validaciones completas
│   └── index.ts
├── interfaces/
│   ├── storage.interfaces.ts  # Interfaces TypeScript type-safe
│   └── index.ts
├── storage.controller.ts      # Controlador REST API
├── storage.service.ts         # Lógica de negocio
├── storage.module.ts          # Módulo NestJS
├── REFACTORING_SUMMARY.md     # Documentación de refactorización
└── index.ts                   # Exportaciones públicas
```

## 🔄 Flujo de Operaciones

### Flujo de Subida de Archivo

```
1. Cliente envía archivo + metadatos
   ↓
2. Controller valida DTOs (class-validator)
   ↓
3. Service valida:
   - Archivo (tipo, tamaño, extensión)
   - Entidad existe (PROJECT/TASK/USER)
   - Usuario existe
   ↓
4. Sube a Supabase Storage
   ↓
5. Guarda metadatos en fileAttachmentsTable
   ↓
6. Retorna resultado con URLs
```

## 📊 Monitoreo y Estadísticas

### Obtener Estadísticas
```bash
GET /storage/stats
```

**Respuesta:**
```json
{
  "totalFiles": 150,
  "totalSize": 52428800,
  "buckets": [
    {
      "name": "images",
      "fileCount": 85,
      "size": 31457280
    },
    {
      "name": "files",
      "fileCount": 65,
      "size": 20971520
    }
  ]
}
```

### Obtener Buckets
```bash
GET /storage/buckets
```

## 🔒 Seguridad

### Validaciones Implementadas

1. **Validación de Entidades**
   - ✅ Verifica que PROJECT existe en `projectsTable`
   - ✅ Verifica que TASK existe en `tasksTable`
   - ✅ Verifica que CLIENT_DOCUMENT pertenece a un usuario válido

2. **Validación de Usuarios**
   - ✅ Verifica que `uploadedById` existe en `usersTable`
   - ✅ Trazabilidad completa de quién sube archivos

3. **Validación de Archivos**
   - ✅ Límites de tamaño por categoría
   - ✅ Lista blanca de tipos MIME
   - ✅ Validación de extensiones
   - ✅ Prevención de archivos maliciosos

4. **Control de Acceso**
   - ✅ Bucket `images`: Público (URLs permanentes)
   - ✅ Bucket `files`: Privado (URLs firmadas con expiración)

## 🧪 Testing

### Archivo de Tests HTTP

Usa el archivo `test/storage.http` para probar todas las funcionalidades:

```bash
### Inicializar buckets
POST http://localhost:3000/storage/initialize

### Subir imagen
POST http://localhost:3000/storage/upload
Content-Type: multipart/form-data

### Listar archivos
GET http://localhost:3000/storage/list?entityType=PROJECT&entityId=...
```

## 🔧 Integración con Otros Módulos

### Ejemplo en ProjectsService

```typescript
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly storageService: StorageService) {}

  async uploadProjectImage(projectId: string, file: Express.Multer.File, userId: string) {
    const result = await this.storageService.uploadFile(file, {
      bucket: 'images',
      folder: 'projects',
      entityType: 'PROJECT',
      entityId: projectId,
      uploadedById: userId,
    });

    if (result.success) {
      return result.data?.publicUrl;
    }
    
    throw new BadRequestException('Failed to upload project image');
  }

  async listProjectFiles(projectId: string) {
    return await this.storageService.listFiles({
      entityType: 'PROJECT',
      entityId: projectId,
    });
  }
}
```

### Ejemplo en TasksService

```typescript
async uploadTaskAttachment(taskId: string, file: Express.Multer.File, userId: string) {
  const result = await this.storageService.uploadFile(file, {
    bucket: 'files',
    folder: 'tasks',
    entityType: 'TASK',
    entityId: taskId,
    uploadedById: userId,
  });

  return result;
}
```

## 📋 Schema de Base de Datos

El módulo utiliza la tabla `fileAttachmentsTable`:

```sql
CREATE TABLE file_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type file_entity_type NOT NULL, -- 'PROJECT' | 'TASK' | 'CLIENT_DOCUMENT'
  entity_id UUID NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(1024) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  uploaded_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 🎯 Principios SOLID Implementados

- **S - Single Responsibility**: Cada método tiene una responsabilidad única
- **O - Open/Closed**: Fácil extensión sin modificar código existente
- **L - Liskov Substitution**: Interfaces bien definidas
- **I - Interface Segregation**: Interfaces específicas y enfocadas
- **D - Dependency Inversion**: Dependencias inyectadas, no hardcodeadas

## � Mejoras vs Versión Anterior

| Aspecto | Antes | Después |
|---------|-------|---------|
| Integración BD | ❌ No | ✅ Completa |
| Validación Entidades | ❌ No | ✅ Sí |
| Type-Safety | ⚠️ Bajo | ✅ Alto |
| Logging | ⚠️ Básico | ✅ Completo |
| Manejo Errores | ⚠️ Básico | ✅ Robusto |
| Principios SOLID | ⚠️ Parcial | ✅ Completo |

## 📄 Documentación Adicional

- **[REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)**: Documentación detallada de la refactorización
- **[storage.interfaces.ts](./interfaces/storage.interfaces.ts)**: Definición de todas las interfaces
- **[storage.config.ts](./config/storage.config.ts)**: Configuraciones y constantes

## 📄 Licencia

Este módulo es parte del proyecto PaleroSoft CRM.