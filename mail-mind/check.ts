import postgres from 'postgres';

async function cleanCorsairAccounts() {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    // Delete all existing corsair accounts so the user can re-authorize through proper OAuth
    const deleted = await sql`DELETE FROM corsair_accounts RETURNING id, tenant_id, integration_id`;
    console.log("Deleted corsair_accounts:", deleted.length);
    console.log(deleted);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await sql.end();
  }
}

cleanCorsairAccounts();
