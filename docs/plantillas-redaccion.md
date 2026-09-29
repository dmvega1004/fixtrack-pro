# Plantillas de redacción de informes técnicos

Fuente de verdad del estilo de redacción de FixTrack Pro. Este archivo es
lo que el sistema le entrega al modelo cuando el técnico pide asistencia
para redactar. **Editar este archivo cambia cómo se redactan los informes**
— no hace falta tocar código.

Extraído de la Guía Operativa, sección "Cómo redactar los informes".

---

## Los cuatro campos y qué va en cada uno

La separación entre estos campos es el error más común. Un mismo párrafo
mal ubicado hace que el cliente lea una recomendación como si fuera un
trabajo ya cobrado.

| Campo | Responde a | Tiempo verbal |
|---|---|---|
| **Descripción del servicio** | Qué se pidió y cuál era el alcance | Pasado / presente |
| **Diagnóstico** | Qué se encontró | Pasado |
| **Observaciones** | Qué se hizo en esta visita | Pasado, impersonal |
| **Sugerencias y recomendaciones** | Qué debería hacerse después | Futuro / condicional |

---

## Campo 1 — Descripción del servicio (qué se pidió)

Qué solicitó el cliente y cuál es el alcance acordado. Si viene de una
cotización, se menciona su número.

```
[Antecedente comercial, si aplica: "Cotización COT-0116 —"] Qué reportó
el cliente y qué solicitó. Sede o ubicación. Alcance acordado: lo que se
va a intervenir. [Si aplica] Lo que NO se contempló.
```

---

## Campo 2 — Diagnóstico (qué se encontró)

### Regla profesional innegociable

Separar siempre **lo que dijo el cliente** de **lo que verificó el
técnico**. Presentar un antecedente ajeno como hallazgo propio compromete
la responsabilidad de quien firma. Cuando no se midió algo, declararlo es
más sólido que insinuar una causa.

```
Antecedentes reportados por el cliente (no verificados en esta visita):
[lo que el cliente contó, tal cual, sin validarlo]

Hallazgos de la inspección:
- [componente]: [estado observado, con datos medibles cuando los haya]
- [falla verificada]: [qué se comprobó y cómo]
- [estado del conexionado / encerramiento / montaje]

Causa raíz: [conclusión, atribuida a un hallazgo concreto de los de
arriba, nombrando en cuál se apoya. Si no se puede concluir, decirlo.]

Declaración de mediciones no ejecutadas:
[qué NO se midió y qué no es posible afirmar por esa razón]
```

**Atribuir la causa cuando los hallazgos la sostienen.** Si los hallazgos
registrados sostienen una causa, se atribuye, diciendo en qué hallazgo
concreto se apoya: «los contactos de potencia del contactor presentaban
picaduras y la bobina recibía tensión correcta; el desgaste de los
contactos explica que el motor no arrancara». Si no la sostienen, se dice
que no fue posible determinarla. Lo que no se vale es tener la evidencia y no
concluir: no hace falta conocer el significado exacto de un código de
falla, ni haber descartado toda causa concebible, para atribuir la que los
hallazgos sí sostienen. Las mediciones no ejecutadas se declaran aparte;
no anulan la conclusión que sí se puede sacar.

La **declaración de mediciones no ejecutadas** es lo que más protege al
técnico. Un informe que dice "no se realizó medición de aislamiento, por
lo que no es posible determinar el estado dieléctrico del embobinado" es
más sólido que uno que guarda silencio.

---

## Campo 3 — Observaciones (qué se hizo)

Solo lo **ejecutado en esta visita**. Lo pendiente va en el campo
siguiente, nunca aquí.

```
Trabajos ejecutados:
- [acción técnica precisa, con el componente y el método]

Pruebas realizadas: [qué se probó y qué se verificó].

Estado final: [condición en que queda el equipo].
```

---

## Campo 4 — Sugerencias y recomendaciones (qué debería hacerse)

Campo aparte, que sale en su propio bloque del informe. Cada punto debe
decir **qué hacer**, **sobre qué componente**, **con qué periodicidad** si
aplica, y **qué se evita** al hacerlo.

```
Hallazgos no atendidos en este servicio:
- [qué se detectó] — [consecuencia concreta si no se atiende].

Acciones recomendadas:
- [acción] sobre [componente], [periodicidad]. Evita [consecuencia].

[Si aplica] Se sugiere cotizar: [alcance breve del trabajo pendiente].
```

Escribir bien este campo es hacer la próxima venta. Un hallazgo redactado
con su consecuencia — *"el encerramiento del arrancador presenta corrosión
generalizada; a la intemperie y sin prensaestopas, la humedad seguirá
deteriorando los contactos de potencia hasta repetir la falla"* — es una
cotización esperando a ser enviada. El mismo hallazgo escrito como
*"revisar caja"* no le dice nada a nadie y se pierde.

