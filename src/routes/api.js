const R=require('express').Router(),db=require('../db'),c=require('../config'),b=require('bcryptjs'),A=require('../middleware/auth'),u=require('../util'),wrap=u.wrap,crypto=require('node:crypto');
const audit=async(id,action,target=null)=>db.query('INSERT INTO audit_logs(actor_id,action,target_id) VALUES($1,$2,$3)',[id||null,action,target]);
async function session(id,res){let t=u.token(),expires=new Date(Date.now()+c.days*864e5);await db.query('INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,$3)',[id,u.hash(t),expires]);let r=await db.query('SELECT * FROM users WHERE id=$1',[id]);res.json({token:t,expiresAt:expires,user:u.user(r.rows[0])})}
R.post('/auth/register',wrap(async(q,s)=>{let n=u.str(q.body.username,24),p=q.body.password||'',email=u.str(q.body.email,254).toLowerCase()||null;if(!/^[A-Za-z0-9_]{3,24}$/.test(n)||p.length<10||p.length>200)return s.status(400).json({error:'INVALID_USERNAME_OR_PASSWORD'});let h=await b.hash(p,c.rounds),r=await db.query('INSERT INTO users(username,email,password_hash,display_name) VALUES($1,$2,$3,$4) RETURNING id',[n,email,h,u.str(q.body.displayName,40,n)]);await session(r.rows[0].id,s)}));
R.post('/auth/login',wrap(async(q,s)=>{let r=await db.query('SELECT * FROM users WHERE lower(username)=lower($1) OR lower(email)=lower($1) LIMIT 1',[u.str(q.body.identity,254)]);if(!r.rowCount||!await b.compare(q.body.password||'',r.rows[0].password_hash))return s.status(401).json({error:'INVALID_CREDENTIALS'});await session(r.rows[0].id,s)}));
R.post('/auth/logout',A.auth,wrap(async(q,s)=>{await db.query('DELETE FROM sessions WHERE token_hash=$1',[u.hash((q.get('authorization')||'').slice(7))]);s.json({ok:true})}));
R.get('/auth/me',A.auth,(q,s)=>s.json({user:u.user(q.user)}));
R.get('/profiles/:username',wrap(async(q,s)=>{let r=await db.query('SELECT * FROM users WHERE lower(username)=lower($1)',[q.params.username]);if(!r.rowCount)return s.status(404).json({error:'USER_NOT_FOUND'});s.json({profile:u.user(r.rows[0])})}));
R.patch('/profiles/me',A.auth,wrap(async(q,s)=>{let r=await db.query('UPDATE users SET display_name=$1,bio=$2,avatar_url=$3,updated_at=NOW() WHERE id=$4 RETURNING *',[u.str(q.body.displayName,40,q.user.display_name),u.str(q.body.bio,500,q.user.bio),q.body.avatarUrl===null?null:u.str(q.body.avatarUrl,1000,q.user.avatar_url),q.user.id]);s.json({profile:u.user(r.rows[0])})}));
function resource(table,owner,titleField,dataField){R.post('/'+table,A.auth,wrap(async(q,s)=>{let title=u.str(q.body[titleField],100);if(!title)return s.status(400).json({error:'TITLE_REQUIRED'});let r=await db.query(`INSERT INTO ${table}(owner_id,${titleField},description,${dataField},visibility) VALUES($1,$2,$3,$4,$5) RETURNING *`,[q.user.id,title,u.str(q.body.description,2000),JSON.stringify(q.body[dataField]||{}),['public','unlisted'].includes(q.body.visibility)?q.body.visibility:'private']);s.status(201).json({[table.slice(0,-1)]:r.rows[0]})}));R.get('/'+table,A.auth,wrap(async(q,s)=>{let r=await db.query(`SELECT * FROM ${table} WHERE owner_id=$1 ORDER BY updated_at DESC LIMIT 100`,[q.user.id]);s.json({[table]:r.rows})}));R.get('/'+table+'/:id',wrap(async(q,s)=>{if(!u.uuid(q.params.id))return s.status(400).json({error:'INVALID_ID'});let r=await db.query(`SELECT * FROM ${table} WHERE id=$1 AND (visibility='public' OR owner_id=$2)`,[q.params.id,q.user?.id||null]);if(!r.rowCount)return s.status(404).json({error:'NOT_FOUND'});s.json({[table.slice(0,-1)]:r.rows[0]})}));R.patch('/'+table+'/:id',A.auth,wrap(async(q,s)=>{if(!u.uuid(q.params.id))return s.status(400).json({error:'INVALID_ID'});let r=await db.query(`UPDATE ${table} SET ${titleField}=COALESCE($1,${titleField}),description=COALESCE($2,description),${dataField}=COALESCE($3,${dataField}),updated_at=NOW() WHERE id=$4 AND owner_id=$5 RETURNING *`,[q.body[titleField]===undefined?null:u.str(q.body[titleField],100),q.body.description===undefined?null:u.str(q.body.description,2000),q.body[dataField]===undefined?null:JSON.stringify(q.body[dataField]),q.params.id,q.user.id]);if(!r.rowCount)return s.status(404).json({error:'NOT_FOUND'});s.json({[table.slice(0,-1)]:r.rows[0]})}));R.delete('/'+table+'/:id',A.auth,wrap(async(q,s)=>{if(!u.uuid(q.params.id))return s.status(400).json({error:'INVALID_ID'});let r=await db.query(`DELETE FROM ${table} WHERE id=$1 AND owner_id=$2`,[q.params.id,q.user.id]);if(!r.rowCount)return s.status(404).json({error:'NOT_FOUND'});s.json({ok:true})}))}
resource('documents','owner_id','title','content');resource('worlds','owner_id','name','settings');
R.post('/levels',A.auth,wrap(async(q,s)=>{let t=u.str(q.body.title,100);if(!t)return s.status(400).json({error:'TITLE_REQUIRED'});let r=await db.query('INSERT INTO levels(owner_id,title,description,data,visibility) VALUES($1,$2,$3,$4,$5) RETURNING *',[q.user.id,t,u.str(q.body.description,2000),JSON.stringify(q.body.data||{}),q.body.visibility==='public'?'public':'private']);s.status(201).json({level:r.rows[0]})}));
R.get('/levels',wrap(async(q,s)=>{let r=q.query.mine==='true'&&q.user?await db.query('SELECT * FROM levels WHERE owner_id=$1',[q.user.id]):await db.query("SELECT id,title,description,plays,created_at FROM levels WHERE published=true AND visibility='public' ORDER BY updated_at DESC LIMIT 100");s.json({levels:r.rows})}));
R.get('/levels/:id',wrap(async(q,s)=>{if(!u.uuid(q.params.id))return s.status(400).json({error:'INVALID_ID'});let r=await db.query("SELECT * FROM levels WHERE id=$1 AND ((published=true AND visibility='public') OR owner_id=$2)",[q.params.id,q.user?.id||null]);if(!r.rowCount)return s.status(404).json({error:'LEVEL_NOT_FOUND'});s.json({level:r.rows[0]})}));
R.patch('/levels/:id',A.auth,wrap(async(q,s)=>{if(!u.uuid(q.params.id))return s.status(400).json({error:'INVALID_ID'});let r=await db.query('UPDATE levels SET title=COALESCE($1,title),description=COALESCE($2,description),data=COALESCE($3,data),updated_at=NOW() WHERE id=$4 AND owner_id=$5 RETURNING *',[q.body.title===undefined?null:u.str(q.body.title,100),q.body.description===undefined?null:u.str(q.body.description,2000),q.body.data===undefined?null:JSON.stringify(q.body.data),q.params.id,q.user.id]);if(!r.rowCount)return s.status(404).json({error:'LEVEL_NOT_FOUND'});s.json({level:r.rows[0]})}));
R.post('/levels/:id/publish',A.auth,wrap(async(q,s)=>{if(!u.uuid(q.params.id))return s.status(400).json({error:'INVALID_ID'});let r=await db.query("UPDATE levels SET published=true,visibility='public',updated_at=NOW() WHERE id=$1 AND owner_id=$2 RETURNING *",[q.params.id,q.user.id]);if(!r.rowCount)return s.status(404).json({error:'LEVEL_NOT_FOUND'});s.json({level:r.rows[0]})}));
R.post('/levels/:id/play',wrap(async(q,s)=>{if(!u.uuid(q.params.id))return s.status(400).json({error:'INVALID_ID'});let r=await db.query("UPDATE levels SET plays=plays+1 WHERE id=$1 AND published=true AND visibility='public' RETURNING id,plays",[q.params.id]);if(!r.rowCount)return s.status(404).json({error:'LEVEL_NOT_FOUND'});s.json({level:r.rows[0]})}));
R.delete('/levels/:id',A.auth,wrap(async(q,s)=>{if(!u.uuid(q.params.id))return s.status(400).json({error:'INVALID_ID'});let r=await db.query('DELETE FROM levels WHERE id=$1 AND owner_id=$2',[q.params.id,q.user.id]);if(!r.rowCount)return s.status(404).json({error:'LEVEL_NOT_FOUND'});s.json({ok:true})}));
R.post('/assets',A.auth,wrap(async(q,s)=>{let url=u.str(q.body.url,2000);if(!u.str(q.body.name,120)||!url.startsWith('https://'))return s.status(400).json({error:'HTTPS_URL_AND_NAME_REQUIRED'});let r=await db.query('INSERT INTO assets(owner_id,name,mime_type,url,size_bytes) VALUES($1,$2,$3,$4,$5) RETURNING *',[q.user.id,u.str(q.body.name,120),u.str(q.body.mimeType,100),url,Math.max(0,+q.body.sizeBytes||0)]);s.status(201).json({asset:r.rows[0]})}));
R.get('/assets',A.auth,wrap(async(q,s)=>{let r=await db.query('SELECT * FROM assets WHERE owner_id=$1',[q.user.id]);s.json({assets:r.rows})}));
R.get('/ranks',A.auth,wrap(async(q,s)=>{let r=await db.query('SELECT code,source,expires_at FROM entitlements WHERE user_id=$1 AND (expires_at IS NULL OR expires_at>NOW())',[q.user.id]);s.json({rank:q.user.rank,entitlements:r.rows})}));
R.get('/users/me/credits',A.auth,wrap(async(q,s)=>{let r=await db.query('SELECT COALESCE(SUM(amount),0)::bigint balance FROM credit_ledger WHERE user_id=$1',[q.user.id]);s.json(r.rows[0])}));
R.post('/admin/bootstrap',wrap(async(q,s)=>{if(!c.bootstrap||q.get('x-admin-bootstrap-key')!==c.bootstrap)return s.status(403).json({error:'BOOTSTRAP_DENIED'});let n=await db.query("SELECT count(*)::int n FROM users WHERE role='admin'");if(n.rows[0].n)return s.status(409).json({error:'ADMIN_ALREADY_EXISTS'});let r=await db.query("UPDATE users SET role='admin' WHERE lower(username)=lower($1) OR lower(email)=lower($1) RETURNING id,username",[u.str(q.body.identity,254)]);if(!r.rowCount)return s.status(404).json({error:'USER_NOT_FOUND'});await audit(r.rows[0].id,'admin.bootstrap',r.rows[0].id);s.json({admin:r.rows[0]})}));
R.get('/admin/users',A.auth,A.admin,wrap(async(q,s)=>{let r=await db.query('SELECT id,username,email,role,rank,created_at FROM users ORDER BY created_at DESC LIMIT 200');s.json({users:r.rows})}));
R.patch('/admin/users/:id/rank',A.auth,A.admin,wrap(async(q,s)=>{if(!u.uuid(q.params.id))return s.status(400).json({error:'INVALID_ID'});let rank=u.str(q.body.rank,24).toUpperCase();if(!['FREE','PRO','PREMIUM','EXTRA'].includes(rank))return s.status(400).json({error:'INVALID_RANK'});let r=await db.query('UPDATE users SET rank=$1 WHERE id=$2 RETURNING id,username,rank',[rank,q.params.id]);if(!r.rowCount)return s.status(404).json({error:'USER_NOT_FOUND'});await audit(q.user.id,'admin.rank',q.params.id);s.json({user:r.rows[0]})}));
R.get('/admin/audit',A.auth,A.admin,wrap(async(q,s)=>{let r=await db.query('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 200');s.json({logs:r.rows})}));
R.post('/payments/rotur/verify',A.auth,wrap(async(q,s)=>{if(!c.roturUrl||!c.roturSecret)return s.status(503).json({error:'ROTUR_NOT_CONFIGURED'});let ref=u.str(q.body.reference,160),proof=u.str(q.body.proof,4000);if(!ref||!proof)return s.status(400).json({error:'REFERENCE_AND_PROOF_REQUIRED'});let r=await fetch(c.roturUrl,{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+c.roturSecret},body:JSON.stringify({reference:ref,proof,universeUserId:q.user.id})});if(!r.ok)return s.status(502).json({error:'ROTUR_PROVIDER_ERROR'});let v=await r.json();if(v.valid!==true||v.userId!==q.user.id||!Number.isSafeInteger(v.credits)||v.credits<1)return s.status(403).json({error:'ROTUR_VERIFICATION_FAILED'});await db.query("INSERT INTO credit_ledger(user_id,amount,reason,provider,provider_reference) VALUES($1,$2,'Rotur verified purchase','rotur',$3)",[q.user.id,v.credits,ref]);s.json({ok:true,creditsAdded:v.credits})}));
R.get('/udba/status',(q,s)=>s.json({enabled:c.udba,format:'Universe-UDBA-v1'}));

