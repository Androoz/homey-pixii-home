'use strict';

const STATUS = {
  0: { en: ['Undefined', 'No valid status has been reported'], sv: ['Odefinierad', 'Ingen giltig status har rapporterats'] },
  1: { en: ['Normal', 'No registered issues'], sv: ['Normal', 'Inga registrerade problem'] },
  2: { en: ['Normal', 'Information event; operation is normal'], sv: ['Normal', 'Informationshändelse; driften är normal'] },
  3: { en: ['Warning', 'Operating with anomalies'], sv: ['Varning', 'Systemet är i drift men har avvikelser'] },
  4: { en: ['Alarm', 'The system is not operating normally'], sv: ['Larm', 'Systemet fungerar inte normalt'] },
  5: { en: ['Disabled', 'The system is disabled'], sv: ['Inaktiverad', 'Systemet är inaktiverat'] },
  6: { en: ['Disconnected', 'The system or a component is disconnected'], sv: ['Frånkopplad', 'Systemet eller en komponent är frånkopplad'] },
  7: { en: ['Active injection', 'Grid converters are performing active injection'], sv: ['Aktiv injicering', 'Nätomriktarna utför aktiv injicering'] },
  8: { en: ['Derated', 'Converter output is limited'], sv: ['Effektbegränsad', 'Omriktarnas effekt är begränsad'] }
};

const SERVICES = {
  0: { en: ['Idle', 'No service is running'], sv: ['Viloläge', 'Ingen tjänst körs'] },
  101: { en: ['Scheduler', 'A scheduled service is running'], sv: ['Schemaläggare', 'En schemalagd tjänst körs'] },
  102: { en: ['Demand response', 'Active power is controlled by demand response'], sv: ['Demand response', 'Aktiv effekt styrs av demand response'] },
  104: { en: ['Fixed peak shaving', 'Fixed charging and discharging limits'], sv: ['Fast effekttoppskapning', 'Fasta gränser för laddning och urladdning'] },
  105: { en: ['Adaptive peak shaving', 'Adaptive charging and discharging limits'], sv: ['Adaptiv effekttoppskapning', 'Adaptiva gränser för laddning och urladdning'] },
  107: { en: ['Target SoC', 'Charging or discharging towards a target energy level'], sv: ['Mål-SoC', 'Laddar eller urladdar mot en angiven energinivå'] },
  110: { en: ['Voltage support', 'Autonomous voltage support is active'], sv: ['Spänningsstöd', 'Autonomt spänningsstöd är aktivt'] },
  111: { en: ['FFR', 'Fast frequency reserve is active'], sv: ['FFR', 'Snabb frekvensreserv är aktiv'] },
  115: { en: ['Off-grid mode', 'The converters are operating off-grid'], sv: ['Ö-drift', 'Omriktarna körs frikopplade från nätet'] },
  116: { en: ['Battery calibration', 'Battery SoC calibration is running'], sv: ['Batterikalibrering', 'Kalibrering av batteriets SoC pågår'] },
  117: { en: ['Ripple control', 'Operation is overridden by ripple control'], sv: ['Rundstyrning', 'Driften styrs över av rundstyrning'] },
  118: { en: ['DRM mode', 'Operation is overridden by the DRM interface'], sv: ['DRM-läge', 'Driften styrs över av DRM-gränssnittet'] },
  119: { en: ['Power control', 'Active and reactive power control'], sv: ['Effektstyrning', 'Styrning av aktiv och reaktiv effekt'] },
  121: { en: ['Frequency service 1', 'Autonomous frequency regulation'], sv: ['Frekvenstjänst 1', 'Autonom frekvensreglering'] },
  122: { en: ['Frequency service 2', 'Autonomous frequency regulation'], sv: ['Frekvenstjänst 2', 'Autonom frekvensreglering'] },
  123: { en: ['Frequency service 3', 'Autonomous frequency regulation'], sv: ['Frekvenstjänst 3', 'Autonom frekvensreglering'] },
  124: { en: ['Frequency service 4', 'Autonomous frequency regulation'], sv: ['Frekvenstjänst 4', 'Autonom frekvensreglering'] },
  125: { en: ['Frequency service 5', 'Autonomous frequency regulation'], sv: ['Frekvenstjänst 5', 'Autonom frekvensreglering'] },
  126: { en: ['Frequency service 6', 'Autonomous frequency regulation'], sv: ['Frekvenstjänst 6', 'Autonom frekvensreglering'] },
  127: { en: ['Frequency service 7', 'Autonomous frequency regulation'], sv: ['Frekvenstjänst 7', 'Autonom frekvensreglering'] },
  128: { en: ['Frequency service 8', 'Autonomous frequency regulation'], sv: ['Frekvenstjänst 8', 'Autonom frekvensreglering'] },
  129: { en: ['3-phase power control', 'Per-phase active and reactive power control'], sv: ['3-fas effektstyrning', 'Styrning av aktiv och reaktiv effekt per fas'] }
};

