import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import {
  FileText,
  PackageSearch,
  MessageSquareOff,
  BrainCircuit,
  NotebookPen,
  CalendarClock,
  QrCode,
  WifiOff,
  PenLine,
  EyeOff,
  Check,
} from "lucide-react";
import { LandingFigure } from "@/components/landing/landing-figure";
import { WhatsappCta } from "@/components/landing/whatsapp-cta";

/**
 * Página pública en la raíz del sitio (fixtrackpro.com). La sirve
 * proxy.ts mediante una reescritura interna cuando llega alguien SIN
 * cookie de sesión; un usuario con sesión sigue yendo al tablero sin
 * pasar por acá. Vive fuera de (dashboard) — como /app — así que no hay
 * candado de sesión y no se llama a getSession() en ningún punto.
 *
 * El orden de las secciones está pensado para llevar a un lector
 * escéptico —un dueño de empresa técnica— hasta el final: primero se
 * reconoce en el problema, después ve cómo se resuelve. No reordenar por
 * criterio estético.
 */

const SITE_URL = "https://fixtrackpro.com";
const OG_DESCRIPTION =
  "El software con el que las empresas de mantenimiento técnico dejan de perder órdenes, informes y cartera.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "FixTrack Pro — El historial de cada equipo, pegado al equipo",
  description:
    "El software con el que las empresas de mantenimiento técnico dejan de perder órdenes en papel, inventario en Excel e informes por WhatsApp. Etiqueta QR por equipo, firma en sitio y trabajo sin señal.",
  applicationName: "FixTrack Pro",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/`,
    siteName: "FixTrack Pro",
    locale: "es_CO",
    title: "El historial de cada equipo, pegado al equipo",
    description: OG_DESCRIPTION,
    images: [
      {
        url: "/landing/og.png",
        width: 1200,
        height: 630,
        alt: "FixTrack Pro",
      },
      { url: "/landing/hero.png", alt: "FixTrack Pro" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "El historial de cada equipo, pegado al equipo",
    description: OG_DESCRIPTION,
    images: ["/landing/og.png"],
  },
};

/* -------------------------------------------------------------------------- */
/*  Bloques reutilizables                                                     */
/* -------------------------------------------------------------------------- */

function Section({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`w-full px-4 py-14 sm:py-20 ${className}`}>
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </section>
  );
}

function SectionHeading({
  overline,
  title,
  lead,
}: {
  overline?: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {overline ? (
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">
          {overline}
        </p>
      ) : null}
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {lead ? (
        <p className="mt-3 text-base text-muted-foreground">{lead}</p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  a) Encabezado                                                             */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <header className="w-full px-4 pt-10 pb-14 sm:pt-16 sm:pb-20">
      <div className="mx-auto w-full max-w-5xl">
        {/* El enlace a /login es una red de seguridad: si un usuario que ya
            conoce el sistema cae acá por error (marca de dispositivo
            borrada, un navegador embebido no reconocido), tiene por dónde
            salir. El prospecto lo ignora — su ruta es el botón de WhatsApp. */}
        <div className="flex items-center justify-between gap-4">
          <Image
            src="/brand/logo-sm.png"
            alt="FixTrack Pro"
            width={190}
            height={44}
            priority
            unoptimized
          />
          <a
            href="/login"
            className="shrink-0 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Iniciar sesión
          </a>
        </div>

        <div className="mt-10 grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
              El historial de cada equipo, pegado al equipo.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              FixTrack Pro es el software con el que una empresa de
              mantenimiento técnico deja de perder órdenes, informes y cartera.
              Cada equipo lleva su etiqueta; cada visita queda registrada, firmada
              y cobrada.
            </p>
            <div className="mt-8">
              <WhatsappCta size="lg">Ver una demostración</WhatsappCta>
              <p className="mt-3 text-sm text-muted-foreground">
                Sin formularios. Se agenda por WhatsApp.
              </p>
            </div>
          </div>

          <LandingFigure
            src="/landing/hero.png"
            alt="FixTrack Pro en el celular de un técnico, mostrando una orden de trabajo"
            ratio="4 / 3"
            priority
            sizes="(min-width: 1024px) 480px, 100vw"
          />
        </div>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*  b) El dolor                                                               */
/* -------------------------------------------------------------------------- */

const PAINS = [
  {
    icon: FileText,
    title: "La orden en papel que se pierde",
    body: "El talonario que se moja en el sitio, se queda en la camioneta o nunca llega a la oficina. Sin ese papel, la visita no existió.",
  },
  {
    icon: PackageSearch,
    title: "El inventario en Excel que nunca cuadra",
    body: "Un archivo que alguien actualiza cuando se acuerda. El repuesto figura en existencia hasta que el técnico llega y no está.",
  },
  {
    icon: MessageSquareOff,
    title: "El informe por WhatsApp, sin firma ni respaldo",
    body: "Una foto y un audio en un chat. Si el cliente reclama, no hay un documento con fecha, hallazgo y firma que respalde el trabajo.",
  },
  {
    icon: BrainCircuit,
    title: "La memoria del técnico como único registro",
    body: "Qué se le hizo a ese equipo la última vez lo sabe una sola persona. El día que no está, se empieza de cero.",
  },
  {
    icon: NotebookPen,
    title: "La cartera en una libreta",
    body: "Quién debe, cuánto y desde cuándo vive en una hoja aparte. Cobrar depende de que alguien se siente a cruzar cuentas.",
  },
  {
    icon: CalendarClock,
    title: "El mantenimiento preventivo que se pasó",
    body: "El contrato decía cada tres meses. Nadie avisó, nadie lo programó, y el cliente lo nota antes que usted.",
  },
];

function Pain() {
  return (
    <Section className="bg-card">
      <SectionHeading
        overline="El problema"
        title="Lo que hoy se le está perdiendo"
        lead="Antes de hablar de funciones: esto es lo que pasa cuando el registro del trabajo depende de papel, chats y memoria."
      />
      <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PAINS.map(({ icon: Icon, title, body }) => (
          <li
            key={title}
            className="rounded-xl border border-border bg-background p-6"
          >
            <Icon className="size-6 text-primary" aria-hidden />
            <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  c) Cómo funciona — cinco pasos                                            */
/* -------------------------------------------------------------------------- */

/**
 * `ratio` por paso: el bucle mezcla capturas verticales (de celular) con
 * capturas apaisadas (de escritorio). Cada una lleva la proporción de su
 * orientación para que `object-contain` deje el mínimo de franja blanca.
 * Si mañana se reemplaza una imagen por otra de forma distinta, ajustar
 * este valor — nunca vuelve a recortarse, solo cambia el marco.
 */
const STEPS = [
  {
    img: "/landing/paso-1-escanear.png",
    ratio: "9 / 16",
    alt: "Un técnico escanea la etiqueta QR de un equipo con el celular",
    title: "Escanear la etiqueta",
    body: "El técnico llega al sitio y escanea el QR del equipo. En pantalla aparece su ficha y todo lo que se le ha hecho antes.",
  },
  {
    img: "/landing/paso-2-orden.png",
    ratio: "3 / 2",
    alt: "Formulario de una orden de trabajo en el celular",
    title: "Levantar la orden",
    body: "Registra el hallazgo, el trabajo realizado y los repuestos usados. El inventario se descuenta solo.",
  },
  {
    img: "/landing/paso-3-firma.png",
    ratio: "9 / 16",
    alt: "El cliente firma la orden en la pantalla del celular",
    title: "El cliente firma",
    body: "El cliente revisa y firma en la pantalla, ahí mismo. Queda su nombre, la fecha y la hora.",
  },
  {
    img: "/landing/paso-4-informe.png",
    ratio: "3 / 2",
    alt: "Informe técnico en PDF generado por el sistema",
    title: "Sale el informe",
    body: "El sistema arma el informe técnico con firma institucional y lo envía. Sin volver a la oficina a transcribir nada.",
  },
  {
    img: "/landing/paso-5-cobro.png",
    ratio: "3 / 2",
    alt: "Cuenta de cobro generada a partir de la orden",
    title: "Queda el cobro",
    body: "La orden alimenta la cuenta de cobro y la cartera del cliente. Lo que se hizo y lo que se debe quedan atados.",
  },
];

function HowItWorks() {
  return (
    <Section>
      <SectionHeading
        overline="Cómo funciona"
        title="De la etiqueta al cobro, en cinco pasos"
      />
      <ol className="mt-12 flex flex-col gap-12">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="grid items-center gap-6 sm:grid-cols-2"
          >
            <div className={i % 2 === 1 ? "sm:order-2" : ""}>
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {i + 1}
              </span>
              <h3 className="mt-3 text-xl font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-muted-foreground">{step.body}</p>
            </div>
            <LandingFigure
              src={step.img}
              alt={step.alt}
              ratio={step.ratio}
              className={i % 2 === 1 ? "sm:order-1" : ""}
              sizes="(min-width: 640px) 420px, 100vw"
            />
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  d) Lo que nadie más ofrece — cuatro bloques                               */
/* -------------------------------------------------------------------------- */

function Differentiators() {
  return (
    <Section className="bg-card">
      <SectionHeading
        overline="Lo que nadie más ofrece"
        title="Cuatro cosas que un software genérico no le da"
      />

      <div className="mt-12 flex flex-col gap-6">
        {/* 1. Etiqueta QR por equipo */}
        <div className="grid items-center gap-6 rounded-2xl border border-border bg-background p-6 sm:p-8 md:grid-cols-2">
          <div>
            <QrCode className="size-7 text-primary" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold text-foreground">
              Una etiqueta QR por equipo
            </h3>
            <p className="mt-2 text-muted-foreground">
              Cada equipo del cliente lleva su etiqueta física. Se escanea y ahí
              está toda su historia: qué falló, qué se le cambió, quién fue y
              cuándo toca la próxima. El historial deja de vivir en la cabeza de
              un técnico y pasa a vivir en el equipo.
            </p>
          </div>
          <LandingFigure
            src="/landing/etiqueta-qr.png"
            alt="Etiqueta QR pegada a un equipo, lista para escanear"
            ratio="16 / 10"
            sizes="(min-width: 768px) 420px, 100vw"
          />
        </div>

        {/* 2. Trabajo sin señal */}
        <div className="grid items-center gap-6 rounded-2xl border border-border bg-background p-6 sm:p-8 md:grid-cols-2">
          <LandingFigure
            src="/landing/sin-senal.png"
            alt="La aplicación funcionando sin conexión, con un aviso de sin señal"
            ratio="9 / 16"
            className="md:order-2"
            sizes="(min-width: 768px) 420px, 100vw"
          />
          <div className="md:order-1">
            <WifiOff className="size-7 text-primary" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold text-foreground">
              Trabaja sin señal
            </h3>
            <p className="mt-2 text-muted-foreground">
              Cuartos de máquinas, sótanos, fincas. El técnico abre la orden,
              escribe el hallazgo, registra repuestos y toma la firma sin una
              barra de señal. Cuando vuelve la conexión, todo se sincroniza solo,
              en orden y sin duplicados.
            </p>
          </div>
        </div>

        {/* 3. Firma en sitio */}
        <div className="grid items-center gap-6 rounded-2xl border border-border bg-background p-6 sm:p-8 md:grid-cols-2">
          <div>
            <PenLine className="size-7 text-primary" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold text-foreground">
              Firma del cliente en el sitio
            </h3>
            <p className="mt-2 text-muted-foreground">
              El cliente firma en la pantalla antes de que el técnico se vaya.
              Esa firma queda estampada en el informe, con fecha y hora. Si más
              adelante hay un reclamo, existe un documento que respalda lo que se
              hizo y que el cliente aceptó.
            </p>
          </div>
          <LandingFigure
            src="/landing/paso-3-firma.png"
            alt="El cliente firmando la orden en la pantalla"
            ratio="9 / 16"
            sizes="(min-width: 768px) 420px, 100vw"
          />
        </div>

        {/* 4. El técnico nunca ve precios ni cartera */}
        <div className="rounded-2xl border border-border bg-background p-6 sm:p-8">
          <div className="mx-auto max-w-2xl">
            <EyeOff className="size-7 text-primary" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold text-foreground">
              El técnico nunca ve precios ni cartera
            </h3>
            <p className="mt-2 text-muted-foreground">
              La misma orden, vista por dos roles. El técnico registra el
              trabajo; los valores, los márgenes y la deuda del cliente
              simplemente no aparecen en su pantalla. Lo controla el rol, no la
              buena voluntad.
            </p>
          </div>
          {/* Las capturas son apaisadas: lado a lado en pantalla grande, pero
              APILADAS en celular. Forzadas a dos columnas en un teléfono
              quedaban diminutas y no se leía si hay o no valores — que es
              justo lo que la comparación tiene que mostrar. */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <figure>
              <LandingFigure
                src="/landing/roles-admin.png"
                alt="La orden vista por un administrador, con valores y totales"
                ratio="3 / 2"
                sizes="(min-width: 640px) 320px, 100vw"
              />
              <figcaption className="mt-2 text-center text-xs font-medium text-muted-foreground">
                Como la ve el administrador — con valores
              </figcaption>
            </figure>
            <figure>
              <LandingFigure
                src="/landing/roles-tecnico.png"
                alt="La misma orden vista por el técnico, sin ningún valor"
                ratio="3 / 2"
                sizes="(min-width: 640px) 320px, 100vw"
              />
              <figcaption className="mt-2 text-center text-xs font-medium text-muted-foreground">
                Como la ve el técnico — sin valores
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  e) El resto de funciones, en letra menuda                                 */
/* -------------------------------------------------------------------------- */

const MORE_FEATURES = [
  ["Cotizaciones", "con metodología, observaciones y su documento para el cliente."],
  ["Inventario", "por repuesto, con descuento automático al usarlo en una orden."],
  ["Mantenimiento preventivo", "programado por equipo, con aviso de lo que se vence."],
  ["Cuenta de cobro", "generada desde las órdenes, sin volver a digitar."],
  ["Retenciones", "aplicadas en el cálculo, no a mano en una calculadora aparte."],
  ["Rentabilidad", "por orden y por cliente: qué deja cada trabajo, no solo cuánto factura."],
  ["Bitácora de auditoría", "quién hizo qué y cuándo, sobre cada registro."],
];

function MoreFeatures() {
  return (
    <Section>
      <SectionHeading title="Y además, lo que se espera de un sistema serio" />
      <dl className="mx-auto mt-10 grid max-w-3xl gap-x-8 gap-y-4 sm:grid-cols-2">
        {MORE_FEATURES.map(([term, def]) => (
          <div key={term} className="flex gap-2.5 text-sm">
            <Check
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden
            />
            <div>
              <dt className="inline font-semibold text-foreground">{term} </dt>
              <dd className="inline text-muted-foreground">{def}</dd>
            </div>
          </div>
        ))}
      </dl>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  f) Prueba social                                                          */
/* -------------------------------------------------------------------------- */

function SocialProof() {
  return (
    <Section className="bg-primary text-primary-foreground">
      <figure className="mx-auto max-w-3xl text-center">
        <blockquote className="text-xl font-semibold sm:text-2xl">
          “Esto no es un producto que armamos para vender. Es el sistema con el
          que trabajamos todos los días.”
        </blockquote>
        <figcaption className="mt-6 text-sm text-primary-foreground/80">
          TAELCO Systems opera con FixTrack Pro en producción — con órdenes
          reales y cuentas de cobro emitidas.
        </figcaption>
      </figure>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  g) Cómo se cobra — sin cifras                                             */
/* -------------------------------------------------------------------------- */

function Pricing() {
  return (
    <Section className="bg-card">
      <SectionHeading overline="Cómo se cobra" title="Un valor por empresa, no por función suelta" />
      <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-3">
        {[
          {
            title: "Se paga por empresa",
            body: "Según el tamaño del equipo técnico. No se cobra por módulo ni por documento emitido.",
          },
          {
            title: "La puesta en marcha va acompañada",
            body: "Carga de sus clientes y equipos, primer lote de etiquetas y capacitación al equipo.",
          },
          {
            title: "El valor se define en la demostración",
            body: "Cuando ya se vio funcionando con un caso parecido al suyo, se habla de números.",
          },
        ].map(({ title, body }) => (
          <div
            key={title}
            className="rounded-xl border border-border bg-background p-6"
          >
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  h) Preguntas frecuentes                                                   */
/* -------------------------------------------------------------------------- */

const FAQ = [
  {
    q: "¿Mis datos están seguros y separados de los de otras empresas?",
    a: "Sí. Cada empresa es un espacio aislado: los usuarios de una compañía no pueden ver ni consultar datos de otra, y cada petición al servidor se valida contra la empresa dueña del registro. Las contraseñas se guardan cifradas y el acceso va sobre HTTPS.",
  },
  {
    q: "Si dejo de pagar, ¿pierdo mi información?",
    a: "No se borra nada de un día para otro. Si decide no continuar, le entregamos una exportación de sus órdenes, clientes, equipos y cuentas de cobro en un formato que puede abrir y conservar. Sus datos son suyos.",
  },
  {
    q: "¿Cuánto demora ponerlo a andar?",
    a: "Depende de en qué estado estén sus datos hoy. Con la información de clientes y equipos ordenada, se puede estar operando en una a dos semanas: nosotros hacemos la carga inicial, imprimimos el primer lote de etiquetas y capacitamos al equipo. No es un “créelo usted desde cero”.",
  },
  {
    q: "¿Sirve si mis técnicos no son buenos con la tecnología?",
    a: "Está hecho para eso. El técnico escanea una etiqueta, llena una orden con campos claros y pasa el celular para la firma. No hay menús escondidos ni configuración. Si sabe usar WhatsApp, sabe usar esto.",
  },
  {
    q: "¿Qué pasa si en el sitio no hay señal?",
    a: "Sigue trabajando igual. La orden, las notas, los repuestos y la firma se guardan en el celular y se sincronizan cuando vuelve la conexión, sin duplicar nada. El técnico no tiene que acordarse de “volver a mandarlo” después.",
  },
  {
    q: "¿Puedo usar mi propio formato de informe?",
    a: "El informe sale con una estructura estándar —hallazgo, trabajo realizado, repuestos, firma del cliente y firma institucional— y con el logo de su empresa. No replicamos cualquier plantilla de Word existente; si su formato actual tiene algo puntual que necesita, se revisa en la demostración.",
  },
];

function Faq() {
  return (
    <Section>
      <SectionHeading overline="Preguntas frecuentes" title="Lo que se pregunta antes de decidir" />
      <div className="mx-auto mt-10 max-w-3xl divide-y divide-border border-y border-border">
        {FAQ.map(({ q, a }) => (
          <details key={q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-foreground">
              {q}
              <span
                className="shrink-0 text-primary transition-transform group-open:rotate-45"
                aria-hidden
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  i) Cierre                                                                 */
/* -------------------------------------------------------------------------- */

function Closing() {
  return (
    <Section className="bg-card">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Véalo con un caso parecido al suyo
        </h2>
        <p className="mt-3 text-muted-foreground">
          Una demostración corta, sobre datos reales de operación. Después
          hablamos de números.
        </p>
        <div className="mt-8 flex justify-center">
          <WhatsappCta size="lg">Ver una demostración por WhatsApp</WhatsappCta>
        </div>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */

export default function LandingPage() {
  return (
    <main className="flex flex-col bg-background text-foreground">
      <Hero />
      <Pain />
      <HowItWorks />
      <Differentiators />
      <MoreFeatures />
      <SocialProof />
      <Pricing />
      <Faq />
      <Closing />
      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
        FixTrack Pro · Software de gestión para empresas de mantenimiento técnico
      </footer>
    </main>
  );
}
