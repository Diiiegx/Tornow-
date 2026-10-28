import React, { useState } from 'react';
import { Check, MessageCircle, ArrowRight, ShieldCheck, Zap, Crown, Layers } from 'lucide-react';

export interface TornowPlan {
  id: 'basico' | 'pro' | 'now' | 'total';
  name: string;
  badge?: string;
  category: 'autogestion' | 'delegada';
  categoryLabel: string;
  description: string;
  tagline: string;
  includesHeader?: string;
  features: string[];
  price: string;
  competitorNote?: string;
  activationText: string;
  maxClubs: number;
  recommended?: boolean;
}

export const TORNOW_PLANS: TornowPlan[] = [
  {
    id: 'basico',
    name: 'Plan Básico',
    category: 'autogestion',
    categoryLabel: 'Categoría Autogestión',
    description: 'Para torneos cortos y ligas pequeñas que necesitan salir del papel y lápiz.',
    tagline: 'Tecnología esencial, 100% autogestionada.',
    features: [
      'Plataforma configurada y lista para usar.',
      'Panel de autogestión para ingresar resultados.',
      'Generación automática de tabla de posiciones y fixture.',
      'Página web pública básica de la competición.',
      'Capacidad: Hasta 10 clubes y 1 categoría.',
    ],
    price: '$10.990 / mes',
    competitorNote: '(La competencia cobra $19.990 por esto).',
    activationText: '¡GRATIS!',
    maxClubs: 10,
  },
  {
    id: 'pro',
    name: 'Plan Pro',
    category: 'autogestion',
    categoryLabel: 'Categoría Autogestión Avanzada',
    description: 'Para ligas en crecimiento que buscan proyectar una imagen profesional.',
    tagline: 'Autogestión avanzada con herramientas de difusión.',
    includesHeader: 'Todo lo del Plan Básico, MÁS:',
    features: [
      'Generador de imágenes (resultados, tablas y próximos partidos) con diseño listo para redes sociales.',
      'Estadísticas de jugadores (goleadores y valla menos batida).',
      'Soporte vía correo electrónico (tornowcl@gmail.com).',
      'Capacidad ampliada: Hasta 14 clubes y 1 categoría.',
    ],
    price: '$16.990 / mes',
    activationText: '¡GRATIS!',
    maxClubs: 14,
  },
  {
    id: 'now',
    name: 'Plan Now!',
    badge: 'EL MÁS RECOMENDADO',
    category: 'delegada',
    categoryLabel: 'Categoría Gestión Delegada',
    description: 'La mejor relación precio-rendimiento. Para organizadores que valoran su tiempo.',
    tagline: 'Tú lideras la liga. Nosotros actualizamos todo por ti al instante.',
    includesHeader: 'Todo lo del Plan Pro, MÁS:',
    features: [
      'Gestión delegada: Nos envías una foto de las planillas por WhatsApp y nuestro equipo sube los resultados por ti en tiempo récord.',
      'Carga inicial de todos los equipos y programación del fixture a cargo nuestro.',
      'Soporte prioritario y directo por WhatsApp.',
      'Módulo Disciplinario Básico (registro visual de tarjetas amarillas y rojas).',
      'Capacidad ampliada: Hasta 16 clubes y 2 categorías.',
    ],
    price: '$34.990 / mes',
    competitorNote: '(La competencia cobra $49.990 por un servicio similar).',
    activationText: '¡GRATIS!',
    maxClubs: 16,
    recommended: true,
  },
  {
    id: 'total',
    name: 'Plan Total',
    category: 'delegada',
    categoryLabel: 'Categoría Asociaciones & Tribunal',
    description: 'Gestión administrativa, disciplinaria y operativa para asociaciones grandes.',
    tagline: 'Control absoluto con normativas oficiales y cero trabajo manual para ti.',
    includesHeader: 'Todo lo del Plan Now! (Nosotros actualizamos por ti), MÁS:',
    features: [
      'Tribunal de Disciplina Completo: Sistema adaptable a reglamentos oficiales (ej. ANFA) con cálculo de fechas de suspensión.',
      'Bloqueo automático de jugadores: El sistema alerta si un jugador suspendido intenta ser incluido en la planilla de la fecha.',
      'Reportes formales: Actas y resoluciones generadas automáticamente en PDF/Word, listas para revisión y firma.',
      'Cuentas de acceso secundario (para árbitros o turnos).',
      'Máxima capacidad: Hasta 20 clubes y múltiples categorías.',
    ],
    price: '$59.990 / mes',
    competitorNote: '(La competencia cobra $79.990).',
    activationText: '¡GRATIS!',
    maxClubs: 20,
  },
];

interface PricingPlansSectionProps {
  onSelectPlan?: (plan: TornowPlan) => void;
}

