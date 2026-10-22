"""Read public publisher card lists. Does not import card text or artwork."""
import urllib.request, urllib.parse, re, html, json, concurrent.futures
from pathlib import Path
BASE='https://munchkin.game'
def clean(s): return html.unescape(re.sub('<[^>]+>','',s)).strip()
def get(path):
    req=urllib.request.Request(BASE+path,headers={'User-Agent':'MunchkinLocalFanCatalog/1.0'})
    return urllib.request.urlopen(req,timeout=25).read().decode()
seed=get('/products/games/munchkin/munchkin-4-the-need-for-steed/')
links={p:clean(n) for p,n in re.findall(r'<a[^>]+href=[\'\"](/products/games/munchkin/[^\'\"]+)[\'\"][^>]*>(.*?)</a>',seed,re.S)}
# Related products include standalone games and accessories; only published card lists become playable sets.
exclude=r'(deluxe|guest-artist|big-box|lite|sketch-edition|blender|hidden-treasures|game-changers|unicorns-and-friends|rigged-demo|spell-skool|grimm|conan/$|teenage-mutant|panic|quacked|gloom|loot-letter|smash-up|crazy-cooks|babies|digital|mazes|triple-play|bookmark|promo-prox|more-good-cards|6-double-dungeons)'
links={p:n for p,n in links.items() if not re.search(exclude,p) and p.rstrip('/').split('/')[-1] not in ['munchkin-2-unnatural-axe','munchkin-3-clerical-errors']}
def parse(entry):
    path,name=entry
    try:
        page=get(path)
        match=re.search(r'<input[^>]+id=[\'\"]cards[\'\"]',page)
        if not match:return {'path':path,'name':name,'skip':'no public card list'}
        body=page[match.end():]; body=re.split(r'<input\b',body)[0]
        groups=[]
        for title,items in re.findall(r'<h3[^>]*>(.*?)</h3>\s*<ul[^>]*>(.*?)</ul>',body,re.S):
            names=[clean(n) for n in re.findall(r'<li[^>]*>(.*?)</li>',items,re.S)]
            if names: groups.append({'section':clean(title),'names':list(dict.fromkeys(names))})
        title=re.search(r'<h1[^>]*>(.*?)</h1>',page,re.S)
        return {'id':path.rstrip('/').split('/')[-1],'name':clean(title.group(1)) if title else name,'source':BASE+path,'groups':groups}
    except Exception as e:return {'path':path,'name':name,'skip':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool: results=list(pool.map(parse,links.items()))
Path('public/data/publisher-catalog.json').write_text(json.dumps({'source':BASE+'/products/games/munchkin/','retrieved':'2026-10-22','sets':[r for r in results if r.get('groups')],'notImported':[r for r in results if not r.get('groups')]},ensure_ascii=False,indent=2))
for r in results: print(r.get('id',r.get('name')),[(g['section'],len(g['names'])) for g in r.get('groups',[])],r.get('skip',''))
