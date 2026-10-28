export function formatShiftNotification(message: string, now = new Date()) {
  const time = new Intl.DateTimeFormat("es-PE", {
    hour: "numeric",
    minute: "2-digit",
  }).format(now);
  if (message === "Jornada pausada.") {
    return `Pausaste tu jornada a las ${time}.`;
  }
  if (message === "Jornada reanudada.") {
    return `Reanudaste tu jornada a las ${time}.`;
  }
  return message;
}