// Pixii MQTT guide, Table 7: System events (sys_events bitfield).
const SYSTEM_EVENTS = {
  0: { en: 'Battery alarm', sv: 'Batterilarm' },
  1: { en: 'Converter alarm', sv: 'Omriktarlarm' },
  2: { en: 'Smoke alarm', sv: 'Röklarm' },
  3: { en: 'Earth fault', sv: 'Jordfel' },
  4: { en: 'Door alarm', sv: 'Dörrlarm' },
  5: { en: 'Fan speed alarm', sv: 'Fläktvarningslarm' },
  6: { en: 'Emergency switch active', sv: 'Nödstopp aktivt' },
  7: { en: 'AC fuse alarm', sv: 'Larm för AC-säkring' },
  8: { en: 'Overvoltage protection alarm', sv: 'Överspänningsskyddslarm' },
  9: { en: 'Heater fuse alarm', sv: 'Larm för värmarsäkring' },
  10: { en: 'Battery temperature alarm', sv: 'Batteritemperaturlarm' },
  11: { en: 'External shutdown active', sv: 'Extern avstängning aktiv' },
  12: { en: 'Battery vapour alarm', sv: 'Batteriånglarm' },
  13: { en: 'Air conditioner alarm', sv: 'Klimatanläggningslarm' },
  16: { en: 'Battery calibration recommended', sv: 'Batterikalibrering rekommenderas' },
  18: { en: 'Battery power limited', sv: 'Batterieffekten är begränsad' },
  19: { en: 'Converter power limited', sv: 'Omriktareffekt begränsad' },
  20: { en: 'Converters unavailable', sv: 'Omriktare otillgängliga' },
  21: { en: 'Grid code trip', sv: 'Frånkoppling enligt nätkod' },
  22: { en: 'Minimum SoC reached', sv: 'Lägsta SoC uppnådd' },
  23: { en: 'Maximum SoC reached', sv: 'Högsta SoC uppnådd' },
  24: { en: 'Battery current limited', sv: 'Batteriström begränsad' },
  25: { en: 'Cabinet door open', sv: 'Skåpdörr öppen' },
  26: { en: 'Battery voltage low', sv: 'Låg batterispänning' },
  27: { en: 'Battery modules missing', sv: 'Batterimoduler saknas' },
  28: { en: 'Battery fuse tripped', sv: 'Batterisäkring utlöst' },
  29: { en: 'Converter modules missing', sv: 'Omriktarmoduler saknas' },
  30: { en: 'DC contactor disconnected', sv: 'DC-kontaktor frånkopplad' }
};

function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value)));
}

function calculateDisplayedSoc(payload, options = {}) {
  const raw = Number(payload.batt_soc);
  const usable = Number(payload.batt_soc_usable);
  if (!Number.isFinite(raw) && !Number.isFinite(usable)) return null;
  if (options.scaleToUsable === false) return clampPercent(raw);

  let min;
  let max;
  if (options.useCustomLimits === true) {
    min = Number(options.customMin);
    max = Number(options.customMax);
  } else {
    min = Number(payload.batt_cfg_soc_min ?? payload.batt_soc_min);
    max = Number(payload.batt_cfg_soc_max ?? payload.batt_soc_max);
  }

  if (Number.isFinite(raw) && Number.isFinite(min) && Number.isFinite(max) && max > min) {
    return clampPercent(((raw - min) / (max - min)) * 100);
  }
  if (Number.isFinite(usable)) return clampPercent(usable);
  return clampPercent(raw);
}

function enumInfo(table, code, language = 'en') {
  const numericCode = Number(code);
  const item = table[numericCode];
  if (!item) {
    const title = language === 'sv' ? 'Okänd' : 'Unknown';
    const description = language === 'sv' ? 'Koden finns inte i den dokumenterade tabellen' : 'The code is not in the documented table';
    return { code: numericCode, title, description, details: `${numericCode} — ${description}` };
  }
  const [name, description] = item[language === 'sv' ? 'sv' : 'en'];
  return { code: numericCode, title: name, description, details: `${numericCode} — ${description}` };
}

const getSystemStatusInfo = (code, language) => enumInfo(STATUS, code, language);
const getServiceInfo = (code, language) => enumInfo(SERVICES, code, language);

function getSystemEventsText(value, language = 'en') {
  const bitfield = Number(value);
  if (!Number.isFinite(bitfield) || bitfield < 0) return language === 'sv' ? 'Okänd' : 'Unknown';
  if (bitfield === 0) return language === 'sv' ? 'Inga aktiva händelser' : 'No active events';

  const events = [];
  for (let bit = 0; bit <= 30; bit += 1) {
    if (Math.floor(bitfield / (2 ** bit)) % 2 !== 1) continue;
    const event = SYSTEM_EVENTS[bit];
    events.push(event
      ? event[language === 'sv' ? 'sv' : 'en']
      : `${language === 'sv' ? 'Okänd händelse' : 'Unknown event'} (${bit})`);
  }
  return events.join(', ');
}

module.exports = { calculateDisplayedSoc, getSystemStatusInfo, getServiceInfo, getSystemEventsText };
