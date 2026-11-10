(function(Scratch){'use strict';if(!Scratch.extensions.unsandboxed)throw new Error('Universe requires unsandboxed mode');let base='https://YOUR-UNIVERSE-SERVICE.onrender.com',token='',response='',error='',lastId='';
const headers=()=>({ 'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}) });
async function call(method,path,body){error='';try{let r=await fetch(base.replace(/\/+$/,'')+path,{method,headers:headers(),body:body===undefined?undefined:JSON.stringify(body)}),t=await r.text(),d={};try{d=t?JSON.parse(t):{}}catch{d={raw:t}}response=JSON.stringify(d);if(!r.ok)throw Error(d.error||'HTTP_'+r.status);lastId=d.id||d.user?.id||d.level?.id||d.document?.id||'';return d}catch(e){error=e.message;response=JSON.stringify({error});throw e}}
const parse=s=>{try{return JSON.parse(String(s||'{}'))}catch{error='INVALID_JSON';return {}}};
class Universe{getInfo(){return{id:'universe',name:'Universe',color1:'#7555D9',blocks:[
{opcode:'server',blockType:Scratch.BlockType.COMMAND,text:'set server URL [URL]',arguments:{URL:{type:Scratch.ArgumentType.STRING,defaultValue:'https://YOUR-UNIVERSE-SERVICE.onrender.com'}}},
{opcode:'register',blockType:Scratch.BlockType.COMMAND,text:'register [USERNAME] password [PASSWORD]',arguments:{USERNAME:{type:Scratch.ArgumentType.STRING},PASSWORD:{type:Scratch.ArgumentType.STRING}}},
{opcode:'login',blockType:Scratch.BlockType.COMMAND,text:'login [IDENTITY] password [PASSWORD]',arguments:{IDENTITY:{type:Scratch.ArgumentType.STRING},PASSWORD:{type:Scratch.ArgumentType.STRING}}},
{opcode:'logout',blockType:Scratch.BlockType.COMMAND,text:'log out'},
{opcode:'me',blockType:Scratch.BlockType.COMMAND,text:'get my profile'},
{opcode:'profile',blockType:Scratch.BlockType.COMMAND,text:'get profile [USERNAME]',arguments:{USERNAME:{type:Scratch.ArgumentType.STRING}}},
{opcode:'update',blockType:Scratch.BlockType.COMMAND,text:'update profile name [NAME] bio [BIO]',arguments:{NAME:{type:Scratch.ArgumentType.STRING},BIO:{type:Scratch.ArgumentType.STRING}}},
{opcode:'doc',blockType:Scratch.BlockType.COMMAND,text:'create document [TITLE] JSON [DATA]',arguments:{TITLE:{type:Scratch.ArgumentType.STRING},DATA:{type:Scratch.ArgumentType.STRING,defaultValue:'{}'}}},
{opcode:'docs',blockType:Scratch.BlockType.COMMAND,text:'list my documents'},
{opcode:'level',blockType:Scratch.BlockType.COMMAND,text:'create level [TITLE] JSON [DATA]',arguments:{TITLE:{type:Scratch.ArgumentType.STRING},DATA:{type:Scratch.ArgumentType.STRING,defaultValue:'{}'}}},
{opcode:'levels',blockType:Scratch.BlockType.COMMAND,text:'list levels'},
{opcode:'publish',blockType:Scratch.BlockType.COMMAND,text:'publish level [ID]',arguments:{ID:{type:Scratch.ArgumentType.STRING}}},
{opcode:'world',blockType:Scratch.BlockType.COMMAND,text:'create world [NAME] settings JSON [DATA]',arguments:{NAME:{type:Scratch.ArgumentType.STRING},DATA:{type:Scratch.ArgumentType.STRING,defaultValue:'{}'}}},
{opcode:'ranks',blockType:Scratch.BlockType.COMMAND,text:'get ranks'},
{opcode:'credits',blockType:Scratch.BlockType.COMMAND,text:'get credits'},
{opcode:'api',blockType:Scratch.BlockType.COMMAND,text:'API [METHOD] path [PATH] JSON [BODY]',arguments:{METHOD:{type:Scratch.ArgumentType.STRING,defaultValue:'GET'},PATH:{type:Scratch.ArgumentType.STRING,defaultValue:'/auth/me'},BODY:{type:Scratch.ArgumentType.STRING,defaultValue:'{}'}}},
{opcode:'resp',blockType:Scratch.BlockType.REPORTER,text:'last response'},
{opcode:'err',blockType:Scratch.BlockType.REPORTER,text:'last error'},
{opcode:'id',blockType:Scratch.BlockType.REPORTER,text:'last ID'},
{opcode:'logged',blockType:Scratch.BlockType.BOOLEAN,text:'session token set?'}
]}}server(a){base=String(a.URL)}async register(a){let d=await call('POST','/api/v1/auth/register',{username:String(a.USERNAME),password:String(a.PASSWORD)});token=d.token||''}async login(a){let d=await call('POST','/api/v1/auth/login',{identity:String(a.IDENTITY),password:String(a.PASSWORD)});token=d.token||''}async logout(){await call('POST','/api/v1/auth/logout',{});token=''}async me(){await call('GET','/api/v1/auth/me')}async profile(a){await call('GET','/api/v1/profiles/'+encodeURIComponent(a.USERNAME))}async update(a){await call('PATCH','/api/v1/profiles/me',{displayName:a.NAME,bio:a.BIO})}async doc(a){await call('POST','/api/v1/documents',{title:a.TITLE,content:parse(a.DATA)})}async docs(){await call('GET','/api/v1/documents')}async level(a){await call('POST','/api/v1/levels',{title:a.TITLE,data:parse(a.DATA)})}async levels(){await call('GET','/api/v1/levels')}async publish(a){await call('POST','/api/v1/levels/'+encodeURIComponent(a.ID)+'/publish',{})}async world(a){await call('POST','/api/v1/worlds',{name:a.NAME,settings:parse(a.DATA)})}async ranks(){await call('GET','/api/v1/ranks')}async credits(){await call('GET','/api/v1/users/me/credits')}async api(a){let m=String(a.METHOD).toUpperCase(),p=String(a.PATH);if(!['GET','POST','PATCH','DELETE'].includes(m)||!p.startsWith('/')){error='INVALID_METHOD_OR_PATH';return}await call(m,'/api/v1'+p,['GET','DELETE'].includes(m)?undefined:parse(a.BODY))}resp(){return response}err(){return error}id(){return lastId}logged(){return !!token}}
Scratch.extensions.register(new Universe())})(Scratch);