const BACKUP_TABLES = [
  'users', 'sessions', 'documents', 'levels', 'worlds',
  'assets', 'entitlements', 'credit_ledger', 'audit_logs'
];
R.get('/admin/backup', A.auth, A.admin, wrap(async (q, s) => {
  const data = {};
  for (const table of BACKUP_TABLES) {
    const result = await db.query('SELECT * FROM ' + table + ' ORDER BY 1');
    data[table] = result.rows;
  }
  await audit(q.user.id, 'admin.backup.export');
  s.set('Cache-Control', 'no-store');
  s.set('Content-Disposition', 'attachment; filename="universe-backup.json"');
  s.json({
    format: 'Universe-Backup',
    version: 1,
    createdAt: new Date().toISOString(),
    data
  });
}));
R.post('/admin/backup', A.auth, A.admin, wrap(async (q, s) => {
  const backup = q.body;
  if (!backup || backup.format !== 'Universe-Backup' || backup.version !== 1 ||
      backup.confirm !== 'RESTORE_UNIVERSE_BACKUP' || !backup.data ||
      typeof backup.data !== 'object' || Array.isArray(backup.data)) {
    return s.status(400).json({ error: 'INVALID_BACKUP_OR_CONFIRMATION' });
  }
  for (const table of BACKUP_TABLES) {
    if (!Array.isArray(backup.data[table])) {
      return s.status(400).json({ error: 'INVALID_BACKUP_TABLE', table });
    }
    if (backup.data[table].length > 250000) {
      return s.status(413).json({ error: 'BACKUP_TABLE_TOO_LARGE', table });
    }
  }
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE ' + BACKUP_TABLES.join(', ') + ' RESTART IDENTITY CASCADE');
    for (const table of BACKUP_TABLES) {
      const rows = backup.data[table];
      if (rows.length) {
        await client.query(
          'INSERT INTO ' + table + ' SELECT * FROM jsonb_populate_recordset(NULL::' + table + ', $1::jsonb)',
          [JSON.stringify(rows)]
        );
      }
    }
    await client.query('COMMIT');
    await db.query("INSERT INTO audit_logs(actor_id,action) SELECT CASE WHEN EXISTS (SELECT 1 FROM users WHERE id=$1) THEN $1 ELSE NULL END, 'admin.backup.restore'", [q.user.id]);
    await db.query("SELECT setval(pg_get_serial_sequence('audit_logs','id'), COALESCE((SELECT MAX(id) FROM audit_logs), 1), EXISTS (SELECT 1 FROM audit_logs))");
    s.json({ ok: true, restored: Object.fromEntries(BACKUP_TABLES.map(t => [t, backup.data[t].length])) });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

module.exports=R;
