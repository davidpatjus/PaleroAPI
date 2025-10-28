# 💻 EJEMPLOS PRÁCTICOS: Storage Service

## 🎯 Casos de Uso Reales

### 1️⃣ Subir Logo de Proyecto

```typescript
// 1. Crear proyecto primero
POST /projects
{
  "name": "Sitio Web Corporativo",
  "description": "Desarrollo de sitio institucional",
  "clientId": "user-123-abc",
  "status": "IN_PROGRESS"
}

// Respuesta:
{
  "id": "project-456-def", // ⚠️ GUARDA ESTE ID
  "name": "Sitio Web Corporativo",
  ...
}

// 2. Subir logo usando el ID del proyecto
POST /storage/upload
Content-Type: multipart/form-data

file: [BINARY: logo.png]
entityType: PROJECT
entityId: project-456-def  // ✅ ID del proyecto creado arriba
uploadedById: user-123-abc

// Respuesta:
{
  "message": "File uploaded successfully",
  "data": {
    "id": "file-789-ghi",
    "fileName": "logo.png",
    "filePath": "projects/project-456-def/1735689234567-a3f8k1.png",
    "publicUrl": "https://xxx.supabase.co/storage/v1/object/public/images/..."
  }
}
```

---

### 2️⃣ Subir Documento Adjunto a Tarea

```typescript
// 1. Crear tarea primero
POST /tasks
{
  "projectId": "project-456-def",
  "title": "Diseñar mockups",
  "description": "Crear prototipos de diseño",
  "status": "TODO",
  "assignedToId": "user-123-abc"
}

// Respuesta:
{
  "id": "task-789-jkl", // ⚠️ GUARDA ESTE ID
  ...
}

// 2. Subir documento adjunto
POST /storage/upload
Content-Type: multipart/form-data

file: [BINARY: requisitos.pdf]
entityType: TASK
entityId: task-789-jkl  // ✅ ID de la tarea
uploadedById: user-123-abc
customFileName: requisitos-cliente.pdf  // ✅ Opcional: nombre personalizado

// Respuesta:
{
  "data": {
    "id": "file-012-mno",
    "fileName": "requisitos-cliente.pdf",
    "filePath": "tasks/task-789-jkl/requisitos-cliente.pdf",
    // ⚠️ No hay publicUrl porque va al bucket 'files' (privado)
  }
}
```

---

### 3️⃣ Subir Documento de Cliente

```typescript
// 1. Asegúrate que el usuario/cliente existe
GET /users/user-123-abc

// Respuesta:
{
  "id": "user-123-abc",
  "email": "cliente@example.com",
  "role": "CLIENT"
}

// 2. Subir contrato del cliente
POST /storage/upload
Content-Type: multipart/form-data

file: [BINARY: contrato.pdf]
entityType: CLIENT_DOCUMENT
entityId: user-123-abc  // ✅ ID del usuario/cliente
uploadedById: admin-user-789  // Usuario admin que sube el documento

// Respuesta:
{
  "data": {
    "id": "file-345-pqr",
    "fileName": "contrato.pdf",
    "filePath": "documents/user-123-abc/contrato.pdf",
    "entityType": "CLIENT_DOCUMENT",
    "entityId": "user-123-abc"
  }
}
```

---

## 📂 Consultar Archivos

### Listar todos los archivos de un proyecto

```typescript
GET /storage/list?entityType=PROJECT&entityId=project-456-def

// Respuesta:
[
  {
    "id": "file-789-ghi",
    "fileName": "logo.png",
    "filePath": "projects/project-456-def/logo.png",
    "fileType": "image/png",
    "entityType": "PROJECT",
    "entityId": "project-456-def",
    "uploadedById": "user-123-abc",
    "createdAt": "2025-10-03T10:30:00Z"
  },
  {
    "id": "file-abc-123",
    "fileName": "mockup.jpg",
    "filePath": "projects/project-456-def/mockup.jpg",
    "fileType": "image/jpeg",
    "entityType": "PROJECT",
    "entityId": "project-456-def",
    "uploadedById": "user-123-abc",
    "createdAt": "2025-10-03T11:45:00Z"
  }
]
```

### Listar archivos de una tarea