export const PricingPlansSection: React.FC<PricingPlansSectionProps> = ({ onSelectPlan }) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'autogestion' | 'delegada'>('all');

  const displayedPlans = TORNOW_PLANS.filter((p) => {
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  return (
    <section id="planes" className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-200 space-y-6">
      {/* Header & Category Selector */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#0052fe] uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>Planes Oficiales TORNOW! · Activación Inicial ¡GRATIS!</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Planes divididos por categorías según tu liga
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Elige desde autogestión 100% digital para salir del papel y lápiz hasta gestión delegada completa con Tribunal de Disciplina y actualización por WhatsApp.
          </p>
        </div>

        {/* Category Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas las Categorías (4)
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('autogestion')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedCategory === 'autogestion'
                ? 'bg-[#0052fe] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Autogestión (Básico · Pro)
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('delegada')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              selectedCategory === 'delegada'
                ? 'bg-[#0052fe] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Gestión Delegada & Total (Now! · Total)
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div
        className={`grid grid-cols-1 gap-5 ${
          displayedPlans.length === 2
            ? 'md:grid-cols-2 max-w-4xl mx-auto'
            : 'md:grid-cols-2 xl:grid-cols-4'
        }`}
      >
        {displayedPlans.map((plan) => {
          const isRec = Boolean(plan.recommended);
          const whatsappPlanMsg = encodeURIComponent(
            `Hola equipo TORNOW!, quiero activar el *${plan.name}* (${plan.price}) con activación inicial GRATIS para mi torneo.`
          );

          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all relative ${
                isRec
                  ? 'bg-[#081223] text-white border-2 border-[#0052fe] shadow-xl'
                  : 'bg-slate-50/80 text-slate-900 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-4">
                {/* Category & Recommended Kicker */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                    <span className={isRec ? 'text-cyan-400' : 'text-[#0052fe]'}>
                      {plan.categoryLabel}
                    </span>
                    {plan.badge && (
                      <span className="text-amber-400 font-black tracking-wider uppercase flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5" />
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <h3 className={`text-xl font-black tracking-tight ${isRec ? 'text-white' : 'text-slate-900'}`}>
                    {plan.name}
                  </h3>
                </div>

                {/* Subtitle & Tagline */}
                <div className="space-y-1.5 text-xs">
                  <p className={isRec ? 'text-slate-300 leading-relaxed' : 'text-slate-600 leading-relaxed'}>
                    {plan.description}
                  </p>
                  <p className={`font-bold ${isRec ? 'text-cyan-300' : 'text-slate-900'}`}>
                    {plan.tagline}
                  </p>
                </div>

                {/* Price Box */}
                <div
                  className={`p-3.5 rounded-2xl border ${
                    isRec
                      ? 'bg-slate-900/90 border-blue-500/30'
                      : 'bg-white border-slate-200/90'
                  }`}
                >
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Valor Mensual
                  </div>
                  <div className={`text-xl font-black font-mono mt-0.5 whitespace-nowrap ${isRec ? 'text-white' : 'text-slate-900'}`}>
                    {plan.price}
                  </div>
                  {plan.competitorNote && (
                    <div className={`text-[11px] mt-0.5 font-semibold ${isRec ? 'text-amber-300' : 'text-slate-500'}`}>
                      {plan.competitorNote}
                    </div>
                  )}
                  <div className="mt-2 pt-2 border-t border-slate-200/20 flex items-center justify-between text-xs">
                    <span className={isRec ? 'text-slate-300' : 'text-slate-600'}>Activación inicial:</span>
                    <span className="font-black text-emerald-500">{plan.activationText}</span>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-2 pt-1">
                  <div className={`text-xs font-extrabold uppercase tracking-wider ${isRec ? 'text-white' : 'text-slate-900'}`}>
                    ¿Qué incluye?
                  </div>
                  {plan.includesHeader && (
                    <p className={`text-xs font-bold ${isRec ? 'text-cyan-300' : 'text-[#0052fe]'}`}>
                      {plan.includesHeader}
                    </p>
                  )}
                  <ul className="space-y-2 text-xs">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            isRec ? 'text-cyan-400' : 'text-emerald-600'
                          }`}
                        />
                        <span className={isRec ? 'text-slate-200 leading-snug' : 'text-slate-700 leading-snug'}>
                          {feat}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 space-y-2">
                {onSelectPlan && (
                  <button
                    type="button"
                    onClick={() => onSelectPlan(plan)}
                    className={`w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                      isRec
                        ? 'bg-[#0052fe] hover:bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <span>Elegir {plan.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <a
                  href={`https://wa.me/56957950579?text=${whatsappPlanMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-2 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                    isRec
                      ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Activar Gratis por WhatsApp</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
