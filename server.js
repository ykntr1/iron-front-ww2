const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'dev-only-change-this-secret';
const db = new Database(process.env.DB_PATH || 'iron-front.sqlite');
db.exec('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT, xp INTEGER DEFAULT 0, kills INTEGER DEFAULT 0)');
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/health', (_,res)=>res.json({ok:true,game:'Iron Front'}));
app.post('/api/register', (req,res)=>{
 const username=String(req.body.username||'').trim().slice(0,20), password=String(req.body.password||'');
 if(!/^[a-zA-Z0-9_]{3,20}$/.test(username)||password.length<6) return res.status(400).json({error:'Username 3-20 characters; password at least 6.'});
 try { const info=db.prepare('INSERT INTO users(username,password) VALUES(?,?)').run(username,bcrypt.hashSync(password,10)); const token=jwt.sign({id:info.lastInsertRowid,username},SECRET); res.json({token,username,xp:0,kills:0}); }
 catch(e){res.status(409).json({error:'Username already exists.'});}
});
app.post('/api/login',(req,res)=>{
 const username=String(req.body.username||'').trim(), password=String(req.body.password||'');
 const user=db.prepare('SELECT * FROM users WHERE username=?').get(username);
 if(!user||!bcrypt.compareSync(password,user.password)) return res.status(401).json({error:'Invalid username or password.'});
 res.json({token:jwt.sign({id:user.id,username},SECRET),username,xp:user.xp,kills:user.kills});
});
const players=new Map();
const bots=Array.from({length:7},(_,i)=>({id:'bot'+i,x:(Math.random()-.5)*35,z:-8-Math.random()*35,hp:100}));
io.on('connection',socket=>{
 socket.emit('world:init',{bots,players:[...players.values()]});
 socket.on('player:join',data=>{
  let user=null;
  try{if(data&&data.token) user=jwt.verify(data.token,SECRET);}catch{}
  const p={id:socket.id,username:user?.username||('Soldier-'+socket.id.slice(0,4)),x:0,y:1.7,z:4,yaw:0,xp:0,kills:0,hp:100};
  if(user){const row=db.prepare('SELECT xp,kills FROM users WHERE id=?').get(user.id); if(row){p.xp=row.xp;p.kills=row.kills;}}
  players.set(socket.id,p); socket.data.user=user; socket.emit('player:me',p); io.emit('players:update',[...players.values()]);
 });
 socket.on('player:move',d=>{const p=players.get(socket.id);if(!p||!d)return;p.x=Math.max(-60,Math.min(60,Number(d.x)||0));p.z=Math.max(-60,Math.min(60,Number(d.z)||0));p.yaw=Number(d.yaw)||0;});
 socket.on('player:shoot',id=>{
  const p=players.get(socket.id),b=bots.find(x=>x.id===id&&x.hp>0);if(!p||!b)return;
  b.hp=Math.max(0,b.hp-50);
  if(b.hp===0){p.kills++;p.xp+=100;if(socket.data.user)db.prepare('UPDATE users SET xp=?,kills=? WHERE id=?').run(p.xp,p.kills,socket.data.user.id);}
  io.emit('world:update',{bots,players:[...players.values()]});
 });
 socket.on('disconnect',()=>{players.delete(socket.id);io.emit('players:update',[...players.values()]);});
});
setInterval(()=>{for(const b of bots){if(b.hp<=0)continue;b.x+=Math.sin(Date.now()/1600+Number(b.id.slice(3)))*.025;}io.emit('world:update',{bots,players:[...players.values()]});},1500);
server.listen(PORT,'0.0.0.0',()=>console.log('Iron Front listening on '+PORT));