```typescript
GET /storage/list?entityType=TASK&entityId=task-789-jkl

// Respuesta:
[
  {
    "id": "file-012-mno",
    "fileName": "requisitos-cliente.pdf",
    "filePath": "tasks/task-789-jkl/requisitos-cliente.pdf",
    "fileType": "application/pdf",
    "entityType": "TASK",
    "entityId": "task-789-jkl",
    "uploadedById": "user-123-abc",
    "createdAt": "2025-10-03T12:00:00Z"
  }
]
```

### Listar todos los archivos subidos por un usuario

```typescript
GET /storage/list?uploadedById=user-123-abc&limit=50&offset=0

// Respuesta:
[
  {
    "id": "file-789-ghi",
    "fileName": "logo.png",
    "entityType": "PROJECT",
    ...
  },
  {
    "id": "file-012-mno",
    "fileName": "requisitos-cliente.pdf",
    "entityType": "TASK",
    ...
  },
  // ... hasta 50 archivos
]
```

---

## 🔗 Obtener URLs de Descarga

### URL Pública (solo para imágenes)

```typescript
// Imágenes en bucket 'images' son públicas automáticamente
GET /storage/public-url?bucket=images&filePath=projects/project-456-def/logo.png

// Respuesta:
{
  "publicUrl": "https://xxx.supabase.co/storage/v1/object/public/images/projects/project-456-def/logo.png"
}

// Usar directamente en HTML:
<img src="https://xxx.supabase.co/storage/v1/object/public/images/..." />
```

### URL Firmada (para documentos privados)

```typescript
// Documentos en bucket 'files' requieren URL firmada
GET /storage/download?bucket=files&filePath=tasks/task-789-jkl/requisitos-cliente.pdf&expiresIn=3600

// Respuesta:
{
  "signedUrl": "https://xxx.supabase.co/storage/v1/object/sign/files/tasks/...?token=abc123",
  "expiresIn": 3600  // Expira en 1 hora (3600 segundos)
}

// ⚠️ Esta URL solo funciona por 1 hora
// Después de 1 hora, necesitas generar una nueva URL firmada
```

### URL Firmada de Corta Duración

```typescript
// Para downloads inmediatos (5 minutos)
GET /storage/download?bucket=files&filePath=documents/user-123-abc/contrato.pdf&expiresIn=300

// Respuesta:
{
  "signedUrl": "https://xxx.supabase.co/storage/v1/object/sign/files/documents/...?token=xyz789",
  "expiresIn": 300  // Expira en 5 minutos
}
```

---

## 🗑️ Eliminar Archivos

```typescript
// Eliminar archivo por ID
DELETE /storage/file-789-ghi

// Respuesta:
{
  "message": "File deleted successfully"
}

// ✅ Esto elimina:
// 1. El archivo de Supabase Storage
// 2. El registro de fileAttachmentsTable en PostgreSQL
```

---

## 🛠️ Integración en ProjectsService

### Obtener proyecto con archivos adjuntos

```typescript
// En projects.service.ts
async getProjectWithFiles(projectId: string) {
  // 1. Obtener proyecto
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1);

  if (!project) {
    throw new NotFoundException('Project not found');
  }

  // 2. Obtener archivos del proyecto
  const files = await db
    .select()
    .from(fileAttachmentsTable)
    .where(eq(fileAttachmentsTable.entityType, 'PROJECT'))
    .where(eq(fileAttachmentsTable.entityId, projectId));

  // 3. Generar URLs públicas para imágenes
  const filesWithUrls = files.map(file => {
    let publicUrl = undefined;
    if (file.fileType.startsWith('image/')) {
      publicUrl = this.storageService.getPublicUrl('images', file.filePath);
    }
    
    return {
      ...file,
      publicUrl
    };
  });

  return {
    ...project,
    files: filesWithUrls
  };
}
```

### Eliminar proyecto con archivos

```typescript
// En projects.service.ts
async deleteProject(projectId: string) {
  // 1. Obtener todos los archivos del proyecto
  const files = await db
    .select()
    .from(fileAttachmentsTable)
    .where(eq(fileAttachmentsTable.entityType, 'PROJECT'))
    .where(eq(fileAttachmentsTable.entityId, projectId));

  // 2. Eliminar cada archivo
  for (const file of files) {
    await this.storageService.deleteFile({ fileId: file.id });
  }

  // 3. Eliminar proyecto
  await db
    .delete(projectsTable)
    .where(eq(projectsTable.id, projectId));

  return { message: 'Project and files deleted successfully' };
}
```

