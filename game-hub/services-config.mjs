export const services = [
  {id:'kosynka', title:'Косынка', port:8123, folder:'kosynka', static:true},
  {id:'durak', title:'Дурак', port:3000, folder:'Durak', entry:'server.js'},
  {id:'vice', title:'Vice Drive', port:4173, folder:'GTA', entry:'server.mjs'},
  {id:'munchkin', title:'Манчкин', port:4387, folder:'Manchkin', entry:'server.mjs'},
  {id:'poker', title:'Velvet Poker', port:5173, folder:'Poker/velvet-poker/dist', static:true},
  {id:'tanks', title:'Танки vs динозавры', port:8000, folder:'Tanks/tanki/dist', static:true},
  {id:'evolution', title:'Эволюция', port:3001, folder:'evolution', entry:'server.mjs', health:'/api/health'},
  {id:'hub', title:'Игровая — хаб', port:8080, folder:'game-hub', entry:'server.mjs'}
];
