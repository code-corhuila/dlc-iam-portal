# DLC IAM Portal

Esqueleto de `dlc-iam-portal`, adaptado de la estructura Angular del Anexo H.

## Estado

Los archivos de `src/`, `federation.config.js` y `deploy/` están vacíos intencionalmente. Solo reservan la ubicación donde se implementará el portal. No hay pantallas, autenticación, MFA, llamadas al API ni integración funcional con el contenedor.

Las configuraciones de Angular, TypeScript y npm están presentes como base del proyecto. El proyecto no compila todavía porque los archivos fuente están vacíos. La CI ejecuta `npm run check:skeleton`: verifica la presencia de archivos y la coherencia básica de las configuraciones, sin instalar dependencias, compilar ni ejecutar pruebas funcionales. Al implementar el arranque mínimo, se debe añadir `npm ci` y `npm run build` a la CI; las pruebas se incorporarán junto con el comportamiento que validen.

## Verificación local

```bash
npm run check:skeleton
```

El resultado de esta comprobación solo acredita la estructura del esqueleto. No demuestra que Angular, Native Federation o el despliegue funcionen.

## Responsabilidades futuras

- `src/app/iam/components/`: formularios de acceso y MFA.
- `src/app/iam/data/`: consumo del API IAM mediante el `HttpClient` provisto por el contenedor.
- `src/app/iam/model/`: tipos derivados del contrato OpenAPI de IAM.
- `src/app/iam/pages/`: páginas del dominio IAM.
- `src/app/iam/iam.routes.ts`: rutas que se expondrán por Native Federation.
- `src/app/shell-contract.ts`: contrato de integración con el contenedor.

El contenedor seguirá siendo dueño de la sesión, el cliente HTTP y la URL del gateway. El archivo `.github/CODEOWNERS` ya existe en la rama base y se conserva.

## Gobernanza

Las reglas de ramas, revisiones y promoción están en la [política de ramas de Di Lucca](https://github.com/code-corhuila/ods-docs/blob/main/00-governance/branching-policy.md).