---

## 🎨 Integración en TasksService

### Crear tarea con archivo adjunto

```typescript
// En tasks.service.ts
async createTaskWithAttachment(
  createTaskDto: CreateTaskDto,
  file?: Express.Multer.File,
  uploadedById?: string
) {
  // 1. Crear tarea
  const [task] = await db
    .insert(tasksTable)
    .values({
      title: createTaskDto.title,
      description: createTaskDto.description,
      projectId: createTaskDto.projectId,
      status: 'TODO',
      assignedToId: createTaskDto.assignedToId
    })
    .returning();

  // 2. Si hay archivo, subirlo
  let attachedFile = undefined;
  if (file && uploadedById) {
    const uploadResult = await this.storageService.uploadFile(file, {
      bucket: file.mimetype.startsWith('image/') ? 'images' : 'files',
      folder: 'tasks',
      entityType: 'TASK',
      entityId: task.id,
      uploadedById
    });

    if (uploadResult.success) {
      attachedFile = uploadResult.data;
    }
  }

  return {
    ...task,
    attachedFile
  };
}
```

---

## 🚨 Manejo de Errores

### Error: Proyecto no existe

```typescript
POST /storage/upload
{
  file: [BINARY],
  entityType: "PROJECT",
  entityId: "proyecto-inexistente-123", // ❌ Este ID no existe
  uploadedById: "user-123-abc"
}

// Respuesta (404):
{
  "statusCode": 404,
  "message": "PROJECT with ID proyecto-inexistente-123 not found",
  "error": "Not Found"
}
```

### Error: Usuario no existe

```typescript
POST /storage/upload
{
  file: [BINARY],
  entityType: "PROJECT",
  entityId: "project-456-def",
  uploadedById: "usuario-inexistente-xyz" // ❌ Este usuario no existe
}

// Respuesta (404):
{
  "statusCode": 404,
  "message": "User with ID usuario-inexistente-xyz not found",
  "error": "Not Found"
}
```

### Error: Tipo de archivo no permitido

```typescript
POST /storage/upload
{
  file: [BINARY: virus.exe], // ❌ .exe no está permitido
  entityType: "PROJECT",
  entityId: "project-456-def",
  uploadedById: "user-123-abc"
}

// Respuesta (400):
{
  "statusCode": 400,
  "message": "File extension .exe is not allowed",
  "error": "Bad Request"
}
```

### Error: Archivo muy grande

```typescript
POST /storage/upload
{
  file: [BINARY: video-100mb.mp4], // ❌ Excede 50MB
  entityType: "TASK",
  entityId: "task-789-jkl",
  uploadedById: "user-123-abc"
}

// Respuesta (400):
{
  "statusCode": 400,
  "message": "File size exceeds limit of 50MB",
  "error": "Bad Request"
}
```

---

## 📊 Consultas SQL Directas (para debugging)

### Ver todos los archivos en la BD

```sql
SELECT 
  fa.id,
  fa.file_name,
  fa.entity_type,
  fa.entity_id,
  u.name as uploaded_by,
  fa.created_at
FROM file_attachments fa
JOIN users u ON fa.uploaded_by_id = u.id
ORDER BY fa.created_at DESC
LIMIT 20;
```

### Ver archivos de un proyecto específico

```sql
SELECT 
  fa.file_name,
  fa.file_path,
  fa.file_type,
  p.name as project_name
FROM file_attachments fa
JOIN projects p ON fa.entity_id = p.id
WHERE fa.entity_type = 'PROJECT'
  AND fa.entity_id = 'project-456-def';
```

### Ver archivos huérfanos (sin entidad válida)

```sql
-- Archivos de proyectos eliminados
SELECT fa.*
FROM file_attachments fa
LEFT JOIN projects p ON fa.entity_id = p.id AND fa.entity_type = 'PROJECT'
WHERE fa.entity_type = 'PROJECT' AND p.id IS NULL;

-- Archivos de tareas eliminadas
SELECT fa.*
FROM file_attachments fa
LEFT JOIN tasks t ON fa.entity_id = t.id AND fa.entity_type = 'TASK'
WHERE fa.entity_type = 'TASK' AND t.id IS NULL;
```

---

