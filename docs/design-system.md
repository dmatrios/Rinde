# Sistema visual inicial

Dirección: herramienta financiera cotidiana, ligera y legible. Fondo gris claro,
superficies blancas y tinta azul oscuro. Naranja quemado como acento de acción;
sin gradientes ni fotografías decorativas. Los colores viven en `globals.css`.

| Token            | Valor   | Uso                                        |
| ---------------- | ------- | ------------------------------------------ |
| background       | #f7f8fa | Fondo de la app                            |
| card             | #ffffff | Superficies                                |
| foreground       | #202a3a | Texto principal                            |
| primary          | #cc481c | Acción principal, foco y navegación activa |
| muted foreground | #626a76 | Ayudas y metadatos                         |
| border           | #e6e8ec | Separación discreta                        |
| panel destacado  | #202d3d | Resumen financiero                         |

Tipografía de sistema sin descargar fuentes: Arial/Helvetica/sans-serif.
Importes con números tabulares; título de página 29–34 px; texto principal
14–16 px. Los textos auxiliares no sustituyen etiquetas o instrucciones
esenciales. Botones/campos de 44–52 px de alto, foco visible y etiquetas accesibles.

Espaciado basado en 4 px, tarjetas con radio de 16 px y controles de 12 px.
Navegación inferior fija bajo 1024 px; sidebar desde 1024 px. Área segura para
teléfonos y margen inferior suficiente para que la navegación no tape contenido.

Estado activo mediante icono, texto y fondo; no sólo color. Errores con `alert`,
confirmaciones con `status`, `aria-busy` y botones pendientes deshabilitados.
Enlace para saltar al contenido. Se respeta `prefers-reduced-motion`.

Los valores `—` significan ausencia de registros, no una ganancia real de cero.
Las secciones futuras explican su disponibilidad; no guardan datos ficticios.
La vista previa está identificada y separada de la cuenta privada. El acceso real
permanece protegido aun cuando falten credenciales.
