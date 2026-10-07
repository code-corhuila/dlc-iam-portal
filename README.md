# DLC IAM Portal

Esqueleto de `dlc-iam-portal`, adaptado de la estructura Angular del Anexo H.

## Estado

El portal ya arranca de forma independiente y muestra un formulario básico y el estado de MFA pendiente. La vista aún no tiene el diseño de Figma. El formulario llama a `/api/v1/auth/login`, por lo que sin backend no completa el acceso. La verificación MFA y la sesión simulada siguen pendientes; `federation.config.js` y los archivos de `deploy/` continúan vacíos.

La CI ejecuta `npm run check:skeleton`, `npm test` y `npx ng run dlc-iam-portal:build-original:production`. Ese build valida Angular independiente, no Native Federation. `src/bootstrap.ts` proporciona `HttpClient` para esta vista local; la integración con `dlc-front` y el adaptador simulado acordado aún están pendientes.

## Verificación local
```bash
npm run check:skeleton
npm test
npx ng run dlc-iam-portal:build-original:production
npx ng run dlc-iam-portal:serve-original
```

Estas comprobaciones no validan Native Federation, el API Gateway ni el flujo completo de MFA y sesión.

## Responsabilidades futuras

- `src/app/iam/components/`: formularios de acceso y MFA.
- `src/app/iam/data/`: acceso al contrato IAM; actualmente usa `HttpClient`, con integración al cliente compartido pendiente.
- `src/app/iam/model/`: tipos derivados del contrato OpenAPI de IAM.
- `src/app/iam/pages/`: páginas del dominio IAM.
- `src/app/iam/iam.routes.ts`: rutas que se expondrán por Native Federation.
- `src/app/shell-contract.ts`: contrato de integración con el contenedor.

`dlc-front` deberá ser dueño de la sesión, del cliente HTTP compartido y de la URL del Gateway. El portal todavía no crea ni persiste sesiones. `.github/CODEOWNERS` ya existía en la rama base y se conserva.

## Gobernanza

Las reglas de ramas, revisiones y promoción están en la [política de ramas de Di Lucca](https://github.com/code-corhuila/ods-docs/blob/main/00-governance/branching-policy.md).
