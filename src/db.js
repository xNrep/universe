const {Pool}=require('pg'),c=require('./config');const db=new Pool({connectionString:c.db,ssl:c.ssl?{rejectUnauthorized:false}:undefined,max:10});db.on('error',e=>console.error(e));module.exports=db;
