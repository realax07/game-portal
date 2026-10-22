"""Fetch selected CC BY 3.0 Game-icons assets; no original Munchkin scans."""
import json,urllib.request,concurrent.futures,xml.etree.ElementTree as ET
from pathlib import Path
root=Path(__file__).resolve().parent.parent
api='https://api.github.com/repos/game-icons/icons/git/trees/master?recursive=1'
tree=json.load(urllib.request.urlopen(api,timeout=30));commit=tree['sha']
paths=[x['path'] for x in tree['tree'] if x['path'].endswith('.svg')]
by={Path(p).stem:p for p in paths}
selection=dict(row.split('=',1) for row in (root/'scripts/card-art-map.txt').read_text().splitlines() if row.strip())
import subprocess
cards=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {CARDS} from './public/engine.js';console.log(JSON.stringify(CARDS));"],cwd=root))
missing=[c['en'] for c in cards if c['en'] not in selection or selection[c['en']] not in by]
if missing:raise ValueError(missing)
out=root/'public/assets/cards';out.mkdir(parents=True,exist_ok=True)
chosen={by[selection[c['en']]] for c in cards}
def fetch(path):
 dest=out/(path.replace('/','--'))
 if not dest.exists():
  url=f'https://raw.githubusercontent.com/game-icons/icons/{commit}/{path}'
  data=urllib.request.urlopen(url,timeout=30).read()
  svg=ET.fromstring(data)
  for node in svg.iter():
   if node.tag.split('}')[-1] in ['script','foreignObject','image','use']:raise ValueError('Non-static SVG '+path)
   if any(k.lower().startswith('on') or k.endswith('href') for k in node.attrib):raise ValueError('Non-static SVG '+path)
  dest.write_bytes(data)
 return path
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(fetch,sorted(chosen)))
manifest={c['id']:{'file':'assets/cards/'+by[selection[c['en']]].replace('/','--'),'icon':selection[c['en']],'author':by[selection[c['en']]].split('/')[0],'source':'https://game-icons.net/1x1/'+by[selection[c['en']]].replace('.svg','.html'),'repository':'https://github.com/game-icons/icons/blob/'+commit+'/'+by[selection[c['en']]],'license':'CC BY 3.0'} for c in cards}
(root/'public/data/card-art.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
(root/'public/card-art-data.js').write_text('export const CARD_ART = '+json.dumps(manifest,ensure_ascii=False)+';\n')
authors=sorted({v['author'] for v in manifest.values()})
credit_names={'lorc':'Lorc','delapouite':'Delapouite','caro-asercion':'Caro Asercion','darkzaitzev':'DarkZaitzev','faithtoken':'Faithtoken','heavenly-dog':'HeavenlyDog','kier-heyl':'Kier Heyl','lucasms':'Lucas','skoll':'Skoll','cathelineau':'Cathelineau','quoting':'Quoting','willdabeast':'Willdabeast','zeromancer':'Zeromancer'}
(root/'public/assets/cards/ATTRIBUTION.md').write_text('# Card illustrations\n\nIcons made by '+', '.join(credit_names.get(a,a) for a in authors)+'. Available on https://game-icons.net.\n\nLicense: Creative Commons Attribution 3.0 (https://creativecommons.org/licenses/by/3.0/).\n\nOriginal SVG files are unmodified. The game displays them with CSS masks, colored backgrounds and decorative framing. Per-card attribution and source links: /data/card-art.json.\n\nRepository snapshot: '+commit+'\n')
print(json.dumps({'cards':len(cards),'uniqueImages':len(chosen),'authors':authors,'commit':commit}))
