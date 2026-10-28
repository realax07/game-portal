import {writeFile,mkdir} from 'node:fs/promises';
const listing=await fetch('https://api.github.com/repos/game-icons/icons/git/trees/master?recursive=1');
if(!listing.ok)throw Error('Cannot fetch icon listing: '+listing.status);
const tree=(await listing.json()).tree;
const names=['wolf-head','fox','dna1','turtle','feather','fishbone','saber-toothed-cat-head','butterfly','fern','snail','brain','elephant','fish-scales','poison-bottle','meat','bird-twitter','frog','squid','sea-turtle','chameleon-glyph','mushroom','wheat','plant-roots','sprout','crab','gecko','eagle-head','deer-head','snake','paw-print','eye-target','bat-wing','heart-organ','polar-bear','hummingbird','rabbit','squirrel','seahorse'];
await mkdir('public/assets',{recursive:true});
const credits=[];
await Promise.all(names.map(async name=>{
 const path=tree.find(x=>x.path.endsWith('/'+name+'.svg'))?.path;if(!path)throw Error(name);
 const res=await fetch('https://raw.githubusercontent.com/game-icons/icons/master/'+path);if(!res.ok)throw Error(path+' '+res.status);
 let svg=await res.text(); svg=svg.replace(/<path[^>]*d="M0 0h512v512H0z"[^>]*\/>/g,'').replace(/fill="#000"/g,'fill="none"');
 await writeFile('public/assets/'+name+'.svg',svg);credits.push({name,author:path.split('/')[0],url:'https://game-icons.net/1x1/'+path.replace('.svg','.html'),license:'CC BY 3.0'});
}));
await writeFile('public/assets/credits.json',JSON.stringify(credits,null,2));
console.log('Downloaded '+credits.length+' icons');
