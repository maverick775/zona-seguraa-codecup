# Zona SeguRAA - Aplicación Web Frontend

Aplicación web de emergencia comunitaria basada en las imágenes de referencia del proyecto Zona SeguRAA.

## 🚀 Características Implementadas

### ✅ Pantallas Principales

1. **Página Principal** (`/`)
   - Resumen de estado de la zona
   - Estadísticas rápidas de alertas activas y nodos
   - Acciones rápidas para crear y validar alertas
   - Actividad reciente

2. **Flujo de Creación de Alertas** (`/alerts/create`)
   - **Paso 1**: Selección de tipo y nivel de emergencia
   - **Paso 2**: Selección de ubicación
   - **Paso 3**: Descripción detallada
   - **Paso 4**: Confirmación y envío

3. **Validación de Alertas** (`/alerts/validation`)
   - Vista detallada de alertas activas
   - Sistema de votación comunitaria
   - Progreso de validación en tiempo real
   - Comentarios adicionales

4. **Visor de Zonas** (`/zone`)
   - Mapa interactivo con nodos y alertas
   - Estado general de la zona
   - Toggle entre vista de alertas y nodos
   - Leyenda y estadísticas

## 🎨 Diseño y Colores

La aplicación respeta la paleta de colores definida en `frontend-tokens.css`:

- **Teal Principal**: `#2b7a78`
- **Rojo de Emergencia**: `#e63946`
- **Púrpura Admin**: `#a020f0`
- **Azul Aliado**: `#3a86ff`
- **Fondo Claro**: `#f8f9fa`
- **Texto Oscuro**: `#1d1d1f`

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 16.2.0
- **Lenguaje**: TypeScript
- **Estilos**: TailwindCSS v4
- **Mapas**: Leaflet + React-Leaflet
- **Backend**: Mock data (simulado)

## 📦 Instalación y Ejecución

### Prerrequisitos

- Node.js (versión 18 o superior)
- npm o yarn

### Pasos de Instalación

1. **Navegar al directorio del frontend**
   ```bash
   cd c:\zonaSeguRAA\zona-seguraa
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Iniciar servidor de desarrollo**
   ```bash
   npm run dev
   ```

4. **Abrir aplicación**
   - Abre tu navegador y navega a `http://localhost:3000`

## 📱 Navegación de la Aplicación

### Flujo Principal

1. **Inicio** → Página principal con resumen
2. **Crear Alerta** → Flujo de 4 pasos
3. **Validar Alertas** → Votación y confirmación
4. **Ver Zona** → Mapa interactivo

### URLs Disponibles

- `/` - Página principal
- `/alerts/create` - Crear nueva alerta
- `/alerts/create/location` - Selección de ubicación
- `/alerts/create/description` - Descripción de alerta
- `/alerts/create/confirm` - Confirmación
- `/alerts/validation` - Validar alertas
- `/zone` - Visor de zona

## 🧪 Datos de Prueba (Mock)

La aplicación incluye datos simulados para demostrar todas las funcionalidades:

### Alertas de Ejemplo
- **Emergencia Médica** (Nivel Alto) - 65% validación
- **Seguridad** (Nivel Medio) - 80% validación

### Nodos de la Zona
- **Punto Médico Principal** - Online
- **Salida de Emergencia Norte** - Online  
- **Punto de Reunión Este** - Online

## 🔄 Funcionalidades Simuladas

- **Creación de alertas**: Simula el envío y redirección
- **Validación comunitaria**: Sistema de votos con progreso
- **Actualizaciones en tiempo real**: Estados y estadísticas
- **Navegación entre pantallas**: Flujo completo

## 🎯 Validación de Implementación

### ✅ Elementos Implementados

1. **Alerta Inicial 1-4**: ✅ Flujo completo de creación
2. **Validación 1-2**: ✅ Pantalla de validación con votación
3. **Visor de Zonas**: ✅ Mapa interactivo con nodos y alertas

### ✅ Características Técnicas

- **Diseño Responsive**: Optimizado para móviles
- **Navegación Intuitiva**: Breadcrumbs y botones de retroceso
- **Estados Interactivos**: Hover, focus, transiciones
- **Colores Consistentes**: Siguiendo la paleta definida
- **Mock Data**: Funcionalidad completa sin backend

## 🚀 Para Producción

1. **Construir la aplicación**
   ```bash
   npm run build
   ```

2. **Iniciar producción**
   ```bash
   npm start
   ```

## 📂 Estructura de Archivos

```
src/
├── app/
│   ├── page.tsx                    # Página principal
│   ├── alerts/
│   │   ├── create/
│   │   │   ├── page.tsx           # Paso 1: Tipo y nivel
│   │   │   ├── location/
│   │   │   │   └── page.tsx       # Paso 2: Ubicación
│   │   │   ├── description/
│   │   │   │   └── page.tsx       # Paso 3: Descripción
│   │   │   └── confirm/
│   │   │       └── page.tsx       # Paso 4: Confirmación
│   │   └── validation/
│   │       └── page.tsx           # Validación de alertas
│   └── zone/
│       └── page.tsx               # Visor de zona
├── lib/
│   └── mockData.ts                 # Datos simulados
└── app/
    └── globals.css                 # Estilos y colores
```

## 🤝 Contribución

Esta aplicación está diseñada como una implementación completa de las pantallas de referencia para el proyecto Zona SeguRAA. Todos los componentes son funcionales y listos para integración con backend real.

## 📋 Notas

- La aplicación utiliza datos mock para demostración
- El flujo completo está implementado según las imágenes
- Los colores y diseño coinciden con las especificaciones
- No se requiere configuración adicional para pruebas locales
