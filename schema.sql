-- ═══════════════════════════════════════════════════════════════════
-- FunnelKit LATAM — Schema de Supabase
-- Ejecutar en el SQL Editor de tu proyecto de Supabase
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. EMBUDOS ──────────────────────────────────────────────────────────────
create table if not exists funnels (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,              -- ID del creador (de Whop OAuth)
  slug        text unique not null,       -- URL pública: /f/[slug]
  name        text not null,              -- nombre interno del embudo
  config      jsonb not null default '{}', -- FunnelConfig completo
  status      text not null default 'draft'
                check (status in ('draft', 'active', 'archived')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Índice para búsqueda por slug (hit frecuente en cada visita)
create index if not exists funnels_slug_idx on funnels(slug);
create index if not exists funnels_user_id_idx on funnels(user_id);

-- ─── 2. ORDER BUMPS ──────────────────────────────────────────────────────────
create table if not exists order_bumps (
  id            uuid primary key default gen_random_uuid(),
  funnel_id     uuid not null references funnels(id) on delete cascade,
  whop_plan_id  text not null,    -- plan_XXXXXX de Whop
  name          text not null,
  description   text,
  price         numeric(10,2) not null check (price > 0),
  display_order int not null default 0,
  created_at    timestamptz default now()
);

create index if not exists order_bumps_funnel_idx on order_bumps(funnel_id);

-- ─── 3. MÉTODOS DE PAGO (para upsell off-session) ────────────────────────────
-- CRÍTICO: aquí guardamos el payment_method_id de Whop para cobrar el upsell
-- sin que el cliente vuelva a ingresar su tarjeta
create table if not exists payment_methods (
  id                  uuid primary key default gen_random_uuid(),
  member_id           text not null,          -- mber_XXXXXX de Whop
  payment_method_id   text not null,          -- payt_XXXXXX de Whop
  funnel_id           uuid references funnels(id) on delete set null,
  created_at          timestamptz default now(),
  -- Un cliente tiene un método de pago por embudo
  unique(member_id, funnel_id)
);

create index if not exists payment_methods_member_idx on payment_methods(member_id);

-- ─── 4. ANALYTICS ────────────────────────────────────────────────────────────
create table if not exists analytics_events (
  id          uuid primary key default gen_random_uuid(),
  funnel_id   uuid references funnels(id) on delete cascade,
  event       text not null
                check (event in ('visit', 'checkout_view', 'conversion', 'upsell_accepted', 'upsell_declined')),
  payment_id  text,                     -- ID del pago en Whop
  member_id   text,                     -- mber_XXXXXX de Whop
  amount      numeric(10,2),
  metadata    jsonb,
  created_at  timestamptz default now()
);

create index if not exists analytics_funnel_idx on analytics_events(funnel_id);
create index if not exists analytics_event_idx  on analytics_events(event);
create index if not exists analytics_created_idx on analytics_events(created_at desc);

-- ─── 5. RLS (Row Level Security) ─────────────────────────────────────────────
-- Los creadores solo ven sus propios embudos
alter table funnels         enable row level security;
alter table order_bumps     enable row level security;
alter table analytics_events enable row level security;
-- payment_methods: acceso solo desde el service key (server-side)
alter table payment_methods  enable row level security;

-- Políticas para funnels (el user_id vendrá del JWT de Whop OAuth)
create policy "Creadores ven sus propios embudos"
  on funnels for select
  using (auth.uid()::text = user_id);

create policy "Creadores crean sus embudos"
  on funnels for insert
  with check (auth.uid()::text = user_id);

create policy "Creadores actualizan sus embudos"
  on funnels for update
  using (auth.uid()::text = user_id);

-- Los embudos activos son públicos para lectura (necesario para el checkout)
create policy "Embudos activos son públicos"
  on funnels for select
  using (status = 'active');

-- Order bumps: públicos para lectura (el checkout los necesita sin auth)
create policy "Order bumps son públicos para lectura"
  on order_bumps for select
  using (true);

create policy "Creadores gestionan sus order bumps"
  on order_bumps for all
  using (
    funnel_id in (
      select id from funnels where user_id = auth.uid()::text
    )
  );

-- ─── 6. FUNCIÓN: métricas agregadas por embudo ───────────────────────────────
-- Vista para el dashboard de analytics
create or replace view funnel_metrics as
select
  f.id                                                    as funnel_id,
  f.name                                                  as funnel_name,
  f.slug,
  count(*) filter (where e.event = 'visit')               as visits,
  count(*) filter (where e.event = 'checkout_view')       as checkout_views,
  count(*) filter (where e.event = 'conversion')          as conversions,
  count(*) filter (where e.event = 'upsell_accepted')     as upsell_accepted,
  count(*) filter (where e.event = 'upsell_declined')     as upsell_declined,
  -- Tasa de conversión
  round(
    100.0 * count(*) filter (where e.event = 'conversion')
    / nullif(count(*) filter (where e.event = 'visit'), 0),
    1
  )                                                       as conversion_rate_pct,
  -- Tasa de upsell
  round(
    100.0 * count(*) filter (where e.event = 'upsell_accepted')
    / nullif(count(*) filter (where e.event = 'conversion'), 0),
    1
  )                                                       as upsell_rate_pct,
  -- Ingresos totales
  coalesce(sum(e.amount) filter (where e.event in ('conversion', 'upsell_accepted')), 0) as total_revenue
from funnels f
left join analytics_events e on e.funnel_id = f.id
group by f.id, f.name, f.slug;

-- ─── 7. DATO DE PRUEBA: embudo de la Inmersión ───────────────────────────────
-- Descomentar para insertar el embudo de prueba
/*
insert into funnels (user_id, slug, name, status, config) values (
  'tu-whop-user-id',
  'inmersion-claude-operator',
  'Inmersión Claude Operator',
  'active',
  '{
    "main_product": {
      "whop_plan_id": "plan_XXXXXXXXX",
      "name": "El Arsenal del Operador I.A.",
      "description": "5 semanas de implementación práctica con Claude",
      "price": 17.00,
      "original_price": 97.00,
      "benefits": [
        "5 semanas de implementación práctica con Claude",
        "Acceso a las sesiones en vivo cada miércoles",
        "Squad de agentes I.A. listos para tu negocio",
        "Comunidad privada de operadores en Whop",
        "Soporte directo durante toda la inmersión"
      ]
    },
    "upsell": {
      "whop_plan_id": "plan_XXXXXXXXX",
      "name": "Workshop Avanzado Claude Code",
      "description": "3 horas de implementación en vivo",
      "price": 47.00,
      "original_price": 127.00,
      "benefits": [
        "3 horas de implementación en vivo con Claude Code",
        "Configuración de MCP servers para tu negocio",
        "Templates de agentes listos para producción",
        "Acceso de por vida + grabación"
      ]
    },
    "branding": {
      "accent_color": "#F5A623",
      "company_name": "De Base Digital"
    },
    "checkout": {
      "headline": "Completa tu pedido",
      "subheadline": "Estás a un clic de acceder al Arsenal.",
      "cta_text": "Acceder ahora →",
      "countdown_minutes": 30,
      "testimonials": [
        {
          "name": "María R.",
          "role": "Coach · Colombia",
          "avatar_initials": "MR",
          "text": "En la primera semana ya tenía mis primeros agentes corriendo.",
          "rating": 5
        }
      ],
      "trust_seals": [
        { "icon": "🔒", "label": "Pago seguro" },
        { "icon": "✅", "label": "Garantía 7 días" },
        { "icon": "🌎", "label": "Acceso inmediato" }
      ]
    }
  }'
);

-- Order bumps del embudo de prueba
insert into order_bumps (funnel_id, whop_plan_id, name, description, price, display_order)
select
  id,
  'plan_GRABACIONES',
  'Grabaciones Inmersión Claude Operator',
  'Acceso de por vida a todas las grabaciones. Repasa cuando quieras.',
  37.00,
  1
from funnels where slug = 'inmersion-claude-operator';

insert into order_bumps (funnel_id, whop_plan_id, name, description, price, display_order)
select
  id,
  'plan_VIP',
  'Operator Room VIP',
  'Sala VIP con sesiones privadas y feedback directo de Andrés.',
  47.00,
  2
from funnels where slug = 'inmersion-claude-operator';
*/
