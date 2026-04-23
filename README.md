# FunnelKit LATAM — MVP

> El "Hotmart Checkout Builder" para infoproductores latinos en Whop.
> 100% en español. One-click upsell nativo. Sin código para el creador.

---

## Flujo técnico completo

```
[/f/[slug]]                          Tu checkout personalizado
     ↓  usuario selecciona bumps
[POST /api/checkout/create]          Crea CheckoutConfiguration en Whop
     ↓  devuelve session_id
[WhopCheckoutEmbed]                  Embed de Whop dentro de tu página
     ↓  setupFutureUsage="off_session" → guarda la tarjeta
[Webhook: setup_intent.succeeded]    Guardas payment_method_id en Supabase
[Webhook: payment.succeeded]         Registras conversión en analytics
     ↓  returnUrl → /f/[slug]/upsell
[/f/[slug]/upsell]                   Página de upsell one-click
     ↓  usuario acepta
[POST /api/upsell/accept]            Cobra off-session SIN tarjeta nueva
     ↓
[/f/[slug]/gracias]                  Página de confirmación final
```

---

## Setup en 5 pasos

### 1. Clonar e instalar

```bash
git clone https://github.com/soyandresvalencia/funnelkit-latam
cd funnelkit-latam
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
# Completar con tus credenciales de Whop y Supabase
```

### 3. Base de datos en Supabase

Abrir el SQL Editor de tu proyecto y ejecutar `schema.sql`.

Descomentar el bloque de "DATO DE PRUEBA" y reemplazar:
- `tu-whop-user-id` → tu user ID de Whop
- `plan_XXXXXXXXX` → los IDs de tus planes en Whop

### 4. Webhook en Whop

1. Ir a `whop.com/dashboard/developer` → **Webhooks**
2. Crear webhook con URL: `https://tu-app.vercel.app/api/webhooks/whop`
3. Seleccionar eventos:
   - `payment.succeeded`
   - `setup_intent.succeeded`
   - `membership.went_valid`
   - `payment.failed`
4. Copiar el **Webhook Secret** → pegar en `WHOP_WEBHOOK_SECRET`

Para desarrollo local usar ngrok:
```bash
ngrok http 3000
# Copiar la URL de ngrok como webhook URL en Whop
```

### 5. Correr en desarrollo

```bash
npm run dev
# Tu checkout: http://localhost:3000/f/inmersion-claude-operator
```

---

## Estructura del proyecto

```
app/
  api/
    checkout/create/route.ts    → Crea CheckoutConfiguration en Whop
    webhooks/whop/route.ts      → Recibe eventos de Whop
    upsell/accept/route.ts      → Cobra upsell off-session
    upsell/decline/route.ts     → Registra rechazo del upsell
  f/[slug]/
    page.tsx                    → Server Component — carga el embudo
    checkout-client.tsx         → Client Component — UI interactiva
    upsell/page.tsx             → Página de upsell one-click
    gracias/page.tsx            → Página de confirmación
lib/
  whop.ts                       → Cliente Whop SDK singleton
  supabase.ts                   → Cliente Supabase (server + browser)
types/
  index.ts                      → Tipos TypeScript compartidos
schema.sql                      → Schema completo de Supabase
```

---

## Cómo crear un nuevo embudo

Por ahora via SQL directo (el dashboard del creador viene en V2):

```sql
-- 1. Insertar el embudo
INSERT INTO funnels (user_id, slug, name, status, config)
VALUES ('tu-user-id', 'mi-curso', 'Mi Curso', 'active', '{...config...}');

-- 2. Insertar order bumps
INSERT INTO order_bumps (funnel_id, whop_plan_id, name, description, price, display_order)
VALUES ('uuid-del-embudo', 'plan_XXXXX', 'Nombre del bump', 'Descripción', 47.00, 1);
```

---

## Por qué setupFutureUsage="off_session" es la clave

La documentación de Whop confirma que al añadir `setupFutureUsage="off_session"` al embed:

1. Whop guarda el método de pago del cliente
2. Tú recibes `setup_intent.succeeded` con el `payment_method_id`
3. En el upsell, llamas a `whopsdk.payments.create()` con ese ID
4. El cliente **no ve ningún formulario** — es literalmente un clic

Esto es lo que hace posible el upsell one-click real, sin depender de Stripe directamente ni de integraciones externas.

---

## Roadmap

- [x] V0.1 — Checkout + Order Bumps + Upsell one-click + Gracias
- [ ] V0.2 — Dashboard del creador (crear/editar embudos sin SQL)
- [ ] V0.3 — Analytics visual (visitas, conversiones, ingresos)
- [ ] V0.4 — Dominios personalizados
- [ ] V0.5 — Templates prediseñados en español
- [ ] V1.0 — App publicada en Whop Marketplace
