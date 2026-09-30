# DLC IAM Portal

Esqueleto de `dlc-iam-portal`, adaptado de la estructura Angular del Anexo H.

## Estado

Los archivos de `src/app/iam/`, `src/main.ts`, `src/bootstrap.ts`, `src/index.html`, `federation.config.js` y `deploy/` están vacíos intencionalmente. Solo reservan la ubicación donde se implementará el portal. No hay pantallas, autenticación, MFA, llamadas al API ni integración funcional con el contenedor.

Las configuraciones de Angular, TypeScript y npm están presentes como base del proyecto. El proyecto no compila todavía porque los archivos fuente están vacíos; el flujo CI comenzará a pasar cuando se implemente el arranque mínimo.

## Responsabilidades futuras

- `src/app/iam/components/`: formularios de acceso y MFA.
- `src/app/iam/data/`: consumo del API IAM mediante el `HttpClient` provisto por el contenedor.
- `src/app/iam/model/`: tipos derivados del contrato OpenAPI de IAM.
- `src/app/iam/pages/`: páginas del dominio IAM.
- `src/app/iam/iam.routes.ts`: rutas que se expondrán por Native Federation.
- `src/app/shell-contract.ts`: contrato de integración con el contenedor.

El contenedor seguirá siendo dueño de la sesión, el cliente HTTP y la URL del gateway. Al trasladar este esqueleto al repositorio real, se conservan `CODEOWNERS` y `env-tracking.yml` provistos por el docente.