## 🔍 Debugging en Logs

Cuando subes un archivo, verás estos logs en consola:

```
[StorageService] 📤 Uploading file: logo.png for PROJECT:project-456-def
[StorageService] ✅ File uploaded successfully: file-789-ghi - logo.png
```

Si hay error de validación:

```
[StorageService] ⚠️ File validation failed: File type image/bmp is not allowed
[StorageService] ❌ Upload error: BadRequestException: File type image/bmp is not allowed
```

Si la entidad no existe:

```
[StorageService] ⚠️ Project not found: proyecto-inexistente-123
[StorageService] ❌ Upload error: NotFoundException: PROJECT with ID proyecto-inexistente-123 not found
```

---

## 🎯 Mejores Prácticas

### ✅ DO (Hacer)

1. **Siempre valida que la entidad existe antes de subir**
   ```typescript
   // 1. Crear/obtener proyecto
   const project = await getProject(projectId);
   
   // 2. Subir archivo
   await uploadFile({ entityId: project.id, ... });
   ```

2. **Usa nombres personalizados descriptivos**
   ```typescript
   customFileName: "contrato-cliente-acme-2025.pdf"
   // Mejor que: "1735689234567-a3f8k1.pdf"
   ```

3. **Elimina archivos al eliminar entidades**
   ```typescript
   // Al eliminar proyecto, elimina sus archivos también
   const files = await listFiles({ entityType: 'PROJECT', entityId });
   for (const file of files) {
     await deleteFile({ fileId: file.id });
   }
   ```

4. **Genera URLs firmadas para documentos sensibles**
   ```typescript
   // No expongas URLs públicas de contratos
   const signedUrl = await getDownloadUrl({ 
     bucket: 'files', 
     filePath: '...', 
     expiresIn: 300 // Solo 5 minutos
   });
   ```

### ❌ DON'T (No hacer)

1. **No subas archivos sin validar la entidad**
   ```typescript
   // ❌ MAL
   await uploadFile({ entityId: someRandomId, ... });
   
   // ✅ BIEN
   const project = await getProject(projectId);
   if (!project) throw new NotFoundException();
   await uploadFile({ entityId: project.id, ... });
   ```

2. **No uses el mismo bucket para todo**
   ```typescript
   // ❌ MAL: Contratos en bucket público
   bucket: 'images', folder: 'contracts'
   
   // ✅ BIEN: Contratos en bucket privado
   bucket: 'files', folder: 'documents'
   ```

3. **No dejes archivos huérfanos**
   ```typescript
   // ❌ MAL: Eliminar proyecto sin eliminar archivos
   await db.delete(projectsTable).where(eq(projectsTable.id, id));
   
   // ✅ BIEN: Eliminar archivos primero
   await deleteProjectFiles(id);
   await db.delete(projectsTable).where(eq(projectsTable.id, id));
   ```

4. **No guardes URLs en la BD**
   ```typescript
   // ❌ MAL: Guardar URLs en BD (cambian si renombras bucket)
   imageUrl: "https://xxx.supabase.co/storage/..."
   
   // ✅ BIEN: Guardar filePath y generar URL al consultar
   filePath: "projects/123.../logo.png"
   // Generar URL: getPublicUrl('images', filePath)
   ```

---

## 🧪 Tests con REST Client (VSCode)

```http
### Variables
@baseUrl = http://localhost:3000
@projectId = project-456-def
@taskId = task-789-jkl
@userId = user-123-abc

### 1. Inicializar buckets
POST {{baseUrl}}/storage/initialize

### 2. Subir imagen de proyecto
POST {{baseUrl}}/storage/upload
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="entityType"

PROJECT
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="entityId"

{{projectId}}
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="uploadedById"

{{userId}}
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="logo.png"
Content-Type: image/png

[Selecciona archivo aquí]
------WebKitFormBoundary7MA4YWxkTrZu0gW--

### 3. Listar archivos del proyecto
GET {{baseUrl}}/storage/list?entityType=PROJECT&entityId={{projectId}}

### 4. Obtener URL pública
GET {{baseUrl}}/storage/public-url?bucket=images&filePath=projects/{{projectId}}/logo.png

### 5. Eliminar archivo
DELETE {{baseUrl}}/storage/file-789-ghi
```

---

¿Necesitas más ejemplos de algún caso específico? 🚀