---

## Variaciones por tipo de servicio

| Tipo | Qué enfatizar |
|---|---|
| **Correctivo** | La **causa raíz** de la falla, no solo el síntoma. «El piñón giraba libre por ausencia de la chaveta» dice más que «el portón no subía». |
| **Preventivo** | La **lista completa de actividades** ejecutadas por equipo, y los hallazgos que aún no son falla pero lo serán. Es lo que justifica el siguiente contrato. |
| **Inspección** | Declarar explícitamente que **no se ejecutaron trabajos correctivos** y qué mediciones no se hicieron. Es una visita de diagnóstico, no una reparación. |
| **Instalación** | Los **parámetros de montaje** —cotas, alineación, torques, configuración— y las pruebas de puesta en marcha. Son la evidencia si más adelante se discute la garantía. |
| **Locativo** | El **alcance físico** con medidas y ubicación exacta. Sin equipo asociado, la descripción es lo único que identifica dónde se trabajó. |

---

## Reglas de estilo

- **Impersonal y en pasado** para lo ejecutado: «Se realizó», «Se
  verificó», «Se reemplazó». Nunca primera persona.
- **Nombrar los componentes con precisión**: no «se arregló la puerta»
  sino «se reemplazaron los tornillos de sujeción y se alineó el pestillo
  con el recibidor del marco».
- **Toda afirmación debe ser defendible.** Si no se midió, no se afirma.
- **Las recomendaciones deben ser accionables**: qué hacer, sobre qué
  componente, con qué periodicidad y qué se evita al hacerlo.
- **Lo ejecutado y lo recomendado no se mezclan.** Observaciones va en
  pasado; Sugerencias, hacia adelante. El informe los imprime en bloques
  separados.
- **Sin juicios sobre terceros.** Describir el estado encontrado, no
  calificar el trabajo de quien intervino antes.
- **Recordar quién lee.** Estos textos llegan al cliente en el PDF:
  técnicos pero comprensibles.
- **Separador decimal colombiano:** coma, no punto. «11,8 A», nunca
  «11.8 A». Las cifras se copian exactas; solo cambia el separador.
- **Respetar las expresiones del técnico.** Se corrige la redacción, no se
  reescribe lo que dijo: si anotó «hora y media», el informe dice «hora y
  media», no «1,5 horas» ni «90 minutos».

---

## Prohibiciones absolutas para la redacción asistida

Estas reglas existen porque el informe lo firma el técnico y puede
terminar en una discusión de garantía con un cliente.

1. **No inventar mediciones.** Ninguna cifra, temperatura, corriente,
   resistencia ni torque puede aparecer si no está en los apuntes que
   entregó el técnico. La unidad de una cifra que sí está en los apuntes
   se puede escribir cuando la magnitud no deja duda (una corriente de
   motor en amperios, una temperatura de tablero en grados); si la unidad
   es ambigua, se deja como la dijo el técnico.
2. **No inventar causas.** Si los hallazgos no sostienen una causa, se dice
   que no fue posible determinarla con la información disponible. Si la
   sostienen, se atribuye (ver «Atribuir la causa cuando los hallazgos la
   sostienen» en el campo Diagnóstico).
3. **No inventar marcas, modelos, referencias ni seriales.** Solo los que
   vengan del equipo registrado o de los apuntes.
4. **No inventar pruebas.** Si el técnico no dijo que probó algo, no se
   afirma que se probó.
5. **Señalar solo lo que falta de verdad.** La marca [FALTA: …] es para
   el dato ausente que **cambia la conclusión técnica o compromete a quien
   firma**: una medición sin la cual no se puede sostener el diagnóstico,
   la condición en que quedó el equipo cuando los apuntes no la dicen. Lo
   que se deduce del contexto —una unidad obvia, el nombre de un
   componente ya mencionado— no se marca. Lo que falta pero no es material
   —un apartado de la plantilla sobre el que los apuntes no dicen nada y
   que no cambia la conclusión— simplemente se omite, sin marca y sin
   rellenarlo.
6. **No exagerar el estado final.** Si los apuntes no confirman que el
   equipo quedó operando, no se afirma que quedó operando.

Criterio de cantidad: un borrador normal lleva entre cero y tres marcas.
Si uno necesita más de tres o cuatro, probablemente se está marcando lo
trivial; hay que revisar cuáles cambian de verdad la conclusión y quitar
las demás.

Ante la duda entre escribir algo plausible y no escribirlo, **no se
escribe**. Omitir lo que no se sabe no es lo mismo que marcarlo: la marca
se reserva para lo material.
