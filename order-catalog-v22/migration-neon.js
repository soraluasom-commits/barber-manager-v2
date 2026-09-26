import pg from 'pg';

const { Pool } = pg;
const SOURCE_URL = process.env.DATABASE_URL || '';
const TARGET_URL = process.env.NEON_DATABASE_URL || '';
const RUN_MIGRATION = process.env.MIGRATE_TO_NEON === '1';

const ssl = { rejectUnauthorized: false };

function safeHost(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

async function stats(pool) {
  const q = async (sql) => (await pool.query(sql)).rows[0];
  const products = await q('select count(*)::int as n from products');
  const settings = await q('select count(*)::int as n from settings');
  const orders = await q('select count(*)::int as n from orders');
  const images = await q('select count(*)::int as n, coalesce(sum(octet_length(data)),0)::bigint as bytes from product_images');
  const db = await q('select pg_database_size(current_database())::bigint as bytes');
  return {
    products: Number(products.n || 0),
    settings: Number(settings.n || 0),
    orders: Number(orders.n || 0),
    images: Number(images.n || 0),
    imageBytes: Number(images.bytes || 0),
    databaseBytes: Number(db.bytes || 0)
  };
}

async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products(
      id text primary key,
      data jsonb not null,
      updated_at timestamptz default now()
    );
    CREATE TABLE IF NOT EXISTS orders(
      id text primary key,
      data jsonb not null,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    CREATE TABLE IF NOT EXISTS settings(
      key text primary key,
      data jsonb not null,
      updated_at timestamptz default now()
    );
    CREATE TABLE IF NOT EXISTS product_images(
      id text primary key,
      mime text not null,
      data bytea not null,
      updated_at timestamptz default now()
    );
  `);
}

async function copySmallTables(source, target) {
  const products = await source.query('select id,data,updated_at from products order by id');
  for (const r of products.rows) {
    await target.query(
      'insert into products(id,data,updated_at) values($1,$2,$3) on conflict(id) do update set data=excluded.data,updated_at=excluded.updated_at',
      [r.id, r.data, r.updated_at]
    );
  }

  const settings = await source.query('select key,data,updated_at from settings order by key');
  for (const r of settings.rows) {
    await target.query(
      'insert into settings(key,data,updated_at) values($1,$2,$3) on conflict(key) do update set data=excluded.data,updated_at=excluded.updated_at',
      [r.key, r.data, r.updated_at]
    );
  }

  const orders = await source.query('select id,data,created_at,updated_at from orders order by id');
  for (const r of orders.rows) {
    await target.query(
      'insert into orders(id,data,created_at,updated_at) values($1,$2,$3,$4) on conflict(id) do update set data=excluded.data,created_at=excluded.created_at,updated_at=excluded.updated_at',
      [r.id, r.data, r.created_at, r.updated_at]
    );
  }
}

async function copyImages(source, target) {
  let lastId = '';
  let copied = 0;
  while (true) {
    const page = await source.query(
      'select id,mime,data,updated_at from product_images where id > $1 order by id limit 20',
      [lastId]
    );
    if (!page.rowCount) break;
    for (const r of page.rows) {
      await target.query(
        'insert into product_images(id,mime,data,updated_at) values($1,$2,$3,$4) on conflict(id) do update set mime=excluded.mime,data=excluded.data,updated_at=excluded.updated_at',
        [r.id, r.mime, r.data, r.updated_at]
      );
      lastId = r.id;
      copied++;
    }
    console.log(`[neon-migration] images copied ${copied}`);
  }
}

async function main() {
  if (!SOURCE_URL) {
    console.log('[neon-migration] DATABASE_URL not configured; skipped');
    return;
  }

  const source = new Pool({ connectionString: SOURCE_URL, ssl });
  try {
    const sourceStats = await stats(source);
    console.log('[neon-migration] source', JSON.stringify({
      host: safeHost(SOURCE_URL),
      ...sourceStats,
      imageMB: +(sourceStats.imageBytes / 1024 / 1024).toFixed(2),
      databaseMB: +(sourceStats.databaseBytes / 1024 / 1024).toFixed(2)
    }));

    if (!RUN_MIGRATION) {
      console.log('[neon-migration] dry-run only; set MIGRATE_TO_NEON=1 after NEON_DATABASE_URL is configured');
      return;
    }
    if (!TARGET_URL) throw new Error('NEON_DATABASE_URL is missing');
    if (SOURCE_URL === TARGET_URL) {
      console.log('[neon-migration] source and target are identical; nothing to copy');
      return;
    }

    // Guard the free Neon database capacity. We only proceed automatically when comfortably below 0.5 GB.
    if (sourceStats.databaseBytes > 420 * 1024 * 1024) {
      throw new Error(`Source database is ${(sourceStats.databaseBytes/1024/1024).toFixed(1)} MB, too close to the free Neon database limit. Move images to object storage first.`);
    }

    const target = new Pool({ connectionString: TARGET_URL, ssl });
    try {
      await ensureSchema(target);
      await copySmallTables(source, target);
      await copyImages(source, target);
      const targetStats = await stats(target);
      const ok =
        sourceStats.products === targetStats.products &&
        sourceStats.settings === targetStats.settings &&
        sourceStats.orders === targetStats.orders &&
        sourceStats.images === targetStats.images &&
        sourceStats.imageBytes === targetStats.imageBytes;

      console.log('[neon-migration] target', JSON.stringify({
        host: safeHost(TARGET_URL),
        ...targetStats,
        imageMB: +(targetStats.imageBytes / 1024 / 1024).toFixed(2),
        databaseMB: +(targetStats.databaseBytes / 1024 / 1024).toFixed(2)
      }));
      if (!ok) throw new Error('Verification failed: source/target counts or image bytes differ');
      console.log('[neon-migration] NEON_MIGRATION_OK');
    } finally {
      await target.end().catch(()=>{});
    }
  } catch (e) {
    // Never take the live shop offline just because a migration attempt failed.
    console.error('[neon-migration] ERROR', e.message);
  } finally {
    await source.end().catch(()=>{});
  }
}

await main();
