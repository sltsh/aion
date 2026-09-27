const metres = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatHeight = (level: number): string => `${metres.format(level)} m`;

export const formatTime = (time: Date): string =>
  time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
