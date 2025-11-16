# Sistema de votaciones

Integrantes:
- Alam Reyes
- Erick Juárez
- Michelle Benítez
- Pilar Hernández
- Luis García
- Ricardo Romero

## Instalación 

Clonar y acceder al repositorio:

```bash
git clone https://github.com/AlamReyes/Sistema-de-Votaciones---Cripto.git

cd Sistema-de-Votaciones---Cripto
```

### Frontend

Instalar las dependencias necesarias:

```bash
npm install
```

Ejecutar el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver el frontend.

## Estructura de directorios

```
Sistema-de-Votaciones---Cripto/
│
├── app/                     # Frontend con Next.js
├── components/              # Componentes del Frontend
├── public/                  # Recusos compartidos
├── backend/                 # Backend con FastAPI
│   ├── main.py              # Punto de entrada
│   ├── api/                 
|   |   |-- v1/              # Contendrá los routers
|   |   |   |-- schemas/     # Modelos con Pydantic para validar lo que entra y sale de la base de datos.
|   |   |   |-- routes/      # Endpoints para cada tabla en la base de datos.
|   |
|   |-- db/                  # Configuración de la base de datos
|   |   |-- models/          # Modelos de la base de datos para SQLAlchemy ORM
|   |   |-- repositories/    # Capa que habla directamente con la base de datos, queries, CRUD, etc.
|   |
│   ├── core/                # Configuración global, variables de entorno, seguridad, etc.
│   ├── services/            # Lógica de negocio, validaciones, coherencia y uso de endpoints
│   ├── requirements.txt     # Dependencias de Python
│   └── __init__.py
│
├── package.json
├── tsconfig.json
└── README.md
```