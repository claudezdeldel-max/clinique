// Preserve patient IDs and related records while relaxing legacy admission constraints.
export function migratePatientSchema(db) {
  const columns = db.prepare('PRAGMA table_info(patients)').all();
  const indexes = db.prepare('PRAGMA index_list(patients)').all();
  const socialIndexes = indexes.filter(index => index.unique && !index.partial && db.prepare(`PRAGMA index_info("${index.name.replaceAll('"', '""')}")`).all().map(column => column.name).join() === 'social_sec_no');
  const optional = new Set(['email', 'age', 'gender', 'social_sec_no']);
  if (columns.some(column => optional.has(column.name) && column.notnull) || socialIndexes.some(index => index.origin === 'u')) {
    const originalSql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'patients'").get().sql;
    const sql = originalSql.replace(/^CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["`\[]?patients["`\]]?/i, 'CREATE TABLE patients_optional_fields')
      .replace(/\b(email|age|gender|social_sec_no)\s+(TEXT|INTEGER)([^,)]*)/gi, (match, name, type, constraints) => `${name} ${type}${constraints.replace(/\bNOT NULL\b/gi, '').replace(name.toLowerCase() === 'social_sec_no' ? /\bUNIQUE\b/gi : /$^/, '')}`);
    const extras = db.prepare("SELECT type, name, sql FROM sqlite_master WHERE tbl_name = 'patients' AND type IN ('index', 'trigger') AND sql IS NOT NULL").all()
      .filter(item => !socialIndexes.some(index => index.name === item.name));
    const foreignKeys = db.pragma('foreign_keys', { simple: true });
    const sequence = db.prepare("SELECT name FROM sqlite_master WHERE name = 'sqlite_sequence'").get()
      ? db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'patients'").get()?.seq : undefined;
    const previousViolations = new Set(db.pragma('foreign_key_check').map(row => JSON.stringify(row)));
    db.pragma('foreign_keys = OFF');
    try {
      db.transaction(() => {
        db.exec(sql);
        if (db.prepare('PRAGMA table_info(patients_optional_fields)').all().some(column => optional.has(column.name) && column.notnull)) throw new Error('La migration des champs facultatifs a échoué.');
        const names = columns.map(column => `"${column.name.replaceAll('"', '""')}"`).join(', ');
        db.exec(`INSERT INTO patients_optional_fields (${names}) SELECT ${names} FROM patients;
          DROP TABLE patients;
          ALTER TABLE patients_optional_fields RENAME TO patients;`);
        if (sequence !== undefined) db.prepare("UPDATE sqlite_sequence SET seq = MAX(seq, ?) WHERE name = 'patients'").run(sequence);
        for (const item of extras) db.exec(item.sql);
        if (db.pragma('foreign_key_check').some(row => !previousViolations.has(JSON.stringify(row)))) throw new Error('La migration ne peut pas conserver les liens des dossiers.');
      })();
    } finally { db.pragma(`foreign_keys = ${foreignKeys ? 'ON' : 'OFF'}`); }
  } else {
    for (const index of socialIndexes) db.exec(`DROP INDEX "${index.name.replaceAll('"', '""')}"`);
  }
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS patients_social_sec_no_nonempty
    ON patients(social_sec_no) WHERE social_sec_no IS NOT NULL AND trim(social_sec_no) <> '';`);
}
