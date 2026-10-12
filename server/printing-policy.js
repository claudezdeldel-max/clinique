export const PRINT_TYPES = ['Compte rendu', 'Prescription', 'Quittance', 'Fiche patient', 'Ticket'];

export const defaultPrintRule = (enabled = false) => ({
  enabled, printers: null, documents: [...PRINT_TYPES], default_printer: '',
  max_copies: 10, color: true, duplex: true,
});

export const defaultPrintingConfig = () => ({
  printers: {},
  roles: {
    admin: defaultPrintRule(true),
    radiologist: { ...defaultPrintRule(true), documents: ['Compte rendu', 'Prescription', 'Fiche patient', 'Ticket'] },
    secretary: { ...defaultPrintRule(true), documents: ['Compte rendu', 'Quittance', 'Fiche patient', 'Ticket'] },
  },
  users: {},
});

// An explicit user rule replaces the role's printing rule; module/feature rights still apply.
export function effectivePrintRule(config, account) {
  const printing = config.printing || defaultPrintingConfig();
  return printing.users[String(account.id)] || printing.roles[account.role] || defaultPrintRule();
}

export function canPrintType(config, account, type) {
  if (!account?.active || !PRINT_TYPES.includes(type)) return false;
  const rule = effectivePrintRule(config, account);
  if (!rule.enabled || !rule.documents.includes(type)) return false;
  const modules = { 'Compte rendu': ['reports', 'ready_files'], Prescription: ['prescriptions'], Quittance: ['payments'], 'Fiche patient': ['patients'], Ticket: ['queue'] }[type];
  return modules.some(module => {
    if (['reports', 'ready_files', 'prescriptions'].includes(module) && !account.features?.[module]) return false;
    return account.role === 'admin' || config.permissions?.[account.role]?.[module]?.view !== false;
  });
}

export function assertPrintAccess(config, account, printer, type, options = {}) {
  if (!canPrintType(config, account, type)) throw Object.assign(new Error('L’impression de ce document est désactivée pour votre compte.'), { status: 403 });
  const rule = effectivePrintRule(config, account);
  if (!printer || config.printing?.printers[printer.name]?.enabled === false || (rule.printers !== null && !rule.printers.includes(printer.name))) {
    throw Object.assign(new Error('Vous n’avez pas accès à cette imprimante.'), { status: 403 });
  }
  if (!printer.managed) throw Object.assign(new Error('Ce pilote nécessite une application externe et ne permet pas l’impression contrôlée.'), { status: 409 });
  if (printer.offline) throw Object.assign(new Error('L’imprimante est signalée hors connexion par Windows.'), { status: 409 });
  const copies = options.copies ?? 1;
  if (!Number.isInteger(copies) || copies < 1 || copies > rule.max_copies || (printer.kind === 'pdf' && copies !== 1)) throw Object.assign(new Error(`Nombre de copies autorisé : 1 à ${printer.kind === 'pdf' ? 1 : rule.max_copies}.`), { status: 400 });
  if (typeof options.color !== 'boolean' || typeof options.duplex !== 'boolean') throw Object.assign(new Error('Options d’impression invalides.'), { status: 400 });
  if (options.color && (!rule.color || !printer.supports_color)) throw Object.assign(new Error('L’impression couleur n’est pas autorisée ou disponible.'), { status: 403 });
  if (options.duplex && (!rule.duplex || !printer.supports_duplex)) throw Object.assign(new Error('Le recto verso n’est pas autorisé ou disponible.'), { status: 403 });
  return rule;
}

export function validatePrintingConfig(value, roles, users) {
  const invalid = () => { throw new Error('Droits d’impression invalides.'); };
  const record = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  if (!record(value) || !record(value.printers) || !record(value.roles) || !record(value.users) || Object.keys(value).some(k => !['printers', 'roles', 'users'].includes(k))) invalid();
  if (Object.keys(value.printers).length > 200 || Object.keys(value.roles).length > 100 || Object.keys(value.users).length > 2000) invalid();
  const name = v => typeof v === 'string' && v.length > 0 && v.length <= 256 && !/[\x00-\x1f]/.test(v);
  for (const [key, p] of Object.entries(value.printers)) {
    if (!name(key) || !p || typeof p.enabled !== 'boolean' || !['A4', '80mm', '58mm'].includes(p.paper) || Object.keys(p).some(k => !['enabled', 'paper'].includes(k))) invalid();
  }
  for (const [kind, rules] of [['roles', value.roles], ['users', value.users]]) {
    for (const [id, r] of Object.entries(rules)) {
      if (!(kind === 'roles' ? roles : users.map(String)).includes(id) || !r || Object.keys(r).some(k => !['enabled', 'printers', 'documents', 'default_printer', 'max_copies', 'color', 'duplex'].includes(k))) invalid();
      if ([r.enabled, r.color, r.duplex].some(v => typeof v !== 'boolean') || !Number.isInteger(r.max_copies) || r.max_copies < 1 || r.max_copies > 100 || !Array.isArray(r.documents) || r.documents.some(t => !PRINT_TYPES.includes(t)) || new Set(r.documents).size !== r.documents.length) invalid();
      if (r.printers !== null && (!Array.isArray(r.printers) || r.printers.length > 200 || r.printers.some(p => !name(p)) || new Set(r.printers).size !== r.printers.length)) invalid();
      if (typeof r.default_printer !== 'string' || (r.default_printer && (!name(r.default_printer) || (r.printers !== null && !r.printers.includes(r.default_printer))))) invalid();
    }
  }
  return JSON.parse(JSON.stringify(value));
}
